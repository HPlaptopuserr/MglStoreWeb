import React from "react";
import type { LucideIcon } from "lucide-react";
import { Heading, Text } from "@mgl/ui";

interface InfoCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export const PartnershipWorkInfoCard: React.FC<InfoCardProps> = ({
  icon: Icon,
  title,
  description,
  className = "",
}) => {
  return (
    <div
      className={`bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1 group ${className}`}
    >
      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#FFB700] transition-colors duration-300">
        <Icon className="w-6 h-6 text-[#FFB700] group-hover:text-white transition-colors duration-300" />
      </div>

      <Heading level={4} className="mb-3">
        {title}
      </Heading>

      <Text color="muted" size="sm">
        {description}
      </Text>
    </div>
  );
};
