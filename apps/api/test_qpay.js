require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

async function run() {
  console.log("=== QPay Debug Script ===");
  const baseUrl = process.env.QPAY_BASE_URL || "https://merchant.qpay.mn/v2";
  const username = process.env.QPAY_CLIENT_ID || "";
  const password = process.env.QPAY_CLIENT_SECRET || "";
  const invoiceCode = process.env.QPAY_INVOICE_CODE || "";

  console.log(`Base URL: ${baseUrl}`);
  console.log(`Username: ${username}`);
  console.log(`Password length: ${password.length}`);
  console.log(`Invoice Code: ${invoiceCode}`);

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  
  let token = "";
  try {
    console.log("\n[1] Fetching token...");
    const res = await fetch(`${baseUrl}/auth/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}` },
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    
    if (!res.ok) {
      console.log("Auth Failed Body:", text);
      return;
    }
    
    const data = JSON.parse(text);
    token = data.access_token;
    console.log("Token fetched successfully (length:", token.length, ")");
  } catch (err) {
    console.error("Auth Exception:", err);
    return;
  }

  try {
    console.log("\n[2] Creating invoice (amount: 1 MNT)...");
    const body = {
      invoice_code: invoiceCode,
      sender_invoice_no: "TEST-" + Date.now(),
      invoice_receiver_code: "pos-test",
      invoice_description: "POS debug test invoice",
      amount: 1, // Testing 1 MNT
      callback_url: "https://mgl-api.onrender.com/api/pos/qpay/cb?orderId=test",
    };

    const res = await fetch(`${baseUrl}/invoice`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Invoice Response:", text);
  } catch (err) {
    console.error("Invoice Exception:", err);
  }
}

run();
