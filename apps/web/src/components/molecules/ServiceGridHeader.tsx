"use client";

import React from "react";
import Link from "next/link";

export function ServiceGridHeader() {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-base font-bold text-slate-900">Үйлчилгээнүүд</h2>
      <Link
        href="/services"
        className="text-xs font-medium text-slate-500 hover:text-black flex items-center gap-1"
      >
        Бүгд <span>›</span>
      </Link>
    </div>
  );
}