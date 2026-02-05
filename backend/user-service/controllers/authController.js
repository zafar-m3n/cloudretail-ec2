const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
require("dotenv").config();

// Utility: generate JWT
function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const options = {
    expiresIn: process.env.CLOUDRETAIL_USER_SERVICE_JWT_EXPIRES_IN,
  };

  return jwt.sign(payload, process.env.CLOUDRETAIL_USER_SERVICE_JWT_SECRET, options);
}

// POST /register
async function registerUser(req, res) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "fullName, email, and password are required",
      });
    }

    // Check if email already exists
    const [existingRows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);

    if (existingRows.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'CUSTOMER')",
      [email, passwordHash, fullName],
    );

    const newUserId = result.insertId;

    const [createdRows] = await pool.query(
      "SELECT id, email, full_name AS fullName, role, created_at AS createdAt FROM users WHERE id = ?",
      [newUserId],
    );

    const user = createdRows[0];

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user,
      token,
    });
  } catch (err) {
    console.error("Error in registerUser:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// POST /login
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const [rows] = await pool.query(
      "SELECT id, email, password_hash, full_name AS fullName, role, created_at AS createdAt FROM users WHERE email = ?",
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const userRow = rows[0];

    const passwordMatch = await bcrypt.compare(password, userRow.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken({
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
    });

    // Remove password_hash before returning
    delete userRow.password_hash;

    return res.json({
      message: "Login successful",
      user: userRow,
      token,
    });
  } catch (err) {
    console.error("Error in loginUser:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// GET /profile
async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      "SELECT id, email, full_name AS fullName, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ?",
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    return res.json({ user });
  } catch (err) {
    console.error("Error in getProfile:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  registerUser,
  loginUser,
  getProfile,
};
