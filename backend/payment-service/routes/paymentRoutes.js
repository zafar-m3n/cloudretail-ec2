const express = require("express");
const { initiatePayment } = require("../controllers/paymentController");
const authMiddleware = require("../authMiddleware");

const router = express.Router();

// Initiate payment for an order
router.post("/", authMiddleware, initiatePayment);

module.exports = router;
