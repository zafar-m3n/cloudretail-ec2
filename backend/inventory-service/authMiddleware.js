// authMiddleware.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Invalid authorization header format" });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.CLOUDRETAIL_INVENTORY_SERVICE_JWT_SECRET);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch (err) {
    console.error("JWT verification error (inventory-service):", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

module.exports = {
  authMiddleware,
  adminMiddleware,
};
