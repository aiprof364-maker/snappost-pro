const webhook = "https://hook.us2.make.com/qk1gmrost0y9dkxhi7m4429p6jtot9t8";

console.log("Sending test contact form data to Make webhook...");

const testData = {
  name: "John Smith",
  email: "john@example.com",
  message: "I'm interested in SnapPost Pro for my plumbing business",
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
    console.log("✅ Webhook accepted the data");
    console.log("Check your Google Drive spreadsheet in 5-10 seconds for the new row:");
    console.log(`  Name: ${testData.name}`);
    console.log(`  Email: ${testData.email}`);
    console.log(`  Message: ${testData.message}`);
  } else {
    console.error(`❌ Webhook returned status ${response.status}`);
  }
} catch (err) {
  console.error("❌ Error:", err.message);
}
