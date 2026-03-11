import React from "react";
import { notFound } from "next/navigation";
import { companies } from "@/lib/mock-data";
import { CompanyHero } from "@/components/organisms/home/CompanyHero";
import { CompanySidebar } from "@/components/organisms/home/CompanySidebar";
import { ProductCard } from "@mgl/ui";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchBackendPartner(slugOrId: string) {
  try {
    const res = await fetch("http://localhost:4000/api/partners", { cache: "no-store" });
    if (!res.ok) return null;
    const partners = await res.json();
    const partner = partners.find((p: any) => p.slug === slugOrId || p.id === slugOrId);
    if (!partner) return null;

    // Map backend partner to mock company structure
    return {
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      logo: partner.logoUrl || `https://picsum.photos/seed/${partner.slug || partner.id}/100/100`,
      banner: `https://picsum.photos/seed/banner-${partner.slug || partner.id}/1200/400`,
      description: "Бүртгэлтэй албан ёсны байгууллага.",
      distance: "Тодорхойгүй",
      deliveryTime: "Тодорхойгүй",
      address: partner.address || "Хаяг бүртгэлгүй",
      openingHours: "Цагийн хуваарь бүртгэлгүй",
      isOpen: partner.status === "ACTIVE",
      rating: 5.0,
      category: partner.type,
      categories: [partner.type],
      products: [],
    };
  } catch (error) {
    return null;
  }
}

export default async function CompanyPage({ params }: PageProps) {
  const { id } = await params;

  let company: any = companies.find((c) => c.slug === id);

  if (!company) {
    company = await fetchBackendPartner(id);
  }

  if (!company) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <CompanyHero company={company} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-36 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <CompanySidebar categories={company.categories || []} />
            </div>
          </div>

          <div className="lg:col-span-3">
            {company.products && company.products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {company.products.map((product: any) => (
                  <ProductCard
                    key={product.id}
                    image={product.image}
                    name={product.title}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    category={product.category}
                    tag={product.tag}
                    rating={product.rating}
                    reviews={product.reviews}
                    stock={product.stock}
                    storeName={company.name}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Бүтээгдэхүүн оруулаагүй байна</h3>
                <p className="text-slate-500">Тун удахгүй энэ байгууллагын бараанууд нэмэгдэх болно.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
