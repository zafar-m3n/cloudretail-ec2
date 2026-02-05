const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Health check (for ECS/ALB later)
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "user-service" });
});

// Auth-related routes (register, login, profile)
app.use("/", authRoutes);
// If you want a prefix later, e.g. app.use("/api/users", authRoutes);

// Start server
const port = process.env.CLOUDRETAIL_USER_SERVICE_PORT ? Number(process.env.CLOUDRETAIL_USER_SERVICE_PORT) : 4001;

app.listen(port, () => {
  console.log(`User service listening on port ${port}`);
});
