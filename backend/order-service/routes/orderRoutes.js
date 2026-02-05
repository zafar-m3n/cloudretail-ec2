const express = require("express");
const { createOrder, getOrderById } = require("../controllers/orderController");
const authMiddleware = require("../authMiddleware");

const router = express.Router();

// Create order
router.post("/", authMiddleware, createOrder);

// Get order by id
router.get("/:id", authMiddleware, getOrderById);

module.exports = router;
