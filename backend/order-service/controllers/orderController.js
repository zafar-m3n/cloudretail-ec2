// controllers/orderController.js
const pool = require("../db");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sesRegion = process.env.AWS_REGION || "us-east-1";
const sesFromEmail = process.env.CLOUDRETAIL_ORDER_CONFIRMATION_FROM;

const sesClient = new SESClient({ region: sesRegion });

async function sendOrderConfirmationEmail({ toEmail, customerName, orderId, items, totalAmount }) {
  if (!sesFromEmail) {
    console.warn("[EMAIL] CLOUDRETAIL_ORDER_CONFIRMATION_FROM not set; skipping confirmation email.");
    return;
  }

  if (!toEmail) {
    console.warn("[EMAIL] No recipient email provided; skipping confirmation email.");
    return;
  }

  const subject = `Your CloudRetail Order #${orderId}`;

  const lines = [];
  lines.push(`Hi ${customerName || "Customer"},`);
  lines.push("");
  lines.push(`Thank you for your order #${orderId}. Here are your order details:`);
  lines.push("");
  lines.push("Items:");
  for (const item of items) {
    const name = item.productName || `Product ${item.productId}`;
    lines.push(`- ${name} x ${item.quantity} @ ${item.unitPrice} = ${item.lineTotal}`);
  }
  lines.push("");
  lines.push(`Total amount: ${totalAmount}`);
  lines.push("");
  lines.push("Thank you for shopping with CloudRetail.");
  lines.push("");
  lines.push("Best regards,");
  lines.push("CloudRetail Team");

  const bodyText = lines.join("\n");

  const params = {
    Source: sesFromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Text: {
          Data: bodyText,
          Charset: "UTF-8",
        },
      },
    },
  };

  try {
    const result = await sesClient.send(new SendEmailCommand(params));
    console.log("[EMAIL] Order confirmation sent:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Failed to send order confirmation email:", err);
  }
}

/**
 * POST /api/v1/orders
 *
 * Body:
 * {
 *   "shippingAddressId": 7,
 *   "items": [
 *     { "productId": 10, "quantity": 2, "unitPrice": 49.99 },
 *     { "productId": 11, "quantity": 1, "unitPrice": 49.99 }
 *   ]
 * }
 *
 * Does everything in one go:
 * - Validates items
 * - Checks and reduces stock in `inventory`
 * - Creates order + order_items
 * - Creates a payment row (simulated success)
 * - Sets order.status = 'CONFIRMED'
 * - Sends confirmation email via SES
 * - Returns enriched response with customerName, productName, totals, and payment info
 */
