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
  selectedAccountId?: string;
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
  defaultAgentCommissionRate: number;
  upgradeModal: {
    eyebrow: string;
    title: string;
    introLabel: string;
    introTitle: string;
    introDescription: string;
    tierEyebrow: string;
    tierTitle: string;
    tierDescription: string;
    swipeHint: string;
    missingPaymentConfigMessage: string;
    phoneRequiredMessage: string;
    addressRequiredMessage: string;
    successTitle: string;
    successDescription: string;
  };
  paymentAccount: PaymentAccount;
  membershipTypes: MembershipType[];
}

export const DEFAULT_CONFIG: AssociationConfig = {
  pageLabel: "БҮРТГЭЛИЙН ХУУДАС",
  pageTitle:
    "Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн\nнэгдсэн холбооны гишүүнчлэл",
  pageSubtitle: "Төлөөлөн удирдах зөвлөл томилох хурлын бүртгэл",
  defaultAgentCommissionRate: 10,
  upgradeModal: {
    eyebrow: "Membership",
    title: "Гишүүнчлэл upgrade хийх",
    introLabel: "Elevate your experience",
    introTitle: "MGL Premium Membership",
    introDescription:
      "Tier болон хугацаагаа сонгоод card дээрх төлөх button-оор QR үүсгэнэ.",
    tierEyebrow: "Tier сонгох",
    tierTitle: "Танд тохирох membership",
    tierDescription: "Хугацаа сонгоод card дээрээс төлнө.",
    swipeHint: "Дараагийн tier-үүдийг хажуу тийш гүйлгэж харна",
    missingPaymentConfigMessage:
      "Холбооны QuickQR данс тохируулагдаагүй байна. Admin дээр merchant code/password хадгална уу.",
    phoneRequiredMessage:
      "Profile дээр утасны дугаараа бөглөсний дараа идэвхжүүлнэ үү.",
    addressRequiredMessage:
      "Profile дээр хаягаа бөглөсний дараа идэвхжүүлнэ үү.",
    successTitle: "Гишүүнчлэлийн хүсэлт илгээгдлээ",
    successDescription: "QuickQR төлбөр амжилттай баталгаажлаа.",
  },
  paymentAccount: {
    selectedAccountId: "",
    bankName: "",
    accountNumber: "",
    accountName: "Монгол эзэнтэй жижиг, дунд бизнес эрхлэгчдийн холбоо",
    description:
      "Гүйлгээний утга дээр овог нэр, утас, сонгосон гишүүнчлэлийн төрлөө бичнэ үү.",
    merchantCode: "",
    username: "",
    password: "",
    bankCode: "",
  },
  membershipTypes: [
    {
      value: "ACTIVE",
      label: "Silver",
      price: "30,000₮ / сар",
      desc: "Стандарт бүтээгдэхүүний хөнгөлөлт\nСтандарт хэрэглэгчийн дэмжлэг\n- Priority хүргэлтийн үйлчилгээ",
      durations: [
        { months: 1, price: 30000, label: "1 сар" },
        { months: 6, price: 180000, label: "6 сарын bundle · 180,000₮" },
      ],
    },
    {
      value: "BRANCH_COUNCIL",
      label: "Gold",
      price: "50,000₮ / сар",
      desc: "10% нэмэлт дэлгүүрийн хөнгөлөлт\nPriority 24/7 support\nҮнэгүй хүргэлтийн эрх\nУлирлын sale-д түрүүлж оролцох",
      durations: [
        { months: 1, price: 50000, label: "1 сар" },
        { months: 6, price: 300000, label: "6 сарын bundle · 300,000₮" },
      ],
    },
    {
      value: "GOVERNING_COUNCIL",
      label: "Platinum",
      price: "100,000₮ / сар",
      desc: "VIP event access\n24/7 personal concierge\nVIP хөнгөлөлт 25% хүртэл\nPremium anniversary gift box",
      durations: [
        { months: 1, price: 100000, label: "1 сар" },
        { months: 6, price: 600000, label: "6 сарын bundle · 600,000₮" },
      ],
    },
  ],
};
