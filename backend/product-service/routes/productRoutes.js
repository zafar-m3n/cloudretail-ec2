const express = require("express");
const { getAllProducts, getProductById, createProduct, updateProduct } = require("../controllers/productController");
const { authMiddleware, adminMiddleware } = require("../authMiddleware");

const router = express.Router();

// Public endpoints
router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);

// Admin endpoints (require valid JWT and ADMIN role)
router.post("/admin/products", authMiddleware, adminMiddleware, createProduct);
router.put("/admin/products/:id", authMiddleware, adminMiddleware, updateProduct);

module.exports = router;
