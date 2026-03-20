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
      className="shrink-0 w-[calc(48%-3px)] sm:w-[calc(26.667%-4px)] md:w-[calc(20%-5px)] cursor-pointer"
    >
      <ServiceCard post={post} />
    </div>
  );
}