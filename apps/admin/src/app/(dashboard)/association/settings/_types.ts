export interface Duration {
  months: number | null;
  price: number;
  label: string;
}

export interface MembershipType {
  value: string;
  label: string;
  price: string;
  desc: string;
  durations: Duration[];
}

export interface AssociationConfig {
  pageTitle: string;
  pageSubtitle: string;
  pageLabel: string;
  membershipTypes: MembershipType[];
}

export const DEFAULT_CONFIG: AssociationConfig = {
  pageLabel: "БҮРТГЭЛИЙН ХУУДАС",
  pageTitle: "Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн\nнэгдсэн холбооны гишүүнчлэл",
  pageSubtitle: "Төлөөлөн удирдах зөвлөл томилох хурлын бүртгэл",
  membershipTypes: [
    {
      value: "BASIC",
      label: "А. Энгийн гишүүн",
      price: "0₮",
      desc: "Уулзалт, сургалтын мэдээлэл авах, хуваалцах",
      durations: [],
    },
    {
      value: "ACTIVE",
      label: "В. Идэвхтэй гишүүн",
      price: "60,000–180,000₮",
      desc: "Сургалтад 50% хөнгөлөлт, 5 бараа байршуулах",
      durations: [
        { months: 1, price: 60000, label: "1 Сар – 60,000₮" },
        { months: 3, price: 120000, label: "3 Сар – 120,000₮" },
        { months: 6, price: 180000, label: "6 Сар – 180,000₮" },
      ],
    },
    {
      value: "BRANCH_COUNCIL",
      label: "С. Салбарын төлөөлөн удирдах гишүүн",
      price: "360,000–600,000₮",
      desc: "Идэвхтэй эрх + 10 бараа, төсөл удирдах",
      durations: [
        { months: 3, price: 360000, label: "3 Сар – 360,000₮" },
        { months: 6, price: 600000, label: "6 Сар – 600,000₮" },
      ],
    },
    {
      value: "GOVERNING_COUNCIL",
      label: "D. Төлөөлөн удирдах",
      price: "1,800,000–3,000,000₮",
      desc: "Бүх эрх + тендер, 20 бараа",
      durations: [
        { months: 6, price: 1800000, label: "6 Сар – 1,800,000₮" },
        { months: 12, price: 3000000, label: "12 Сар – 3,000,000₮" },
      ],
    },
  ],
};
