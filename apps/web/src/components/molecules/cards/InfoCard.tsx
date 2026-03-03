"use client";

import React from "react";
import Image from "next/image";

export interface InfoCardProps {
  title: string;
  description: string;
  image: string;
}

export const InfoCard = ({ title, description, image }: InfoCardProps) => {
  return (
    <div className="flex flex-col items-center bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 w-full h-full border border-gray-100">
      <div className="text-left w-full mb-6 flex-1">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 leading-tight">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
          {description}
        </p>
      </div>
      <div className="relative w-48 h-48 mt-auto rounded-full bg-slate-50 overflow-hidden flex-shrink-0 flex items-center justify-center p-2 border-4 border-slate-50 shadow-inner">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
        />
      </div>
    </div>
  );
};
