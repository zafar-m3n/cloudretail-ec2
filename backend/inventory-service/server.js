const express = require("express");
const cors = require("cors");
require("dotenv").config();

const inventoryRoutes = require("./routes/inventoryRoutes");

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "inventory-service" });
});

// Versioned API routes
app.use("/api/v1/inventory", inventoryRoutes);

const port = process.env.CLOUDRETAIL_INVENTORY_SERVICE_PORT;

app.listen(port, () => {
  console.log(`Inventory service listening on port ${port}`);
});
