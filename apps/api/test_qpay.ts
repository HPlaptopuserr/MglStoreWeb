import { config } from "dotenv";
import * as path from "path";
config({ path: path.resolve(__dirname, "../../../.env") });

import { createQPayInvoice } from "./src/services/qpay";

async function run() {
  try {
    const res = await createQPayInvoice({
      orderId: "test-order-1",
      orderNumber: "TEST-1234",
      amount: 10,
      description: "Test invoice",
      merchantContext: {
        username: process.env.QPAY_CLIENT_ID || "",
        password: process.env.QPAY_CLIENT_SECRET || "",
        invoiceCode: process.env.QPAY_INVOICE_CODE || "",
        merchantKey: "test:default",
      }
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
