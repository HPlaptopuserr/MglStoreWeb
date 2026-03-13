import { HeroSection } from "@/components/organisms/home/HeroSection";
import Categories from "@/components/organisms/home/CategoryRail";
import { BrandTicker } from "@/components/organisms/home/BrandTicker";
import { ProductGrid } from "@/components/organisms/home/grid/ProductGrid";
import { PartnershipContact } from "@/components/organisms/partnership/PartnershipContact";
import { FeaturedStoresSection } from "@/components/organisms/home/FeaturedStoresSection";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch mb-12">
          <div className="flex-1 min-w-0">
            <HeroSection />
          </div>
        </div>
        <Categories />
        <FeaturedStoresSection />
      </div>

      <div className="container mx-auto px-4 md:px-8 mt-12 mb-20">
        <ProductGrid />
      </div>
      <div className="container mx-auto mt-12 mb-20">
        <PartnershipContact />
      </div>

      <BrandTicker />
    </div>
  );
}
