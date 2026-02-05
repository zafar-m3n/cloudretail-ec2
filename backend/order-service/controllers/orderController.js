const pool = require("../db");
const { publishOrderCreated } = require("../eventPublisher");

/**
 * POST /api/v1/orders
 * Body:
 * {
 *   "shippingAddressId": 7,
 *   "items": [
 *     { "productId": 10, "quantity": 2, "unitPrice": 49.99 },
 *     { "productId": 11, "quantity": 1, "unitPrice": 49.99 }
 *   ]
 * }
 */
async function createOrder(req, res) {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { shippingAddressId, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      connection.release();
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
        connection.release();
        return res.status(400).json({
          message: "Each item must have productId, quantity, and unitPrice",
        });
      }
      if (Number(item.quantity) <= 0 || Number(item.unitPrice) < 0) {
        connection.release();
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

    // Insert into orders
    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (user_id, status, total_amount, shipping_address_id)
      VALUES (?, 'PENDING', ?, ?)
      `,
      [userId, totalAmount, shippingAddressId || null],
    );

    const orderId = orderResult.insertId;

    // Insert into order_items
    for (const item of normalizedItems) {
      await connection.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?)
        `,
        [orderId, item.productId, item.quantity, item.unitPrice, item.lineTotal],
      );
    }

    await connection.commit();
    connection.release();

    // Publish local stub event (OrderCreated)
    const orderEventPayload = {
      orderId,
      userId,
      status: "PENDING",
      totalAmount,
      items: normalizedItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
      shippingAddressId: shippingAddressId || null,
    };

    publishOrderCreated(orderEventPayload);

    return res.status(201).json({
      message: "Order created successfully",
      order: {
        id: orderId,
        userId,
        status: "PENDING",
        totalAmount,
        shippingAddressId: shippingAddressId || null,
      },
      items: normalizedItems,
    });
  } catch (err) {
    console.error("Error in createOrder:", err);
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("Error during rollback in createOrder:", rollbackErr);
    }
    connection.release();
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/v1/orders/:id
 * Returns order summary + items.
 * Only the owner or an ADMIN can see it.
 */
async function getOrderById(req, res) {
  const connection = await pool.getConnection();
  try {
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
        o.updated_at AS updatedAt
      FROM orders o
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
        oi.line_total AS lineTotal
      FROM order_items oi
      WHERE oi.order_id = ?
      `,
      [orderId],
    );

    connection.release();

    return res.json({
      order,
      items: itemRows,
    });
  } catch (err) {
    console.error("Error in getOrderById:", err);
    connection.release();
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  createOrder,
  getOrderById,
};
