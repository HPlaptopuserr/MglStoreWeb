export class StocktakeRequestError extends Error {
  readonly changedLineIds: string[] | null;
  readonly addedProductCount: number;

  constructor(payload: unknown) {
    const data = payload && typeof payload === "object" ? payload : {};
    super(
      "message" in data && typeof data.message === "string"
        ? data.message
        : "Сервертэй холбогдож чадсангүй",
    );
    this.addedProductCount =
      "addedProductCount" in data &&
      typeof data.addedProductCount === "number" &&
      Number.isInteger(data.addedProductCount) &&
      data.addedProductCount >= 0
        ? data.addedProductCount
        : 0;
    this.changedLineIds =
      "code" in data &&
      data.code === "STOCKTAKE_STOCK_CHANGED" &&
      "changedLineIds" in data &&
      Array.isArray(data.changedLineIds) &&
      data.changedLineIds.every((id: unknown) => typeof id === "string")
        ? data.changedLineIds
        : null;
  }
}
