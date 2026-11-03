import type { Metadata } from "next";
import { BuildingRegister } from "@/features/building/management/BuildingRegister";
export const metadata: Metadata = { title: "Байгууллага бүртгүүлэх" };
export default function RegisterPage() {
  return <BuildingRegister />;
}
