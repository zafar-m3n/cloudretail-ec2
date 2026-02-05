const pool = require("../db");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const sesFromEmail = process.env.CLOUDRETAIL_ORDER_CONFIRMATION_FROM;

/* -------------------------------------------------------------------------- */
/*                                EMAIL HELPER                                */
/* -------------------------------------------------------------------------- */
async function sendOrderConfirmationEmail({ toEmail, customerName, orderId, items, totalAmount }) {
  if (!sesFromEmail || !toEmail) return;

  const body = [
    `Hi ${customerName},`,
    ``,
    `Thank you for your order #${orderId}.`,
    ``,
    `Items:`,
    ...items.map((i) => `- ${i.productName} x ${i.quantity} = ${i.lineTotal}`),
    ``,
    `Total Amount: ${totalAmount}`,
    ``,
    `CloudRetail Team`,
  ].join("\n");

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: sesFromEmail,
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: { Data: `Order Confirmation #${orderId}` },
          Body: { Text: { Data: body } },
        },
      }),
    );
  } catch (err) {
    console.error("[SES] Email send failed:", err.message);
  }
}

/* -------------------------------------------------------------------------- */
/*                               CREATE ORDER                                 */
/* -------------------------------------------------------------------------- */
async function createOrder(req, res) {
  let connection;
  try {
    connection = await pool.getConnection();

    const userId = req.user.id;
    const { shippingAddressId, items } = req.body;

    if (!items?.length) {
      return res.status(400).json({ message: "Items required" });
    }

    await connection.beginTransaction();

    // Calculate totals
    let totalAmount = 0;
    const normalizedItems = items.map((i) => {
      const lineTotal = i.quantity * i.unitPrice;
      totalAmount += lineTotal;
      return {
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal,
      };
    });

    // Reduce inventory
    for (const item of normalizedItems) {
      const [[inv]] = await connection.query(
        `SELECT id, quantity_available FROM inventory WHERE product_id = ? FOR UPDATE`,
        [item.productId],
      );

      if (!inv || inv.quantity_available < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }

      await connection.query(`UPDATE inventory SET quantity_available = quantity_available - ? WHERE id = ?`, [
        item.quantity,
        inv.id,
      ]);
    }

    // Create order
    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (user_id, status, total_amount, shipping_address_id)
      VALUES (?, 'CONFIRMED', ?, ?)
      `,
      [userId, totalAmount, shippingAddressId],
    );

    const orderId = orderResult.insertId;

    // Insert items
    for (const item of normalizedItems) {
      await connection.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?)
        `,
        [orderId, item.productId, item.quantity, item.unitPrice, item.lineTotal],
      );
    }

    // Insert payment
    const providerReference = `SIM-${Date.now()}-${orderId}`;
    await connection.query(
      `
      INSERT INTO payments (order_id, amount, status, payment_method, provider_reference)
      VALUES (?, ?, 'COMPLETED', 'SIMULATED', ?)
      `,
      [orderId, totalAmount, providerReference],
    );

    await connection.commit();
    connection.release();

    // Fetch enriched order for response + email
    const orderData = await fetchOrderById(orderId, userId);

    sendOrderConfirmationEmail({
      toEmail: orderData.customer.email,
      customerName: orderData.customer.name,
      orderId,
      items: orderData.items,
      totalAmount: orderData.order.totalAmount,
    });

    return res.status(201).json(orderData);
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

/* -------------------------------------------------------------------------- */
/*                                GET ORDER                                   */
/* -------------------------------------------------------------------------- */
async function getOrderById(req, res) {
  try {
    const data = await fetchOrderById(req.params.id, req.user.id, req.user.role);
    return res.json(data);
  } catch (err) {
    return res.status(403).json({ message: err.message });
  }
}

/* -------------------------------------------------------------------------- */
/*                         SHARED FETCH / ENRICH LOGIC                         */
/* -------------------------------------------------------------------------- */
async function fetchOrderById(orderId, userId, role = "CUSTOMER") {
  const [[order]] = await pool.query(
    `
    SELECT o.*, u.full_name, u.email,
           a.line1, a.line2, a.city, a.state, a.postal_code, a.country
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN addresses a ON a.id = o.shipping_address_id
    WHERE o.id = ?
    `,
    [orderId],
  );

  if (!order) throw new Error("Order not found");
  if (role !== "ADMIN" && order.user_id !== userId) throw new Error("Unauthorized");

  const [items] = await pool.query(
    `
    SELECT oi.*, p.name AS productName
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
    `,
    [orderId],
  );

  const [[payment]] = await pool.query(
    `
    SELECT * FROM payments
    WHERE order_id = ?
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orderId],
  );

  return {
    order: {
      id: order.id,
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
    },
    customer: {
      name: order.full_name,
      email: order.email,
    },
    shippingAddress: order.shipping_address_id
      ? {
          line1: order.line1,
          line2: order.line2,
          city: order.city,
          state: order.state,
          postalCode: order.postal_code,
          country: order.country,
        }
      : null,
    payment: payment
      ? {
          amount: payment.amount,
          status: payment.status,
          method: payment.payment_method,
          reference: payment.provider_reference,
        }
      : null,
    items: items.map((i) => ({
      productId: i.product_id,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
    })),
  };
}

module.exports = {
  createOrder,
  getOrderById,
};
