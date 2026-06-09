// Test the exact loading logic from index.ts
import fs from "fs";
import path from "path";

const envLocalPath = path.join(process.cwd(), ".env.local");
console.log("Checking for .env.local at:", envLocalPath);
console.log("File exists:", fs.existsSync(envLocalPath));

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  console.log("\n.env.local content:");
  console.log(envContent);
  
  console.log("\nLoading environment variables:");
  envContent.split("\n").forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) return;
    const [key, ...valueParts] = trimmedLine.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
      console.log(`  ${key.trim()}: ${value.substring(0, 20)}...`);
    }
  });
}

console.log("\nFinal environment variables:");
console.log("STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "SET" : "NOT SET");
console.log("VITE_STRIPE_PUBLISHABLE_KEY:", process.env.VITE_STRIPE_PUBLISHABLE_KEY ? "SET" : "NOT SET");
console.log("STRIPE_STARTER_PRICE_ID:", process.env.STRIPE_STARTER_PRICE_ID ? "SET" : "NOT SET");
console.log("STRIPE_PRO_PRICE_ID:", process.env.STRIPE_PRO_PRICE_ID ? "SET" : "NOT SET");
