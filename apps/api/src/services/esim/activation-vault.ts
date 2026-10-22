import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Per-order authenticated encryption; swapping ciphertext between owners fails. */
export class ActivationVault {
  private readonly key: Buffer;
  constructor(key: string) {
    this.key = Buffer.from(key, "base64");
    if (this.key.length !== 32) throw new Error("Invalid eSIM encryption key");
  }
  seal(orderId: string, plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(orderId));
    const data = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      data.toString("base64"),
    ].join(".");
  }
  open(orderId: string, encrypted: string): string {
    const [version, iv, tag, data, extra] = encrypted.split(".");
    if (version !== "v1" || !iv || !tag || !data || extra)
      throw new Error("Invalid activation payload");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(iv, "base64"),
    );
    cipher.setAAD(Buffer.from(orderId));
    cipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      cipher.update(Buffer.from(data, "base64")),
      cipher.final(),
    ]).toString("utf8");
  }
}
