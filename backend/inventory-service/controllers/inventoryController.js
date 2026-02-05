const pool = require("../db");

/**
 * GET /api/v1/inventory/check
 * Query params:
 *  - productId (optional, number)
 *
 * If productId is provided, returns that product's inventory.
 * Otherwise, returns all inventory rows.
 */
async function checkInventory(req, res) {
  try {
    const { productId } = req.query;

    let sql = `
      SELECT
        i.id,
        i.product_id AS productId,
        i.quantity_available AS quantityAvailable,
        i.quantity_reserved AS quantityReserved,
        i.updated_at AS updatedAt
      FROM inventory i
    `;
    const params = [];

    if (productId) {
      sql += " WHERE i.product_id = ?";
      params.push(productId);
    }

    sql += " ORDER BY i.product_id ASC";

    const [rows] = await pool.query(sql, params);

    return res.json({
      inventory: rows,
    });
  } catch (err) {
    console.error("Error in checkInventory:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/v1/inventory/reserve
 * Body:
 * {
 *   "orderId": 123,            // optional but useful for logs
 *   "items": [
 *     { "productId": 1, "quantity": 2 },
 *     { "productId": 2, "quantity": 1 }
 *   ]
 * }
 *
 * Reserves stock by moving from quantity_available -> quantity_reserved.
 * All-or-nothing: if any item cannot be reserved, no changes are applied.
 */
async function reserveStock(req, res) {
  const connection = await pool.getConnection();
  try {
    const { orderId, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      connection.release();
      return res.status(400).json({ message: "items array is required and cannot be empty" });
    }

    // Basic validation on each item
    for (const item of items) {
      if (!item.productId || item.quantity === undefined || item.quantity === null) {
        connection.release();
        return res.status(400).json({
          message: "Each item must have productId and quantity",
        });
      }
      if (Number(item.quantity) <= 0) {
        connection.release();
        return res.status(400).json({
          message: "Item quantity must be greater than 0",
        });
      }
    }

    await connection.beginTransaction();

    const failedItems = [];
    const updatedItems = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      // Lock row FOR UPDATE to prevent race conditions
      const [rows] = await connection.query(
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

      if (rows.length === 0) {
        failedItems.push({
          productId,
          reason: "NOT_FOUND",
        });
        continue;
      }

      const row = rows[0];

      if (row.quantity_available < quantity) {
        failedItems.push({
          productId,
          reason: "INSUFFICIENT_STOCK",
          requestedQuantity: quantity,
          availableQuantity: row.quantity_available,
        });
        continue;
      }

      const newAvailable = row.quantity_available - quantity;
      const newReserved = row.quantity_reserved + quantity;

      await connection.query(
        `
        UPDATE inventory
        SET quantity_available = ?, quantity_reserved = ?
        WHERE id = ?
        `,
        [newAvailable, newReserved, row.id],
      );

      updatedItems.push({
        productId,
        quantityReserved: quantity,
        quantityAvailable: newAvailable,
        quantityReservedTotal: newReserved,
      });
    }

    if (failedItems.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        message: "Failed to reserve stock for one or more items",
        orderId: orderId || null,
        failedItems,
      });
    }

    await connection.commit();
    connection.release();

    return res.status(200).json({
      message: "Stock reserved successfully",
      orderId: orderId || null,
      items: updatedItems,
    });
  } catch (err) {
    console.error("Error in reserveStock:", err);
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("Error during rollback in reserveStock:", rollbackErr);
    }
    connection.release();
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/v1/inventory/release
 * Body:
 * {
 *   "orderId": 123,            // optional
 *   "items": [
 *     { "productId": 1, "quantity": 2 },
 *     { "productId": 2, "quantity": 1 }
 *   ]
 * }
 *
 * Releases stock by moving from quantity_reserved -> quantity_available.
 */
async function releaseStock(req, res) {
  const connection = await pool.getConnection();
  try {
    const { orderId, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      connection.release();
      return res.status(400).json({ message: "items array is required and cannot be empty" });
    }

    for (const item of items) {
      if (!item.productId || item.quantity === undefined || item.quantity === null) {
        connection.release();
        return res.status(400).json({
          message: "Each item must have productId and quantity",
        });
      }
      if (Number(item.quantity) <= 0) {
        connection.release();
        return res.status(400).json({
          message: "Item quantity must be greater than 0",
        });
      }
    }

    await connection.beginTransaction();

    const updatedItems = [];
    const missingItems = [];

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      const [rows] = await connection.query(
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

      if (rows.length === 0) {
        missingItems.push({ productId, reason: "NOT_FOUND" });
        continue;
      }

      const row = rows[0];

      // Only release as much as is actually reserved
      const releaseAmount = Math.min(quantity, row.quantity_reserved);

      const newReserved = row.quantity_reserved - releaseAmount;
      const newAvailable = row.quantity_available + releaseAmount;

      await connection.query(
        `
        UPDATE inventory
        SET quantity_available = ?, quantity_reserved = ?
        WHERE id = ?
        `,
        [newAvailable, newReserved, row.id],
      );

      updatedItems.push({
        productId,
        quantityReleased: releaseAmount,
        quantityAvailable: newAvailable,
        quantityReservedTotal: newReserved,
      });
    }

    await connection.commit();
    connection.release();

    return res.status(200).json({
      message: "Stock released successfully",
      orderId: orderId || null,
      items: updatedItems,
      missingItems,
    });
  } catch (err) {
    console.error("Error in releaseStock:", err);
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("Error during rollback in releaseStock:", rollbackErr);
    }
    connection.release();
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  checkInventory,
  reserveStock,
  releaseStock,
};
