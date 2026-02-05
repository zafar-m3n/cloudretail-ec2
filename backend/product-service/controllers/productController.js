const pool = require("../db");

/**
 * GET /products
 * Optional query params:
 *  - categoryId (number)
 */
async function getAllProducts(req, res) {
  try {
    const { categoryId } = req.query;

    let sql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url AS imageUrl,
        p.category_id AS categoryId,
        p.is_active AS isActive,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        c.name AS categoryName
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;

    const params = [];

    if (categoryId) {
      sql += " AND p.category_id = ?";
      params.push(categoryId);
    }

    sql += " ORDER BY p.created_at DESC";

    const [rows] = await pool.query(sql, params);

    return res.json({ products: rows });
  } catch (err) {
    console.error("Error in getAllProducts:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /products/:id
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url AS imageUrl,
        p.category_id AS categoryId,
        p.is_active AS isActive,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        c.name AS categoryName
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = rows[0];

    return res.json({ product });
  } catch (err) {
    console.error("Error in getProductById:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /admin/products
 * Body: { name, price, description?, imageUrl?, categoryId?, isActive? }
 * Admin only
 */
async function createProduct(req, res) {
  try {
    const { name, price, description, imageUrl, categoryId, isActive } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ message: "name and price are required" });
    }

    const activeValue = typeof isActive === "boolean" || typeof isActive === "number" ? (Number(isActive) ? 1 : 0) : 1; // default active

    const [result] = await pool.query(
      `
      INSERT INTO products
        (name, description, price, image_url, category_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [name, description || null, price, imageUrl || null, categoryId || null, activeValue],
    );

    const newProductId = result.insertId;

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url AS imageUrl,
        p.category_id AS categoryId,
        p.is_active AS isActive,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        c.name AS categoryName
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
      `,
      [newProductId],
    );

    const product = rows[0];

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    console.error("Error in createProduct:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * PUT /admin/products/:id
 * Body: { name?, price?, description?, imageUrl?, categoryId?, isActive? }
 * Admin only
 * We allow partial update.
 */
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, price, description, imageUrl, categoryId, isActive } = req.body;

    // Fetch existing product
    const [existingRows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);

    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const existing = existingRows[0];

    const updatedName = name ?? existing.name;
    const updatedPrice = price ?? existing.price;
    const updatedDescription = description ?? existing.description;
    const updatedImageUrl = imageUrl ?? existing.image_url;
    const updatedCategoryId = categoryId !== undefined ? categoryId : existing.category_id;

    let updatedIsActive = existing.is_active;
    if (isActive !== undefined) {
      updatedIsActive = Number(isActive) ? 1 : 0;
    }

    await pool.query(
      `
      UPDATE products
      SET name = ?, description = ?, price = ?, image_url = ?, category_id = ?, is_active = ?
      WHERE id = ?
      `,
      [updatedName, updatedDescription, updatedPrice, updatedImageUrl, updatedCategoryId, updatedIsActive, id],
    );

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url AS imageUrl,
        p.category_id AS categoryId,
        p.is_active AS isActive,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        c.name AS categoryName
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
      `,
      [id],
    );

    const product = rows[0];

    return res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("Error in updateProduct:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
};
