"use client";
import React from "react";
import { Sidebar } from "@/components/organisms/home/Sidebar";
import { PromoBanner } from "@/components/molecules/PromoBanner";
import { CategorySearch } from "./CategorySearch";

export const HeroSection = () => {
  return (
    <section className="flex gap-4 md:gap-6 overflow-hidden h-[calc(100vh-150px)] min-h-[600px] w-full container mx-auto px-4 mt-4">
      <Sidebar />
      <div className="flex flex-col w-full min-w-0 h-full">
        <CategorySearch />
        <div className="flex-1 min-h-0 mt-4 h-full rounded-2xl overflow-hidden">
          <PromoBanner />
        </div>
      </div>
    </section>
  );
};
