import React from "react";
import { notFound } from "next/navigation";
import { companies } from "@/lib/mock-data";
import { Header } from "@/components/organisms/layouts/Header";
import { Footer } from "@/components/organisms/layouts/Footer";
import { CompanyHero } from "@/components/organisms/home/CompanyHero";
import { CompanySidebar } from "@/components/organisms/home/CompanySidebar";
import { ProductCard } from "@/components/molecules/cards/ProductCard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyPage({ params }: PageProps) {
  const { id } = await params;
  const company = companies.find((c) => c.slug === id);

  if (!company) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <CompanyHero company={company} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <CompanySidebar categories={company.categories} />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {company.products.map((product) => (
                <ProductCard
                  key={product.id}
                  title={product.title}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  image={product.image}
                  tag={product.tag}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
