"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "../../atoms/Button";

type PartnerCardProps = {
  title: string;
  href: string;
  MainIcon: React.ElementType;
  FloatingIcon: React.ElementType;
  bgCircle: string;
  floatBg: string;
  floatIconColor: string;
  mainIconColor: string;
  floatPosition: string;
};

export const PartnerCard = ({
  title,
  href,
  MainIcon,
  FloatingIcon,
  bgCircle,
  floatBg,
  floatIconColor,
  mainIconColor,
  floatPosition,
}: PartnerCardProps) => {
  return (
    <div className="bg-[#F8F9FA] rounded-3xl p-8 md:p-10 flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="relative z-10 flex flex-col items-start gap-6">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>

        <Button variant="default" asChild>
          <Link href={href} className="inline-flex items-center gap-2">
            <span>Дэлгэрэнгүй</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
        <div
          className={`absolute inset-0 ${bgCircle} rounded-full scale-75 group-hover:scale-90 transition-transform duration-500`}
        />

        <div
          className={`absolute ${floatPosition} w-12 h-12 ${floatBg} rounded-full flex items-center justify-center animate-bounce`}
        >
          <FloatingIcon className={`w-6 h-6 ${floatIconColor}`} />
        </div>

        <div className="relative z-10 bg-white p-4 rounded-2xl shadow-sm border border-gray-50 group-hover:-translate-y-2 transition-transform duration-300">
          <MainIcon className={`w-12 h-12 ${mainIconColor}`} />
        </div>
      </div>
    </div>
  );
};
