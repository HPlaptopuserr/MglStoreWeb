import crypto from "node:crypto";
import { postJson } from "./bridge-http";
import {
  markBridgeRevokedIfCurrent,
  type BridgeCredentials,
} from "./bridge-pairing";

export type BridgeHealthSnapshot = {
  terminalConnected: boolean;
  serialPath: string | null;
  terminalId: string | null;
  error: string | null;
  hasUnresolvedOperation: boolean;
};

export class BridgeHeartbeat {
  private inFlight = false;
  private revoked: boolean;
  private timers: Array<NodeJS.Timeout> = [];

  constructor(
    private readonly directory: string,
    private readonly credentials: BridgeCredentials,
    private readonly snapshot: () => BridgeHealthSnapshot,
    private readonly bridgeVersion = "1.0.0",
  ) {
    this.revoked = credentials.revoked === true;
  }

  isRevoked() {
    return this.revoked;
  }

  start() {
    this.timers.push(
      setTimeout(() => {
        void this.sendNow();
      }, 5_000),
    );
    this.timers.push(
      setInterval(() => {
        void this.sendNow();
      }, 60_000),
    );
  }

  stop() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers = [];
  }

  async sendNow(): Promise<boolean> {
    if (this.inFlight || this.revoked) return false;
    this.inFlight = true;
    try {
      const body = JSON.stringify({
        bindingId: this.credentials.bindingId,
        deviceId: this.credentials.deviceId,
        timestamp: Date.now(),
        ...this.snapshot(),
        bridgeVersion: this.bridgeVersion,
      });
      const signature = crypto
        .createHmac("sha256", this.credentials.secret)
        .update(body)
        .digest("hex");
      const response = await postJson(
        `${this.credentials.apiUrl}/pos/bridge/heartbeat`,
        { body, signature },
      );
      if (response.status === 401) {
        this.revoked = true;
        // Persist revocation so a restart cannot resume financial dispatch with an old key.
        markBridgeRevokedIfCurrent(this.directory, this.credentials);
        console.warn(
          "[bridge] Pairing was revoked. Reconnect from Admin before taking another payment.",
        );
      }
      return response.status === 200;
    } catch {
      // A network outage is not revocation and must not delete local payment evidence.
      return false;
    } finally {
      this.inFlight = false;
    }
  }
}
