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

export interface PaymentAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  description: string;
  merchantCode: string;
  username: string;
  password: string;
  bankCode: string;
}

export interface AssociationConfig {
  pageTitle: string;
  pageSubtitle: string;
  pageLabel: string;
  paymentAccount: PaymentAccount;
  membershipTypes: MembershipType[];
}

export const DEFAULT_CONFIG: AssociationConfig = {
  pageLabel: "БҮРТГЭЛИЙН ХУУДАС",
  pageTitle: "Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн\nнэгдсэн холбооны гишүүнчлэл",
  pageSubtitle: "Төлөөлөн удирдах зөвлөл томилох хурлын бүртгэл",
  paymentAccount: {
    bankName: "",
    accountNumber: "",
    accountName: "Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн холбоо",
    description: "Гүйлгээний утга дээр овог нэр, утас, сонгосон гишүүнчлэлийн төрлөө бичнэ үү.",
    merchantCode: "",
    username: "",
    password: "",
    bankCode: "",
  },
  membershipTypes: [
    {
      value: "ACTIVE",
      label: "Гишүүнчлэл",
      price: "30,000₮ / сар",
      desc: "Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн холбооны гишүүнчлэл",
      durations: [
        { months: 1, price: 30000, label: "1 Сар – 30,000₮" },
        { months: 6, price: 180000, label: "6 Сар – 180,000₮" },
      ],
    },
  ],
};
