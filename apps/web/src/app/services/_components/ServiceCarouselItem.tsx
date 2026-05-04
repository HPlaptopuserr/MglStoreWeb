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
      className="shrink-0 w-[76%] sm:w-[42%] md:w-[30%] lg:w-[23.5%] cursor-pointer pt-7"
    >
      <ServiceCard post={post} />
    </div>
  );
}