async function createOrder(req, res) {
  let connection;
  try {
    connection = await pool.getConnection();

    const userId = req.user.id;
    const userEmail = req.user.email;
    const { shippingAddressId, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      if (connection) connection.release();
      return res.status(400).json({ message: "items array is required and cannot be empty" });
    }

    // Basic validation
    for (const item of items) {
      if (
        !item.productId ||
        item.quantity === undefined ||
        item.quantity === null ||
        item.unitPrice === undefined ||
        item.unitPrice === null
      ) {
        if (connection) connection.release();
        return res.status(400).json({
          message: "Each item must have productId, quantity, and unitPrice",
        });
      }
      if (Number(item.quantity) <= 0 || Number(item.unitPrice) < 0) {
        if (connection) connection.release();
        return res.status(400).json({
          message: "Item quantity must be > 0 and unitPrice must be >= 0",
        });
      }
    }

    await connection.beginTransaction();

    // Compute totals
    let totalAmount = 0;
    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const lineTotal = quantity * unitPrice;
      totalAmount += lineTotal;
      return {
        productId: Number(item.productId),
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    // STEP 1: Check and reduce stock in inventory
    for (const item of normalizedItems) {
      const productId = item.productId;
      const quantity = item.quantity;

      // Lock inventory row FOR UPDATE
      const [invRows] = await connection.query(
        `
        SELECT
          id,
          product_id,
          quantity_available,
          quantity_reserved
        FROM inventory
        WHERE product_id = ?
        FOR UPDATE
        `,
        [productId],
      );

      if (invRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          message: `Inventory not found for productId ${productId}`,
        });
      }

      const inv = invRows[0];

      if (inv.quantity_available < quantity) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          message: `Insufficient stock for productId ${productId}. Requested ${quantity}, available ${inv.quantity_available}`,
        });
      }

      const newAvailable = inv.quantity_available - quantity;

      await connection.query(
        `
        UPDATE inventory
        SET quantity_available = ?
        WHERE id = ?
        `,
        [newAvailable, inv.id],
      );
    }

    // STEP 2: Insert into orders (initially PENDING, will be CONFIRMED after "payment")
    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (user_id, status, total_amount, shipping_address_id)
      VALUES (?, 'PENDING', ?, ?)
      `,
      [userId, totalAmount, shippingAddressId || null],
    );

    const orderId = orderResult.insertId;

    // STEP 3: Insert into order_items
    for (const item of normalizedItems) {
      await connection.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?)
        `,
        [orderId, item.productId, item.quantity, item.unitPrice, item.lineTotal],
      );
    }

    // STEP 4: Simulate payment - treat as success
    const paymentStatus = "COMPLETED";
    const paymentMethod = "SIMULATED";
    const providerReference = `SIM-${Date.now()}-${orderId}`;

    const [paymentResult] = await connection.query(
      `
      INSERT INTO payments (order_id, amount, status, payment_method, provider_reference)
      VALUES (?, ?, ?, ?, ?)
      `,
      [orderId, totalAmount, paymentStatus, paymentMethod, providerReference],
    );

    const paymentId = paymentResult.insertId;

    // STEP 5: Update order status to CONFIRMED (since payment succeeded)
    await connection.query(
      `
      UPDATE orders
      SET status = 'CONFIRMED'
      WHERE id = ?
      `,
      [orderId],
    );

    await connection.commit();
    connection.release();
    connection = null;

    // ENRICHMENT: fetch customerName and productName for response & email
    const [userRows] = await pool.query(
      `
      SELECT full_name, email
      FROM users
      WHERE id = ?
      `,
      [userId],
    );

    const customerName = userRows && userRows.length > 0 ? userRows[0].full_name : userEmail;

    const productIds = [...new Set(normalizedItems.map((i) => i.productId))];
    let productNameById = {};
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const [productRows] = await pool.query(
        `
        SELECT id, name
        FROM products
        WHERE id IN (${placeholders})
        `,
        productIds,
      );
      productRows.forEach((p) => {
        productNameById[p.id] = p.name;
      });
    }

    const enrichedItems = normalizedItems.map((i) => ({
      productId: i.productId,
      productName: productNameById[i.productId] || null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    }));

    // Fire-and-forget: send confirmation email
    sendOrderConfirmationEmail({
      toEmail: userRows && userRows.length > 0 ? userRows[0].email : userEmail,
      customerName,
      orderId,
      items: enrichedItems,
      totalAmount,
    }).catch((err) => {
      console.error("Error in sendOrderConfirmationEmail:", err);
    });

    // HTTP response back to frontend
    return res.status(201).json({
      message: "Order created and paid successfully",
      order: {
        id: orderId,
        userId,
        customerName,
        status: "CONFIRMED",
        totalAmount,
        shippingAddressId: shippingAddressId || null,
        paymentStatus,
        paymentId,
      },
      items: enrichedItems,
    });
  } catch (err) {
    console.error("Error in createOrder:", err);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Error during rollback in createOrder:", rollbackErr);
      }
      connection.release();
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/v1/orders/:id
 *
 * Returns enriched order summary + items.
 * Only the owner or an ADMIN can see it.
 *
 * Response:
 * {
 *   order: {
 *     id, userId, customerName, status, totalAmount,
 *     shippingAddressId, createdAt, updatedAt,
 *     paymentStatus, paymentAmount, paymentMethod
 *   },
 *   items: [
 *     { id, orderId, productId, productName, quantity, unitPrice, lineTotal }
 *   ]
 * }
 */
async function getOrderById(req, res) {
  let connection;
  try {
    connection = await pool.getConnection();
    const orderId = req.params.id;
    const requester = req.user;

    const [orderRows] = await connection.query(
      `
      SELECT
        o.id,
        o.user_id AS userId,
        o.status,
        o.total_amount AS totalAmount,
        o.shipping_address_id AS shippingAddressId,
        o.created_at AS createdAt,
        o.updated_at AS updatedAt,
        u.full_name AS customerName
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
      `,
      [orderId],
    );

    if (orderRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderRows[0];

    // Authorization: owner or admin
    if (requester.role !== "ADMIN" && requester.id !== order.userId) {
      connection.release();
      return res.status(403).json({ message: "Not allowed to view this order" });
    }

    const [itemRows] = await connection.query(
      `
      SELECT
        oi.id,
        oi.order_id AS orderId,
        oi.product_id AS productId,
        oi.quantity,
        oi.unit_price AS unitPrice,
        oi.line_total AS lineTotal,
        p.name AS productName
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      `,
      [orderId],
    );

    // Get latest payment info (if any)
    const [paymentRows] = await connection.query(
      `
      SELECT
        id,
        amount,
        status,
        payment_method AS paymentMethod,
        provider_reference AS providerReference,
        error_message AS errorMessage,
        created_at AS createdAt
      FROM payments
      WHERE order_id = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orderId],
    );

    connection.release();

    let paymentInfo = null;
    if (paymentRows.length > 0) {
      const p = paymentRows[0];
      paymentInfo = {
        id: p.id,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        providerReference: p.providerReference,
        errorMessage: p.errorMessage,
        createdAt: p.createdAt,
      };
    }

    return res.json({
      order: {
        ...order,
        paymentStatus: paymentInfo ? paymentInfo.status : null,
        paymentAmount: paymentInfo ? paymentInfo.amount : null,
        paymentMethod: paymentInfo ? paymentInfo.paymentMethod : null,
      },
      items: itemRows.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    });
  } catch (err) {
    console.error("Error in getOrderById:", err);
    if (connection) {
      connection.release();
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  createOrder,
  getOrderById,
};
