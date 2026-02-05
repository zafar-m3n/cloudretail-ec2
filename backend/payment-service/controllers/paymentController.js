const pool = require("../db");
const { publishPaymentCompleted, publishPaymentFailed } = require("../eventPublisher");

/**
 * POST /api/v1/payments
 * Body:
 * {
 *   "orderId": 1001,
 *   "amount": 149.97,
 *   "paymentMethod": "CARD",         // optional, default "CARD"
 *   "simulateStatus": "SUCCESS"      // optional: "SUCCESS" | "FAILED"
 * }
 */
async function initiatePayment(req, res) {
  const connection = await pool.getConnection();
  try {
    const { orderId, amount, paymentMethod, simulateStatus } = req.body;
    const requester = req.user;

    if (!orderId || amount === undefined || amount === null) {
      connection.release();
      return res.status(400).json({
        message: "orderId and amount are required",
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      connection.release();
      return res.status(400).json({
        message: "amount must be a positive number",
      });
    }

    const method = paymentMethod || "CARD";

    await connection.beginTransaction();

    // Optional: basic check that the order exists (read-only cross-boundary)
    const [orderRows] = await connection.query(
      `
      SELECT
        id,
        user_id AS userId,
        status,
        total_amount AS totalAmount
      FROM orders
      WHERE id = ?
      `,
      [orderId],
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderRows[0];

    // (Simple) Authorization: owner or ADMIN
    if (requester.role !== "ADMIN" && requester.id !== order.userId) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({
        message: "Not allowed to pay for this order",
      });
    }

    // For simplicity, we won't enforce that amount == order.totalAmount here,
    // but you can add that if you want stricter behaviour.
    // Insert payment with PENDING status
    const [paymentResult] = await connection.query(
      `
      INSERT INTO payments (order_id, amount, status, payment_method)
      VALUES (?, ?, 'PENDING', ?)
      `,
      [orderId, numericAmount, method],
    );

    const paymentId = paymentResult.insertId;

    // Decide success or failure
    let isSuccess;
    if (simulateStatus === "SUCCESS") {
      isSuccess = true;
    } else if (simulateStatus === "FAILED") {
      isSuccess = false;
    } else {
      // Random with 80% success chance
      isSuccess = Math.random() < 0.8;
    }

    let providerReference = null;
    let errorMessage = null;
    let finalStatus = "PENDING";

    if (isSuccess) {
      finalStatus = "COMPLETED";
      providerReference = `SIM-TXN-${Date.now()}-${paymentId}`;
    } else {
      finalStatus = "FAILED";
      errorMessage = "Simulated payment failure";
    }

    // Update payment record
    await connection.query(
      `
      UPDATE payments
      SET status = ?, provider_reference = ?, error_message = ?
      WHERE id = ?
      `,
      [finalStatus, providerReference, errorMessage, paymentId],
    );

    await connection.commit();
    connection.release();

    const paymentPayload = {
      paymentId,
      orderId,
      amount: numericAmount,
      paymentMethod: method,
      status: finalStatus,
      providerReference,
      errorMessage,
    };

    // Publish stub event
    if (isSuccess) {
      publishPaymentCompleted(paymentPayload);
    } else {
      publishPaymentFailed(paymentPayload);
    }

    return res.status(200).json({
      message: isSuccess ? "Payment completed successfully" : "Payment failed",
      payment: paymentPayload,
    });
  } catch (err) {
    console.error("Error in initiatePayment:", err);
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("Error during rollback in initiatePayment:", rollbackErr);
    }
    connection.release();
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  initiatePayment,
};
