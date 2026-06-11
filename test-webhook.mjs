const webhook = process.env.MAKE_WEBHOOK_URL;

if (!webhook) {
  console.error("❌ MAKE_WEBHOOK_URL not set");
  process.exit(1);
}

console.log("Testing Make webhook:", webhook);

const testData = {
  name: "Test User",
  email: "test@example.com",
  message: "This is a test message from SnapPost Pro",
  source: "snappostpro.com",
  submittedAt: new Date().toISOString(),
};

try {
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testData),
  });

  if (response.ok) {
    console.log("✅ Webhook test passed! Make received the test data.");
    process.exit(0);
  } else {
    console.error(`❌ Webhook returned status ${response.status}`);
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Webhook test failed:", err.message);
  process.exit(1);
}
