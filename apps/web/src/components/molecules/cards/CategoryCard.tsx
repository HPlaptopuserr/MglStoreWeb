"use client";

import React from "react";
import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  icon: LucideIcon;
  label: string;
  color?: string;
}

export const CategoryCard = ({
  icon: Icon,
  label,
  color = "bg-amber-50 text-amber-500",
}: CategoryCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex flex-col items-center gap-3 p-4 min-w-25 cursor-pointer group"
    >
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 ${color}`}
      >
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <span className="text-sm font-medium text-slate-600 group-hover:text-amber-600 transition-colors">
        {label}
      </span>
    </motion.div>
  );
};
