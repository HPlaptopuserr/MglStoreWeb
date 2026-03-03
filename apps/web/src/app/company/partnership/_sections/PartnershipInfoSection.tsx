"use client";

import { Button } from "@/components/atoms/Button";
import { partnershipInfo } from "@/lib/mock-data";
import { useRouter } from "next/navigation";

export default function PartnershipInfoSection() {
  const router = useRouter();
  const { title, description, cta } = partnershipInfo;

  const handleClick = () => {
    const el = document.getElementById("partnership-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push(`${cta.href}#partnership-form`);
    }
  };

  return (
    <div className="h-screen md:h-[600px] bg-[#ffe8c5]">
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
        <div className="flex flex-col justify-center items-start h-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-lg text-gray-700 mb-6 max-w-prose">
            {description}
          </p>
          <div>
            <Button onClick={handleClick}>{cta.label}</Button>
          </div>
        </div>
        <div className="w-full h-full bg-black rounded-xl"></div>
      </div>
    </div>
  );
}
