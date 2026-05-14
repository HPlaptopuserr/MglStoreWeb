import { HeroSection } from "@/components/organisms/home/HeroSection";
import Categories from "@/components/organisms/home/CategoryRail";
import { LocationRail } from "@/components/organisms/home/LocationRail";
import { BrandTicker } from "@/components/organisms/home/BrandTicker";
import { ProductGrid } from "@/components/organisms/home/grid/ProductGrid";
import { ServiceGrid } from "@/app/services/_components/ServiceGrid";
import { PartnershipContact } from "@/components/organisms/partnership/PartnershipContact";
import { FeaturedStoresSection } from "@/components/organisms/home/FeaturedStoresSection";
import { InvestorSection } from "@/components/organisms/home/InvestorSection";
import { PromoBanner } from "@/components/organisms/home/PromoBanner";
import { BranchMapSection } from "@/components/organisms/home/BranchMapSection";
import { LegalInfoQrSection } from "@/components/organisms/home/LegalInfoQrSection";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="bg-white">
        <div className="container mx-auto px-4 md:px-6 pt-4 pb-6 space-y-4">
          <HeroSection />
          <PromoBanner />
        </div>
      </div>
      <BrandTicker />
      <FeaturedStoresSection />
      <Categories />
      <LocationRail />
      <ProductGrid />
      <ServiceGrid />
        <InvestorSection />

      <div className="container mx-auto px-4 lg:px-8">
        <PartnershipContact />
      </div>

      <LegalInfoQrSection />
      <BranchMapSection />
    </main>
  );
}
