import { object, requestJson, type Fetcher } from "./supplier-http";

export class AccessRejected extends Error {
  constructor(readonly code: string) {
    super("eSIM supplier rejected request");
  }
}
export interface IssuedProfile {
  activationCode: string;
  iccid: string;
  esimTranNo: string;
  supplierStatus: string;
  installationStatus: string;
}
export interface EsimFulfillment {
  balance(): Promise<number>;
  order(
    transactionId: string,
    packageId: string,
    price: number,
  ): Promise<string>;
  profile(orderNo: string): Promise<IssuedProfile | null>;
}

export class AccessFulfillment implements EsimFulfillment {
  constructor(
    private readonly key: string,
    private readonly fetcher: Fetcher = fetch,
  ) {
    if (!key.trim()) throw new Error("Missing eSIM Access credential");
  }
  private async post(
    path: string,
    body: object,
  ): Promise<Record<string, unknown>> {
    const response = object(
      await requestJson(
        this.fetcher,
        `https://api.esimaccess.com/api/v1/open/${path}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "RT-AccessCode": this.key,
          },
          body: JSON.stringify(body),
        },
      ),
    );
    if (response.success !== true) {
      const code = String(response.errorCode ?? "unknown");
      throw new AccessRejected(/^\d{6}$/.test(code) ? code : "unknown");
    }
    return object(response.obj);
  }
  async balance(): Promise<number> {
    const result = await this.post("balance/query", {});
    if (
      typeof result.balance !== "number" ||
      !Number.isSafeInteger(result.balance) ||
      result.balance < 0
    )
      throw new Error("Invalid supplier balance");
    return result.balance;
  }
  async order(
    transactionId: string,
    packageId: string,
    price: number,
  ): Promise<string> {
    const result = await this.post("esim/order", {
      transactionId,
      amount: price,
      packageInfoList: [{ slug: packageId, count: 1, price }],
    });
    return text(result.orderNo);
  }
  async profile(orderNo: string): Promise<IssuedProfile | null> {
    let result: Record<string, unknown>;
    try {
      result = await this.post("esim/query", {
        orderNo,
        pager: { pageNum: 1, pageSize: 5 },
      });
    } catch (error) {
      if (error instanceof AccessRejected && error.code === "200010")
        return null;
      throw error;
    }
    if (!Array.isArray(result.esimList))
      throw new Error("Invalid profile response");
    if (result.esimList.length === 0) return null;
    if (result.esimList.length !== 1)
      throw new Error("Unexpected profile count");
    const profile = object(result.esimList[0]);
    if (profile.orderNo !== orderNo)
      throw new Error("Profile ownership mismatch");
    const activationCode = text(profile.ac);
    if (!/^LPA:1\$[^$\s]+\$[^$\s]+$/.test(activationCode))
      throw new Error("Invalid activation code");
    return {
      activationCode,
      iccid: text(profile.iccid),
      esimTranNo: text(profile.esimTranNo),
      supplierStatus: text(profile.esimStatus),
      installationStatus: text(profile.smdpStatus),
    };
  }
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Invalid supplier response");
  return value;
}
