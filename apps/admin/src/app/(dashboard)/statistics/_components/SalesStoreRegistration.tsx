import { StoreInfoGroup, type StoreInfoField } from "./StoreInfoGroup";
import { StoreMapLink } from "./StoreMapLink";
import type { AdminSalesStore } from "@/lib/admin-sales-stores-api";

export function SalesStoreRegistration({ store }: { store: AdminSalesStore }) {
  const vendor = store.vendorOrganization;
  const fields: StoreInfoField[] = [
    ["Байгууллагын нэр", vendor?.name],
    ["Регистр", vendor?.taxId],
    ["Холбоо барих хүн", store.contactName],
    ["Холбоо барих утас", store.contactPhone],
    ["Имэйл", vendor?.email],
    ["Хаяг", store.address],
    [
      "Төрөл",
      vendor?.businessCategory === "market-food-grocery"
        ? "Хүнсний дэлгүүр"
        : vendor?.businessCategory === "other"
          ? "Бусад"
          : vendor?.businessCategory,
    ],
    [
      "Байгууллагын төлөв",
      vendor?.status === "ACTIVE"
        ? "Идэвхтэй"
        : vendor?.status === "PENDING"
          ? "Хүлээгдэж буй"
          : vendor?.status === "SUSPENDED"
            ? "Түр зогсоосон"
            : vendor?.status === "BLOCKED"
              ? "Хаасан"
              : vendor?.status,
    ],
    ["Баталгаажуулалт", vendor?.isVerified ? "Баталгаажсан" : "Баталгаажаагүй"],
    ["Хариуцсан байгууллага", store.organization.name],
    [
      "Хариуцсан ХТ",
      store.representatives
        .map((rep) => `${rep.name}${rep.isActive ? "" : " (идэвхгүй)"}`)
        .join(", "),
    ],
    ["Бүртгэсэн огноо", new Date(store.createdAt).toLocaleString("mn-MN")],
    ["Шинэчилсэн огноо", new Date(store.updatedAt).toLocaleString("mn-MN")],
    ["Нийт айлчлал", String(store.visitCount)],
  ];
  return (
    <div className="space-y-4">
      <StoreInfoGroup
        title="Дэлгүүрийн үндсэн мэдээлэл"
        fields={[
          ...fields,
          ["Бүртгэлийн ID", store.id],
          ["Координат", `${store.latitude}, ${store.longitude}`],
        ]}
      />
      <StoreMapLink latitude={store.latitude} longitude={store.longitude} />
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Хариуцсан ХТ нь одоогийн хуваарилалт. Анх бүртгэсэн ажилтны мэдээлэл
        тусдаа хадгалагдаагүй.
      </p>
    </div>
  );
}
