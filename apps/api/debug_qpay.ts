import { config } from "dotenv";
import * as path from "path";

config({ path: path.resolve(__dirname, "../../../.env") });

async function debugQPay() {
  console.log("=== QPay Debug Step 1: Token Auth ===");
  const baseUrl = process.env.QPAY_BASE_URL || "https://merchant.qpay.mn/v2";
  const username = process.env.QPAY_CLIENT_ID || "";
  const password = process.env.QPAY_CLIENT_SECRET || "";

  console.log(`URL: ${baseUrl}/auth/token`);
  console.log(`Username: ${username}`);
  console.log(`Password length: ${password.length}`);

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const res = await fetch(`${baseUrl}/auth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    const status = res.status;
    const text = await res.text();
    console.log(`Response Status: ${status}`);
    console.log(`Response Body: ${text}`);
    
  } catch (err) {
    console.error("Network/Fetch error:", err);
  }
}

debugQPay();
