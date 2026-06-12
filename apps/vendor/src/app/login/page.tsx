import VendorLoginHero from "@/components/login/VendorLoginHero";
import VendorLoginPanel from "@/components/login/VendorLoginPanel";

export default function VendorLoginPage() {
  return (
    <main className="flex min-h-screen bg-slate-50">
      <VendorLoginHero />
      <VendorLoginPanel />
    </main>
  );
}
