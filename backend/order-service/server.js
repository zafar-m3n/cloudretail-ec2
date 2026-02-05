const express = require("express");
const cors = require("cors");
require("dotenv").config();

const orderRoutes = require("./routes/orderRoutes");

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "order-service" });
});

// Versioned API routes
app.use("/api/v1/orders", orderRoutes);

const port = process.env.CLOUDRETAIL_ORDER_SERVICE_PORT;

app.listen(port, () => {
  console.log(`Order service listening on port ${port}`);
});
