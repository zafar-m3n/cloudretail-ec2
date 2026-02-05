const { randomUUID } = require("crypto");

/**
 * Local stub for publishing PaymentCompleted / PaymentFailed events.
 * For now these just log to the console. Later this can call EventBridge.
 */

function publishPaymentCompleted(detail) {
  const event = {
    eventId: randomUUID(),
    eventType: "PaymentCompleted",
    occurredAt: new Date().toISOString(),
    ...detail,
  };

  console.log("[EVENT] PaymentCompleted:", JSON.stringify(event, null, 2));
}

function publishPaymentFailed(detail) {
  const event = {
    eventId: randomUUID(),
    eventType: "PaymentFailed",
    occurredAt: new Date().toISOString(),
    ...detail,
  };

  console.log("[EVENT] PaymentFailed:", JSON.stringify(event, null, 2));
}

module.exports = {
  publishPaymentCompleted,
  publishPaymentFailed,
};
