const express = require("express");
const cors = require("cors");
require("dotenv").config();

const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "payment-service" });
});

// Versioned API routes
app.use("/api/v1/payments", paymentRoutes);

const port = process.env.CLOUDRETAIL_PAYMENT_SERVICE_PORT;

app.listen(port, () => {
  console.log(`Payment service listening on port ${port}`);
});
