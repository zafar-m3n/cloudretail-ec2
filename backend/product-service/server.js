// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const productRoutes = require("./routes/productRoutes");

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "product-service" });
});

// Versioned API routes
app.use("/api/v1/products", productRoutes);

const port = process.env.CLOUDRETAIL_PRODUCT_SERVICE_PORT;

app.listen(port, () => {
  console.log(`Product service listening on port ${port}`);
});
