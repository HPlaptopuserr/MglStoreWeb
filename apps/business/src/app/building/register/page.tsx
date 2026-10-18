import type { Metadata } from "next";
import { BuildingRegister } from "@/components/building/manage/BuildingRegister";
export const metadata: Metadata = { title: "Байгууллага бүртгүүлэх" };
export default function RegisterPage() {
  return <BuildingRegister />;
}
