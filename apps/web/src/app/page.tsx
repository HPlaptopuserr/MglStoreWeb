import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

      <div className="bg-black text-white my-12">
        <div className="container mx-auto px-4 lg:px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
              MGL Store{" "}
              <span className="text-[#FFAD02]">Мэргэжлийн үйлчилгээ</span>
            </h2>
            <p className="text-white/80 text-base md:text-lg">
              Таны бизнест хэрэгтэй хууль, маркетинг, хүний нөөцийн цогц
              үйлчилгээнүүд. Манай мэргэжилтнүүдийн багцаас өөрт хэрэгтэйг
              сонгон аваарай.
            </p>
          </div>
          <Link
            href="/our-services"
            className="shrink-0 bg-[#FFAD02] text-black px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white transition-colors"
          >
            Үйлчилгээ сонгох <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <div className="bg-black text-white my-12">
        <div className="container mx-auto px-4 lg:px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
              MGL Store <span className="text-[#FFAD02]">Franchise</span>
            </h2>
            <p className="text-white/80 text-base md:text-lg">
              Franchise боломжуудын зураг, үнэ, хураангуйг харж сонгоод
              төлбөрийн дараа PDF файлаа нээгээрэй.
            </p>
          </div>
          <Link
            href="/franchise"
            className="shrink-0 bg-[#FFAD02] text-black px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white transition-colors"
          >
            Franchise сонгох <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <InvestorSection />

      <div className="container mx-auto px-4 lg:px-8">
        <PartnershipContact />
      </div>

      <LegalInfoQrSection />
      <BranchMapSection />
    </main>
  );
}
