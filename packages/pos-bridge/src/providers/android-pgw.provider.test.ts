import assert from "node:assert/strict";
import test from "node:test";
import {
  AndroidPgwProvider,
  type AndroidPgwConfig,
  classifyPgwResponse,
  parsePgwResponse,
  terminalResultFrame,
  type PgwResponse,
} from "./android-pgw.provider";

test("recognizes zero response-code variants as approved", () => {
  assert.equal(
    classifyPgwResponse(parsePgwResponse("<{response_code:00}>")),
    "APPROVED",
  );
  assert.equal(classifyPgwResponse(parsePgwResponse("<{Code:0}>")), "APPROVED");
  assert.equal(
    classifyPgwResponse(parsePgwResponse('<{"response":"00"}>')),
    "APPROVED",
  );
  assert.equal(
    classifyPgwResponse(parsePgwResponse("<{response:SALE,code:0}>")),
    "APPROVED",
  );
});

test("recognizes explicit success fields from alternate PGW versions", () => {
  assert.equal(
    classifyPgwResponse(parsePgwResponse("<{status:SUCCESS}>")),
    "APPROVED",
  );
  assert.equal(
    classifyPgwResponse(parsePgwResponse("<{succeed:true}>")),
    "APPROVED",
  );
});

test("uses RRN plus bank approval code as strong approval evidence", () => {
  const parsed = parsePgwResponse("<{RRN:123456789012,approveCode:ABC123}>");
  assert.equal(classifyPgwResponse(parsed), "APPROVED");
});

test("explicit decline overrides reference and approval fields", () => {
  const parsed = parsePgwResponse(
    "<{status:DECLINED,RRN:123456789012,appCode:ABC123}>",
  );
  assert.equal(classifyPgwResponse(parsed), "DECLINED");
});

test("recognizes the observed negative PGW cancellation replies", () => {
  for (const code of [-21, -22]) {
    const raw = JSON.stringify({
      code,
      desc: "Гүйлгээ цуцлагдсан",
      terminal: "70046665",
      rrn: "",
    });
    assert.equal(classifyPgwResponse(parsePgwResponse(raw)), "DECLINED");
  }
});

test("negative codes alone and incomplete responses remain unknown", () => {
  const responses: PgwResponse[] = [
    { code: -1 },
    { code: -2, desc: "Network timeout" },
    { code: -999, desc: "Гүйлгээ цуцлагдсан" },
    { amount: 90000, data: "attempt-1" },
  ];
  for (const response of responses) {
    assert.equal(classifyPgwResponse(response), "UNKNOWN");
  }
});

test("conflicting cancellation and bank evidence remains unresolved", () => {
  assert.equal(
    classifyPgwResponse({
      code: -22,
      desc: "Гүйлгээ цуцлагдсан",
      rrn: "123456",
      appCode: "ABC123",
    }),
    "UNKNOWN",
  );
});

test("does not treat the echoed charge command as the terminal result", () => {
  const command = "<{amount:12500,data:attempt-1}>";
  assert.equal(terminalResultFrame(command, command), "");
  assert.equal(
    terminalResultFrame(`${command}<{code:0,rrn:123456}>`, command),
    "<{code:0,rrn:123456}>",
  );
});

const config: AndroidPgwConfig = {
  path: "test",
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  timeoutMs: 100,
  healthTimeoutMs: 100,
  responseIdleMs: 10,
  amountMultiplier: 100,
  appendCrlf: false,
};

