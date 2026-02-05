const express = require("express");
const { registerUser, loginUser, getProfile } = require("../controllers/authController");
const authMiddleware = require("../authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected route
router.get("/profile", authMiddleware, getProfile);

module.exports = router;
