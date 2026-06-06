import {
  Building2,
  ChartNoAxesCombined,
  LucideIcon,
  PackageSearch,
  Route,
  ShieldCheck,
  Store,
} from "lucide-react";

export interface NetworkCompany {
  id: string;
  name: string;
  label: string;
  description: string;
  metric: string;
  tone: string;
  icon: LucideIcon;
}

export const NETWORK_COMPANIES: NetworkCompany[] = [
  {
    id: "mgl-store",
    name: "MGL Store",
    label: "Marketplace",
    description:
      "Бараа, үйлчилгээ, байгууллага, төлбөр, захиалгыг нэг дор холбосон үндсэн худалдааны платформ.",
    metric: "Нэг дэлгүүр",
    tone: "from-amber-400 via-orange-500 to-red-500",
    icon: Store,
  },
  {
    id: "mgl-business",
    name: "MGL Business",
    label: "B2B network",
    description:
      "Түнш байгууллагуудын профайл, гэрээ, үйлчилгээний хүсэлт, борлуулалтын сувгийг нэгтгэнэ.",
    metric: "300+ түнш",
    tone: "from-sky-400 via-blue-500 to-indigo-600",
    icon: Building2,
  },
  {
    id: "mgl-logistics",
    name: "MGL Logistics",
    label: "Operations",
    description:
      "Хүргэлт, агуулах, захиалгын хөдөлгөөн, салбар хоорондын үйл ажиллагааг зохицуулах сүлжээ.",
    metric: "Хот дотор",
    tone: "from-emerald-400 via-teal-500 to-cyan-600",
    icon: Route,
  },
  {
    id: "mgl-finance",
    name: "MGL Finance",
    label: "Payments",
    description:
      "QPay, гэрээний төлбөр, байгууллагын тооцоо, санхүүгийн тайлангийн урсгалыг дэмжинэ.",
    metric: "Баталгаат",
    tone: "from-violet-400 via-purple-500 to-fuchsia-600",
    icon: ShieldCheck,
  },
  {
    id: "mgl-growth",
    name: "MGL Growth",
    label: "Investment",
    description:
      "Өсөлтийн стратеги, хөрөнгө оруулалт, шинэ төсөл, бүтээгдэхүүний хөгжүүлэлтийг дэмждэг хэсэг.",
    metric: "Шинэ төсөл",
    tone: "from-rose-400 via-pink-500 to-orange-500",
    icon: ChartNoAxesCombined,
  },
  {
    id: "mgl-supply",
    name: "MGL Supply",
    label: "Supply chain",
    description:
      "Нийлүүлэлт, барааны бүртгэл, vendor inventory, бөөний урсгалын мэдээллийг нэгтгэнэ.",
    metric: "Supply",
    tone: "from-lime-400 via-green-500 to-emerald-600",
    icon: PackageSearch,
  },
];
