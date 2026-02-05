const { randomUUID } = require("crypto");

/**
 * Local stub for publishing OrderCreated events.
 * For now it just logs to console. Later this can call EventBridge.
 */
function publishOrderCreated(orderData) {
  const event = {
    eventId: randomUUID(),
    eventType: "OrderCreated",
    occurredAt: new Date().toISOString(),
    ...orderData,
  };

  console.log("[EVENT] OrderCreated:", JSON.stringify(event, null, 2));

  // In the future:
  // - Put this on a local event bus
  // - Or call AWS EventBridge from here
}

module.exports = {
  publishOrderCreated,
};
