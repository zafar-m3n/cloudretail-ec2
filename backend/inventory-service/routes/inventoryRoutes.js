const express = require("express");
const { checkInventory, reserveStock, releaseStock } = require("../controllers/inventoryController");
const { authMiddleware, adminMiddleware } = require("../authMiddleware");

const router = express.Router();

// Public: check inventory (for future: frontend or other services)
router.get("/check", checkInventory);

// Admin / internal: reserve and release stock
router.post("/reserve", authMiddleware, adminMiddleware, reserveStock);
router.post("/release", authMiddleware, adminMiddleware, releaseStock);

module.exports = router;
