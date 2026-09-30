import type { SalesStoreDetailsResponse } from "@/lib/admin-sales-stores-api";
import {
  StoreInfoGroup,
  storeDate,
  enabledLabel,
  type StoreInfoField,
} from "./StoreInfoGroup";
import { StoreProfileImage } from "./StoreProfileImage";

export function SalesStoreProfile({
  details,
}: {
  details: SalesStoreDetailsResponse;
}) {
  const p = details.profile;
  const features: StoreInfoField[] = [
    ["Захиалга", enabledLabel(p.businessOrdersEnabled)],
    ["Бараа материал", enabledLabel(p.businessInventoryEnabled)],
    ["Ирц", enabledLabel(p.businessAttendanceEnabled)],
    ["Гараар ирц бүртгэх", enabledLabel(p.businessAttendanceManualEnabled)],
    [
      "Зөвхөн хуваарилсан дэлгүүрт ажиллах",
      enabledLabel(p.salesRepVendorRestrictionEnabled),
    ],
    ["Ажлын даалгавар", enabledLabel(p.businessTasksEnabled)],
    ["Хүргэлт", enabledLabel(p.businessDeliveryEnabled)],
    ["Дэд домэйн", enabledLabel(p.subdomainEnabled)],
    ["CEO үйлчилгээ", enabledLabel(p.ceoServiceEnabled)],
    ["CEO зөвлөгөөний мэдэгдэл", enabledLabel(p.ceoAdviceNotificationsEnabled)],
    ["Календарын сануулга", enabledLabel(p.ceoCalendarRemindersEnabled)],
    ["Долоо хоногийн тайлан", enabledLabel(p.ceoWeeklyDigestEnabled)],
    ["Эрсдэлийн мэдэгдэл", enabledLabel(p.ceoRiskAlertsEnabled)],
    ["KPI мэдээлэл", enabledLabel(p.ceoKpiInsightsEnabled)],
    ["Шийдвэрийн товч мэдээлэл", enabledLabel(p.ceoDecisionBriefEnabled)],
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <StoreProfileImage src={p.logoUrl} label="Дэлгүүрийн лого" />
        <StoreProfileImage src={p.bannerUrl} label="Дэлгүүрийн баннер" />
      </div>
      <StoreInfoGroup
        title="Танилцуулга ба үйл ажиллагаа"
        fields={[
          ["Товч танилцуулга", p.shortDescription],
          ["Дэлгэрэнгүй танилцуулга", p.description],
          ["Үйл ажиллагаа явуулсан жил", p.operatingYears],
          ["Ажиллах цаг", p.openingHours.join("\n")],
          ["Хүргэлтийн үнэ", p.deliveryPrice],
          ["Хүргэлтийн нөхцөл", p.deliveryText],
          ["Харилцагчийн тоо", p.customerCount],
          ["Үнэлгээ", p.rating],
          ["Үнэлгээний тоо", p.reviewCount],
          ["Борлуулсан тоо", p.soldCount],
        ]}
      />
      <StoreInfoGroup
        title="Байгууллагын бүртгэл"
        fields={[
          ["Байгууллагын ID", p.id],
          ["Дэлгүүрийн хаягийн нэр (slug)", p.slug],
          ["Байгууллагын төрөл", p.type === "VENDOR" ? "Дэлгүүр" : p.type],
          ["Байгууллагын утас", p.phone],
          ["Байгууллагын хаяг", p.address],
          ["Байгууллага үүсгэсэн", storeDate(p.createdAt)],
          ["Байгууллага шинэчилсэн", storeDate(p.updatedAt)],
          ["Ирц баталгаажуулах радиус", `${details.radiusMeters} м`],
          ["Идэвхтэй ажилтны тоо", details.activeMemberCount],
          ["Нийт айлчлал", details.visitCount],
          ["Чанарын шалгалтын тоо", details.inspectionCount],
        ]}
      />
      <StoreInfoGroup
        title="Багц ба эрх"
        fields={[
          ["Багц", p.planType],
          ["Идэвхжүүлсэн", storeDate(p.planActivatedAt)],
          ["Дуусах хугацаа", storeDate(p.planExpiresAt)],
          ["Ажилтны дээд хязгаар", p.maxMembers],
          ["Туршилтын эрх ашигласан", p.trialUsed ? "Тийм" : "Үгүй"],
        ]}
      />
      <StoreInfoGroup
        title="Төлбөрийн холболт"
        fields={[
          ["QPay", enabledLabel(p.qpayEnabled)],
          ["QPay холбосон", storeDate(p.qpayConnectedAt)],
          ["Вэб QPay", enabledLabel(p.webQpayEnabled)],
          ["Вэб QPay холбосон", storeDate(p.webQpayConnectedAt)],
          ["Minu агент", enabledLabel(p.minuAgentEnabled)],
          ["Minu холбосон", storeDate(p.minuAgentConnectedAt)],
        ]}
      />
      <StoreInfoGroup title="Үйлчилгээний тохиргоо" fields={features} />
    </div>
  );
}
