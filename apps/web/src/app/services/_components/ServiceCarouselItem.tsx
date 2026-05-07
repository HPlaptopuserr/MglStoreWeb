"use client";

import React from "react";
import { ServiceCard, ServicePost } from "./ServiceCard";

interface ServiceCarouselItemProps {
  post: ServicePost;
  onClick: () => void;
}

export function ServiceCarouselItem({
  post,
  onClick,
}: ServiceCarouselItemProps) {
  return (
    <div
      onClick={onClick}
      className="w-[78%] shrink-0 cursor-pointer sm:w-[44%] md:w-[30%] lg:w-[23.5%]"
    >
      <ServiceCard post={post} />
    </div>
  );
}
