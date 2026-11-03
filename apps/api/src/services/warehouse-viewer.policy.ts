import { parseWarehouseDateRange } from "./warehouse-date-range";
import { normalizePhoneNumber } from "../utils/phone-number";

export class WarehouseViewerError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function parseViewerPhone(value: unknown): string {
  if (typeof value !== "string" || !/^[+\d\s()-]+$/.test(value))
    throw new WarehouseViewerError("Утасны дугаараа зөв оруулна уу.");
  const phone = normalizePhoneNumber(value);
  if (!phone || !/^\d{8}$/.test(phone))
    throw new WarehouseViewerError("8 оронтой утасны дугаар оруулна уу.");
  return phone;
}

export function parseViewerReportQuery(query: Record<string, unknown>) {
  const range = parseWarehouseDateRange(query.from, query.to);
  if (
    (query.from && !range.from) ||
    (query.to && !range.to) ||
    (range.from && range.to && range.from > range.to)
  )
    throw new WarehouseViewerError("Огнооны хязгаараа зөв сонгоно уу.");
  const page = (value: unknown) => {
    if (value === undefined) return 1;
    if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value))
      throw new WarehouseViewerError("Хуудасны дугаар буруу байна.");
    return Number(value);
  };
  return {
    ...range,
    productPage: page(query.productPage),
    salesPage: page(query.salesPage),
    limit: 20,
  };
}
