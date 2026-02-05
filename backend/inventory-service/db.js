const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.CLOUDRETAIL_INVENTORY_SERVICE_DB_HOST,
  port: process.env.CLOUDRETAIL_INVENTORY_SERVICE_DB_PORT,
  user: process.env.CLOUDRETAIL_INVENTORY_SERVICE_DB_USER,
  password: process.env.CLOUDRETAIL_INVENTORY_SERVICE_DB_PASSWORD,
  database: process.env.CLOUDRETAIL_INVENTORY_SERVICE_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
