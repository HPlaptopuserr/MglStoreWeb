import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express, { type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import {
  deriveBridgeSecret,
  hashPairingCode,
  lockBridgeRegister,
} from "../../../services/pos-bridge-keys";
import { signBridgePayload } from "../../../services/android-pgw-bridge";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.BRIDGE_PAIRING_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/mgl_bridge_pairing_test_");
type Claim = {
  bindingId: string;
  registerId: string;
  deviceId: string;
  secret: string;
};
type Code = { code: string; expiresAt: string };
const json = async <T>(response: Response): Promise<T> =>
  (await response.json()) as T;

test(
  "Admin Vendor register pairing and per-device signing against disposable PostgreSQL",
  { skip: !enabled },
  async (t) => {
    const root = "bridge-pairing-test-root-authentication-key-only";
    process.env.JWT_SECRET = root;
    delete process.env.POS_BRIDGE_SHARED_SECRET;
    const load = createRequire(__filename);
    const pairRoutes = (
      load("./bridge-pairing.routes") as { default: ExpressRouter }
    ).default;
    const cardRoutes = (
      load("./card-payments.routes") as { default: ExpressRouter }
    ).default;
    const app = express();
    app.use(express.json());
    app.use(pairRoutes);
    app.use(cardRoutes);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const unique = crypto.randomUUID();
      const organization = await prisma.organization.create({
        data: {
          name: "Pairing store",
          slug: `pairing-${unique}`,
          taxId: `pairing-${unique}`,
          status: "ACTIVE",
        },
      });
      const admin = await prisma.user.create({
        data: { email: `admin-${unique}@pairing.invalid`, role: "ADMIN" },
      });
      const cashier = await prisma.user.create({
        data: { email: `cashier-${unique}@pairing.invalid`, role: "USER" },
      });
      await prisma.organizationMember.create({
        data: {
          userId: cashier.id,
          organizationId: organization.id,
          role: "STAFF",
          capabilities: ["POS_CASHIER"],
          isPrimary: true,
        },
      });
      const branch = await prisma.branch.create({
        data: {
          organizationId: organization.id,
          name: "Pairing test",
          address: "Test",
        },
      });
      const register = await prisma.posRegister.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          name: "Vendor A35",
          isActive: true,
          activationStatus: "APPROVED",
        },
      });
      const other = await prisma.posRegister.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          name: "Other till",
          isActive: true,
          activationStatus: "APPROVED",
        },
      });
      const auth = (userId: string) => ({
        Authorization: `Bearer ${jwt.sign({ userId, organizationId: organization.id }, root)}`,
        "Content-Type": "application/json",
      });
      const call = (
        path: string,
        body: unknown,
        userId?: string,
        method = "POST",
      ) =>
        fetch(`${base}${path}`, {
          method,
          headers: userId
            ? auth(userId)
            : { "Content-Type": "application/json" },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
      const adminPath = `/admin/pos-registers/${register.id}/bridge`;
      const issue = async (id = register.id) => {
        const response = await call(
          `/admin/pos-registers/${id}/bridge/pairing-code`,
          {},
          admin.id,
        );
        assert.equal(response.status, 201, await response.clone().text());
        return json<Code>(response);
      };
      const claim = (code: string, deviceId = "device_0123456789abcdef") =>
        call("/pos/bridge/pair", { code, deviceId });
      let credentials: Claim;
      let alternate: Claim;

      await t.test(
        "only Admin may issue/revoke codes or inspect pairing state",
        async () => {
          assert.equal(
            (await call(`${adminPath}/pairing-code`, {}, cashier.id)).status,
            403,
          );
          assert.equal(
            (await call(`${adminPath}/pairing-code`, {})).status,
            401,
          );
          assert.equal(
            (await call(adminPath, undefined, cashier.id, "GET")).status,
            403,
          );
          assert.equal(
            (await call(adminPath, undefined, cashier.id, "DELETE")).status,
            403,
          );
        },
      );
      await t.test(
        "issuing a code configures only the selected Vendor till and stores only a hash",
        async () => {
          const code = await issue();
          assert.match(code.code, /^[A-F0-9]{5}(-[A-F0-9]{5}){3}$/);
          const saved = await prisma.posBridgeBinding.findUniqueOrThrow({
            where: { registerId: register.id },
          });
          assert.equal(saved.pairingCodeHash, hashPairingCode(code.code));
          assert.ok(!JSON.stringify(saved).includes(code.code));
          const configured = await prisma.posRegister.findUniqueOrThrow({
            where: { id: register.id },
          });
          assert.equal(configured.cardEnabled, true);
          assert.equal(configured.cardProviderType, "ANDROID_PGW");
          assert.equal(configured.terminalBridgeUrl, "http://127.0.0.1:7420");
          assert.equal(
            (
              await prisma.posRegister.findUniqueOrThrow({
                where: { id: other.id },
              })
            ).cardEnabled,
            false,
          );
        },
      );
      await t.test(
        "new issuance invalidates the older code; concurrent claims consume a code exactly once",
        async () => {
          const previous = await issue();
          const next = await issue();
          assert.equal((await claim(previous.code)).status, 410);
          const responses = await Promise.all([
            claim(next.code),
            claim(next.code, "device_other_0123456789"),
          ]);
          assert.deepEqual(
            responses.map((response) => response.status).sort(),
            [200, 410],
          );
          credentials = await json<Claim>(
            responses.find((response) => response.status === 200)!,
          );
          assert.equal((await claim(next.code)).status, 410);
          const row = await prisma.posBridgeBinding.findUniqueOrThrow({
            where: { id: credentials.bindingId },
          });
          assert.equal(
            credentials.secret,
            deriveBridgeSecret(register.id, row.credentialSalt!, root),
          );
          assert.ok(!JSON.stringify(row).includes(credentials.secret));
        },
      );
      await t.test(
        "expired/invalid codes disclose no credentials",
        async () => {
          const code = await issue();
          await prisma.posBridgeBinding.update({
            where: { registerId: register.id },
            data: { pairingExpiresAt: new Date(Date.now() - 1) },
          });
          assert.equal((await claim(code.code)).status, 410);
          assert.equal((await claim("not-a-code")).status, 400);
        },
      );
      let heartbeatTime = Date.now();
      const heartbeat = (
        credential: Claim,
        changes: Record<string, unknown> = {},
        secret = credential.secret,
      ) => {
        const body = JSON.stringify({
          bindingId: credential.bindingId,
          deviceId: credential.deviceId,
          timestamp: ++heartbeatTime,
          terminalConnected: true,
          serialPath: "COM3",
          terminalId: "000001",
          bridgeVersion: "pairing-test",
          error: null,
          hasUnresolvedOperation: false,
          ...changes,
        });
        return call("/pos/bridge/heartbeat", {
          body,
          signature: signBridgePayload(body, secret),
        });
      };
      await t.test(
        "only fresh, authenticated device heartbeats update Admin status",
        async () => {
          assert.equal(
            (await heartbeat(credentials, {}, "wrong-secret")).status,
            401,
          );
          assert.equal(
            (await heartbeat(credentials, { deviceId: "another-device" }))
              .status,
            400,
          );
          assert.equal(
            (await heartbeat(credentials, { timestamp: Date.now() - 300_000 }))
              .status,
            400,
          );
          assert.equal((await heartbeat(credentials)).status, 200);
          const response = await call(adminPath, undefined, admin.id, "GET");
          assert.equal(response.headers.get("cache-control"), "no-store");
          const status = await json<Record<string, unknown>>(response);
          assert.equal(status.state, "CONNECTED");
          assert.equal(status.serialPath, "COM3");
          assert.equal(status.terminalId, "000001");
          for (const hidden of [
            credentials.secret,
            "credentialSalt",
            "pairingCodeHash",
            "deviceId",
          ])
            assert.ok(!JSON.stringify(status).includes(hidden));
          assert.equal(
            (await heartbeat(credentials, { timestamp: heartbeatTime - 1 }))
              .status,
            409,
          );
          assert.equal(
            (
              await heartbeat(credentials, {
                terminalConnected: false,
                error: "USB disconnected",
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await json<{ state: string }>(
                await call(adminPath, undefined, admin.id, "GET"),
              )
            ).state,
            "TERMINAL_OFFLINE",
          );
          await heartbeat(credentials);
        },
      );
      await t.test(
        "another register has a different key and cannot sign this till's requests",
        async () => {
          alternate = await json<Claim>(
            await claim(
              (await issue(other.id)).code,
              "device_alternate_0123456789",
            ),
          );
          assert.notEqual(alternate.secret, credentials.secret);
          assert.equal(
            (await heartbeat(credentials, {}, alternate.secret)).status,
            401,
          );
        },
      );
      const attemptId = crypto.randomUUID();
      const authorize = () =>
        call(
          "/pos/payments/card/authorize-v2",
          {
            attemptId,
            amount: 100,
            terminalId: "terminal-1",
            registerId: register.id,
            organizationId: organization.id,
            clientBridge: true,
          },
          cashier.id,
        );
      await t.test(
        "paired Vendor authorization works without a shared-secret environment variable",
        async () => {
          const response = await authorize();
          assert.equal(response.status, 201, await response.clone().text());
          const attempt = await json<{ bridgeRequestSignature: string }>(
            response,
          );
          assert.equal(
            attempt.bridgeRequestSignature,
            signBridgePayload(
              JSON.stringify({
                attemptId,
                amount: 100,
                terminalId: "terminal-1",
              }),
              credentials.secret,
            ),
          );
          assert.equal((await authorize()).status, 200);
        },
      );
      await t.test(
        "pending payments block code rotation, claim and revoke without invalidating the device",
        async () => {
          assert.equal(
            (await call(`${adminPath}/pairing-code`, {}, admin.id)).status,
            409,
          );
          assert.equal(
            (await call(adminPath, undefined, admin.id, "DELETE")).status,
            409,
          );
          assert.equal((await heartbeat(credentials)).status, 200);
        },
      );
      const submit = (secret: string, status = "APPROVED") => {
        const result = {
          provider: "ANDROID_PGW",
          status,
          attemptId,
          requestAmount: 100,
          requestedTerminalId: "terminal-1",
          rrn: status === "APPROVED" ? "001234567890" : null,
        };
        const bridgeResponse = JSON.stringify(result);
        return call(
          "/pos/payments/card/client-bridge-result-v2",
          {
            attemptId,
            result,
            bridgeResponse,
            bridgeSignature: signBridgePayload(bridgeResponse, secret),
          },
          cashier.id,
        );
      };
      await t.test(
        "per-register result verification rejects another device and accepts the paired device",
        async () => {
          assert.equal((await submit(alternate.secret)).status, 422);
          const response = await submit(credentials.secret);
          assert.equal(response.status, 200);
          assert.equal(
            (await json<{ status: string }>(response)).status,
            "APPROVED",
          );
        },
      );
      await t.test(
        "unknown local operations block pairing replacement and revoke",
        async () => {
          await heartbeat(credentials, { hasUnresolvedOperation: true });
          assert.equal(
            (await call(`${adminPath}/pairing-code`, {}, admin.id)).status,
            409,
          );
          assert.equal(
            (await call(adminPath, undefined, admin.id, "DELETE")).status,
            409,
          );
          await heartbeat(credentials, { hasUnresolvedOperation: false });
        },
      );
      await t.test(
        "an authorized but unresolved terminal command blocks re-pair until signed resolution",
        async () => {
          const shift = await prisma.posShift.create({
            data: {
              organizationId: organization.id,
              branchId: branch.id,
              registerId: register.id,
              cashierId: cashier.id,
              openingCash: 0,
            },
          });
          const input = {
            registerId: register.id,
            operation: "settlement",
            shiftId: shift.id,
          };
          const prepared = await call(
            "/pos/payments/android-pgw/command",
            input,
            cashier.id,
          );
          assert.equal(prepared.status, 200, await prepared.clone().text());
          const { command, signature } = await json<{
            command: Record<string, string>;
            signature: string;
          }>(prepared);
          assert.equal(
            signature,
            signBridgePayload(JSON.stringify(command), credentials.secret),
          );
          assert.equal(
            (await call(`${adminPath}/pairing-code`, {}, admin.id)).status,
            409,
          );
          const bridgeResponse = JSON.stringify({
            command,
            status: "APPROVED",
          });
          assert.equal(
            (
              await call(
                "/pos/payments/android-pgw/command",
                {
                  ...input,
                  bridgeResponse,
                  bridgeSignature: signBridgePayload(
                    bridgeResponse,
                    credentials.secret,
                  ),
                },
                cashier.id,
              )
            ).status,
            200,
          );
        },
      );
      await t.test(
        "revocation invalidates old heartbeats and future new payment dispatch",
        async () => {
          assert.equal(
            (await call(adminPath, undefined, admin.id, "DELETE")).status,
            204,
          );
          assert.equal((await heartbeat(credentials)).status, 401);
          const response = await call(
            "/pos/payments/card/authorize-v2",
            {
              attemptId: crypto.randomUUID(),
              amount: 100,
              terminalId: "terminal-1",
              registerId: register.id,
              organizationId: organization.id,
              clientBridge: true,
            },
            cashier.id,
          );
          assert.equal(response.status, 409);
          assert.equal(
            (
              await json<{ state: string }>(
                await call(adminPath, undefined, admin.id, "GET"),
              )
            ).state,
            "REVOKED",
          );
        },
      );
      await t.test(
        "an Admin may re-pair an idle revoked register with a new key",
        async () => {
          const next = await json<Claim>(await claim((await issue()).code));
          assert.notEqual(next.secret, credentials.secret);
          assert.equal((await heartbeat(next)).status, 200);
          assert.equal((await heartbeat(credentials)).status, 401);
        },
      );
      await t.test(
        "the real bridge provisioning client claims the Admin link and reports signed status",
        async () => {
          const physical = await prisma.posRegister.create({
            data: {
              organizationId: organization.id,
              branchId: branch.id,
              name: "Bridge client test",
              isActive: true,
              activationStatus: "APPROVED",
            },
          });
          const directory = fs.mkdtempSync(
            path.join(os.tmpdir(), "mgl-paired-client-"),
          );
          type Paired = Claim & { apiUrl: string; revoked?: boolean };
          const bridgeSource = path.resolve(
            __dirname,
            "../../../../../../packages/pos-bridge/src",
          );
          const { pairBridge, readBridgeCredentials } = load(
            path.join(bridgeSource, "bridge-pairing.ts"),
          ) as {
            pairBridge: (directory: string, link: string) => Promise<Paired>;
            readBridgeCredentials: (directory: string) => Paired;
          };
          const { BridgeHeartbeat } = load(
            path.join(bridgeSource, "bridge-heartbeat.ts"),
          ) as {
            BridgeHeartbeat: new (
              directory: string,
              credentials: Paired,
              snapshot: () => {
                terminalConnected: boolean;
                serialPath: string;
                terminalId: string;
                error: null;
                hasUnresolvedOperation: boolean;
              },
            ) => { sendNow: () => Promise<boolean>; isRevoked: () => boolean };
          };
          try {
            const code = await issue(physical.id);
            const paired = await pairBridge(
              directory,
              `${base}/pos/bridge/pair#${code.code}`,
            );
            assert.equal(paired.registerId, physical.id);
            assert.equal(
              readBridgeCredentials(directory).secret,
              paired.secret,
            );
            const heartbeatClient = new BridgeHeartbeat(
              directory,
              paired,
              () => ({
                terminalConnected: true,
                serialPath: "COM7",
                terminalId: "001234",
                error: null,
                hasUnresolvedOperation: false,
              }),
            );
            assert.equal(await heartbeatClient.sendNow(), true);
            const status = await json<{ state: string; serialPath: string }>(
              await call(
                `/admin/pos-registers/${physical.id}/bridge`,
                undefined,
                admin.id,
                "GET",
              ),
            );
            assert.equal(status.state, "CONNECTED");
            assert.equal(status.serialPath, "COM7");
            assert.equal(
              (
                await call(
                  `/admin/pos-registers/${physical.id}/bridge`,
                  undefined,
                  admin.id,
                  "DELETE",
                )
              ).status,
              204,
            );
            assert.equal(await heartbeatClient.sendNow(), false);
            assert.equal(heartbeatClient.isRevoked(), true);
            assert.equal(readBridgeCredentials(directory).revoked, true);
          } finally {
            fs.rmSync(directory, { recursive: true, force: true });
          }
        },
      );
      await t.test(
        "unknown heartbeats serialize with code claims and revocation",
        async () => {
          const race = await prisma.posRegister.create({
            data: {
              organizationId: organization.id,
              branchId: branch.id,
              name: "Race till",
              isActive: true,
              activationStatus: "APPROVED",
            },
          });
          const identity = await json<Claim>(
            await claim((await issue(race.id)).code, "race_device_0123456789"),
          );
          const pendingCode = await issue(race.id);
          const waitForBlocked = async (count: number) => {
            for (let i = 0; i < 100; i += 1) {
              const rows = await prisma.$queryRaw<
                Array<{ count: bigint }>
              >`SELECT count(*)::bigint AS count FROM pg_locks WHERE locktype = 'advisory' AND NOT granted AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`;
              if (Number(rows[0]?.count) >= count) return;
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
            throw new Error(
              "Expected advisory lock contention was not observed",
            );
          };
          for (const operation of ["claim", "revoke"]) {
            await heartbeat(identity, { hasUnresolvedOperation: false });
            let release = () => {};
            let acquired = () => {};
            const held = new Promise<void>((resolve) => {
              acquired = resolve;
            });
            const untilReleased = new Promise<void>((resolve) => {
              release = resolve;
            });
            const blocker = prisma.$transaction(async (tx) => {
              await lockBridgeRegister(tx, race.id);
              acquired();
              await untilReleased;
            });
            await held;
            let report: Promise<Response> | undefined;
            let mutation: Promise<Response> | undefined;
            try {
              report = heartbeat(identity, { hasUnresolvedOperation: true });
              await waitForBlocked(1);
              mutation =
                operation === "claim"
                  ? claim(pendingCode.code, "replacement_device_0123456789")
                  : call(
                      `/admin/pos-registers/${race.id}/bridge`,
                      undefined,
                      admin.id,
                      "DELETE",
                    );
              await waitForBlocked(2);
            } finally {
              release();
              await blocker;
            }
            assert.equal((await report!).status, 200);
            assert.equal((await mutation!).status, 409);
          }
        },
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    }
  },
);
