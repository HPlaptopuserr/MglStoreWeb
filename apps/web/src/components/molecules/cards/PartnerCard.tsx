"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../atoms/Button";

type PartnerCardProps = {
  title: string;
  highlight?: string;
  image: string;
  href: string;
};

export const PartnerCard = ({
  title,
  highlight,
  image,
  href,
}: PartnerCardProps) => {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between bg-gray-100 rounded-2xl p-10">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {title} {highlight && <span className="text-black">{highlight}</span>}
        </h3>

        <Button onClick={() => router.push(href)}>Дэлгэрэнгүй →</Button>
      </div>

      <img src={image} alt={title} className="w-24 h-24 object-contain" />
    </div>
  );
};