for (const code of [-21, -22]) {
  test(`documented cancellation ${code} is independent of description language`, async () => {
    const provider = new AndroidPgwProvider(
      config,
      async () =>
        `<{code:${code},desc:"POS Transaction canceled",data:attempt}>`,
    );
    assert.equal(
      (
        await provider.charge({
          attemptId: "attempt",
          amount: 1,
          terminalId: "terminal-1",
        })
      ).status,
      "DECLINED",
    );
  });
}
for (const code of [-1, -2, -3, -4, -11, -12, -13, 50, 52, 903, 912, 913]) {
  test(`transport, mismatch, storage or duplicate code ${code} stays unresolved`, () => {
    assert.equal(classifyPgwResponse({ code }), "UNKNOWN");
  });
}
for (const code of [-20, -23, -25, -26, -28, -33, 106, 116, 117]) {
  test(`documented refusal ${code} releases the attempt`, () => {
    assert.equal(classifyPgwResponse({ code }), "DECLINED");
  });
}
test("purchase uses minor units and preserves echoed identity and zero-prefixed bank references", async () => {
  const commands: string[] = [];
  const provider = new AndroidPgwProvider(config, async (command) => {
    commands.push(command);
    return "<{code:0,rrn:001234567890,appCode:000123,data:attempt,terminal:000001,amount:1023}>";
  });
  const result = await provider.charge({
    amount: 10.23,
    attemptId: "attempt",
    terminalId: "000001",
  });
  assert.deepEqual(commands, ["<{amount:1023,data:attempt}>"]);
  assert.equal(result.status, "APPROVED");
  assert.equal(result.rrn, "001234567890");
  assert.equal(result.appCode, "000123");
});
for (const fields of [
  "data:other,amount:100,terminal:terminal",
  "data:attempt,amount:200,terminal:terminal",
  "data:attempt,amount:100,terminal:other",
  "amount:100,terminal:terminal",
]) {
  test(`mismatched purchase cannot approve: ${fields}`, async () => {
    const provider = new AndroidPgwProvider(
      config,
      async () => `<{code:0,${fields}}>`,
    );
    const result = await provider.charge({
      amount: 1,
      attemptId: "attempt",
      terminalId: "terminal",
    });
    assert.equal(result.status, "FAILED");
  });
}
test("missing response code cannot approve a purchase", async () => {
  const provider = new AndroidPgwProvider(
    config,
    async () => "<{data:attempt,status:SUCCESS}>",
  );
  assert.equal(
    (
      await provider.charge({
        amount: 1,
        attemptId: "attempt",
        terminalId: "terminal-1",
      })
    ).status,
    "FAILED",
  );
});
test("PGW void sends the bank RRN and validates its own operation identity", async () => {
  const provider = new AndroidPgwProvider(config, async (command) => {
    assert.equal(command, '<{void:true,rrn:"001234567890",data:void_request}>');
    return "<{code:0,data:void_request}>";
  });
  assert.equal(
    (
      await provider.command({
        operation: "void",
        requestId: "void_request",
        terminalId: "terminal-1",
        rrn: "001234567890",
      })
    ).status,
    "APPROVED",
  );
  await assert.rejects(
    provider.command({
      operation: "void",
      requestId: "void_request",
      terminalId: "terminal-1",
      rrn: "invalid",
    }),
  );
});
test("settlement handles documented nested JSON and a response without data", async () => {
  const provider = new AndroidPgwProvider(config, async (command) => {
    assert.equal(command, "<{settlement:true,data:shift}>");
    return '<{code:0,terminalID:000001,totalAmount:1400,qrPaymentContainer:[{"merchant":"A,B","amount":1400}]}>';
  });
  const result = await provider.command({
    operation: "settlement",
    requestId: "shift",
    terminalId: "000001",
  });
  assert.equal(result.status, "APPROVED");
  assert.deepEqual((result.parsed as PgwResponse).qrPaymentContainer, [
    { merchant: "A,B", amount: 1400 },
  ]);
});
test("health does not accept DISCONNECTED as CONNECTED", async () => {
  const provider = new AndroidPgwProvider(config, async () => "DISCONNECTED");
  assert.equal((await provider.health()).ok, false);
});
test("cancel without a matching active connection never declares a declined payment", async () => {
  const provider = new AndroidPgwProvider(config, async () => {
    throw new Error("must not send");
  });
  assert.equal(
    (
      await provider.command({
        operation: "cancel",
        requestId: "cancel",
        terminalId: "terminal-1",
        attemptId: "missing",
      })
    ).status,
    "FAILED",
  );
});

test("health accepts CONNECTED after stripping only the echoed check command", async () => {
  const provider = new AndroidPgwProvider(
    config,
    async () => "<{connection:check}>CONNECTED",
  );
  assert.equal((await provider.health()).ok, true);
});

test("cancellation command echo cannot resolve an in-flight purchase", () => {
  const purchase = "<{amount:10000,data:attempt}>";
  assert.equal(terminalResultFrame('<{vendingCancel:"1"}>', purchase), "");
  assert.equal(
    terminalResultFrame(
      '<{vendingCancel:"1"}><{code:-21,data:attempt}>',
      purchase,
    ),
    "<{code:-21,data:attempt}>",
  );
});

test("successful purchase requires its amount and terminal fields", async () => {
  for (const fields of [
    "data:attempt,terminal:terminal",
    "data:attempt,amount:100",
  ]) {
    const provider = new AndroidPgwProvider(
      config,
      async () => `<{code:0,${fields}}>`,
    );
    assert.equal(
      (
        await provider.charge({
          amount: 1,
          attemptId: "attempt",
          terminalId: "terminal",
        })
      ).status,
      "FAILED",
    );
  }
});

test("conflicting status fields and documented uncertain errors cannot finalize a purchase", () => {
  assert.equal(classifyPgwResponse({ code: 0, status: "DECLINED" }), "UNKNOWN");
  assert.equal(
    classifyPgwResponse({ code: 116, status: "SUCCESS" }),
    "UNKNOWN",
  );
  assert.equal(classifyPgwResponse({ code: 50, status: "FAILED" }), "UNKNOWN");
  assert.equal(
    classifyPgwResponse({ code: 9999, status: "SUCCESS" }),
    "UNKNOWN",
  );
});
