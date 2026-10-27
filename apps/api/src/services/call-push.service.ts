import { createHash, createHmac, sign, timingSafeEqual } from "node:crypto";
import { connect } from "node:http2";
import type { Messaging, Message } from "firebase-admin/messaging";

interface CallPushInput {
  conversationId: string;
  conversationName: string;
  content: string;
  messageId: string;
}
interface Registration {
  token: string;
  platform: string;
  userId: string;
}
interface ActionClaims {
  callId: string;
  conversationId: string;
  userId: string;
  expires: number;
}

export function nativeCallUuid(callId: string): string {
  const hex = createHash("sha256").update(callId).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function actionSecret(): string {
  const value = process.env.CALL_ACTION_SECRET || process.env.JWT_SECRET;
  if (!value) throw new Error("Call action signing secret unavailable");
  return value;
}
export function signCallAction(claims: ActionClaims): string {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", actionSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}
export function verifyCallAction(token: string): ActionClaims | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const actual = Buffer.from(signature, "base64url");
  const expected = createHmac("sha256", actionSecret()).update(body).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  try {
    const claims: unknown = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    );
    if (
      typeof claims !== "object" ||
      claims === null ||
      !("callId" in claims) ||
      typeof claims.callId !== "string" ||
      !("conversationId" in claims) ||
      typeof claims.conversationId !== "string" ||
      !("userId" in claims) ||
      typeof claims.userId !== "string" ||
      !("expires" in claims) ||
      typeof claims.expires !== "number" ||
      claims.expires <= Date.now()
    )
      return null;
    return {
      callId: claims.callId,
      conversationId: claims.conversationId,
      userId: claims.userId,
      expires: claims.expires,
    };
  } catch {
    return null;
  }
}

async function sendVoip(
  token: string,
  sandbox: boolean,
  data: Record<string, string>,
): Promise<void> {
  const key = process.env.APNS_VOIP_KEY_P8?.replace(/\\n/g, "\n");
  const keyId = process.env.APNS_VOIP_KEY_ID;
  const teamId = process.env.APNS_VOIP_TEAM_ID;
  if (!key || !keyId || !teamId)
    throw new Error("APNs VoIP credentials are not configured");
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: keyId }),
  ).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }),
  ).toString("base64url");
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  await new Promise<void>((resolve, reject) => {
    const client = connect(
      sandbox
        ? "https://api.sandbox.push.apple.com"
        : "https://api.push.apple.com",
    );
    const finish = (error?: Error) => {
      client.close();
      error ? reject(error) : resolve();
    };
    client.on("error", finish);
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${header}.${claims}.${signature}`,
      "apns-topic": "mn.mglstore.app.voip",
      "apns-push-type": "voip",
      "apns-priority": "10",
      "apns-expiration": "0",
      "apns-collapse-id": data.nativeId,
    });
    let status = 0;
    request.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    request.setEncoding("utf8");
    request.on("data", () => {});
    request.on("end", () =>
      finish(
        status === 200 ? undefined : new Error(`APNs VoIP response ${status}`),
      ),
    );
    request.on("error", finish);
    request.setTimeout(10000, () => {
      request.close();
      finish(new Error("APNs VoIP timeout"));
    });
    request.end(JSON.stringify({ aps: { "content-available": 1 }, data }));
  });
}

export async function sendStoreCallPush(
  input: CallPushInput,
  registrations: Registration[],
  messaging?: Messaging,
): Promise<void> {
  const marker = "__MGL_CALL_SIGNAL__";
  const index = input.content.indexOf(marker);
  if (index < 0) return;
  const parsed: unknown = JSON.parse(
    Buffer.from(
      input.content.slice(index + marker.length),
      "base64url",
    ).toString("utf8"),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("callId" in parsed) ||
    typeof parsed.callId !== "string"
  )
    return;
  const callId = parsed.callId;
  const isEnd = "type" in parsed && parsed.type === "end";
  const expires = Date.now() + 45000;
  const voipReady = Boolean(
    process.env.APNS_VOIP_KEY_P8 &&
    process.env.APNS_VOIP_KEY_ID &&
    process.env.APNS_VOIP_TEAM_ID,
  );
  const voipUsers = new Set(
    registrations
      .filter((item) => item.platform.startsWith("ios_voip"))
      .map((item) => item.userId),
  );
  const targets = registrations.filter(
    (item) =>
      isEnd ||
      item.platform !== "ios" ||
      !voipReady ||
      !voipUsers.has(item.userId),
  );
  const results = await Promise.allSettled(
    targets.map(async (registration) => {
      const data: Record<string, string> = {
        type: isEnd ? "call_ended" : "incoming_call",
        app: "STORE",
        callId,
        nativeId: nativeCallUuid(callId),
        conversationId: input.conversationId,
        conversationName: input.conversationName,
        messageId: input.messageId,
        expiresAt: new Date(expires).toISOString(),
        actionToken: signCallAction({
          callId,
          conversationId: input.conversationId,
          userId: registration.userId,
          expires,
        }),
      };
      if (registration.platform.startsWith("ios_voip")) {
        if (isEnd) return;
        return sendVoip(
          registration.token,
          registration.platform.endsWith("_sandbox"),
          data,
        );
      }
      if (!messaging) return;
      const message: Message = {
        token: registration.token,
        data,
        android: { priority: "high", ttl: 45000 },
      };
      // iOS receives CallKit via PushKit, with a normal alert as fallback while
      // VoIP credentials are being configured. Android handles the data message.
      if (registration.platform === "ios" && !isEnd) {
        message.notification = {
          title: `${input.conversationName} залгаж байна`,
          body: "Дуут дуудлага",
        };
        message.apns = {
          headers: { "apns-expiration": String(Math.floor(expires / 1000)) },
          payload: { aps: { sound: "default" } },
        };
      }
      if (registration.platform === "ios" && isEnd) {
        message.apns = {
          headers: {
            "apns-push-type": "background",
            "apns-priority": "5",
            "apns-expiration": "0",
          },
          payload: { aps: { contentAvailable: true } },
        };
      }
      await messaging.send(message);
    }),
  );
  for (const result of results) {
    if (result.status === "rejected")
      console.error(
        "[call push]",
        result.reason instanceof Error
          ? result.reason.message
          : "delivery failed",
      );
  }
}
