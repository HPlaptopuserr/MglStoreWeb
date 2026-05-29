import type { BankAccount } from "./types";

export const BANK_OPTIONS = [
  { code: "050000", name: "Хаан банк" },
  { code: "150000", name: "Голомт банк" },
  { code: "040000", name: "TDB (Худалдаа Хөгжлийн банк)" },
  { code: "020000", name: "Капитал банк" },
  { code: "320000", name: "ХасБанк" },
  { code: "340000", name: "Улсын банк" },
  { code: "010000", name: "Төрийн банк" },
  { code: "300000", name: "Капитрон банк" },
  { code: "190000", name: "Транс банк" },
  { code: "060000", name: "Ариг банк" },
  { code: "290000", name: "Богд банк" },
  { code: "210000", name: "Нэшнл Инвестмент банк" },
  { code: "990000", name: "Мобифинанс" },
];

export const DEFAULT_BANK_ACCOUNT: BankAccount = {
  account_bank_code: "050000",
  account_number: "",
  account_name: "",
  is_default: true,
};

export const merchantInputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30 focus:border-[#5B4CFF]";
