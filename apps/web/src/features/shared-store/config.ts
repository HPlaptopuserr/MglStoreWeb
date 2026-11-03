import { API } from "@/lib/api";
import type { SharedWarehouse } from "./types";
// This storefront is explicitly for the warehouse requested by the merchant.
export const SHARED_STORE_WAREHOUSE: SharedWarehouse = {
  id: "5dcda21f-f253-4484-90de-e96e5728f383",
  name: "Дундын Дэлгүүр ЭМ ЖИ ЭЛ БМБЧ ТРЕЙД ХХК",
  address:
    "Улаанбаатар, Баянгол дүүрэг · Гэмтлийн эмнэлгийн Сайн ломбардтай автобусны буудлын баруун талд, ТӨГС барилга",
  phone: "95845838",
};
export const SHARED_STORE_API =
  process.env.NEXT_PUBLIC_SHARED_STORE_API_URL?.replace(/\/$/, "") || API;
export const SHARED_STORE_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_SHARED_STORE_CHECKOUT_URL || "";
