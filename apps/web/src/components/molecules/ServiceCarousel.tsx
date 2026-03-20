"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { CarouselArrowButton } from "./CarouselArrowButton";
import { ServiceCarouselItem } from "./ServiceCarouselItem";
import { ServicePost } from "./ServiceCard";

interface ServiceCarouselProps {
  posts: ServicePost[];
  onSelect: (id: string) => void;
  onProgressChange?: (value: number) => void;
}

export function ServiceCarousel({
  posts,
  onSelect,
  onProgressChange,
}: ServiceCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);

    const progress =
      scrollWidth > clientWidth
        ? scrollLeft / (scrollWidth - clientWidth)
        : 0;

    onProgressChange?.(progress);
  }, [onProgressChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, posts]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    const cardWidth = el.querySelector("div")?.offsetWidth ?? 280;

    el.scrollBy({
      left: direction === "left" ? -(cardWidth * 4) : cardWidth * 4,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative group/carousel">
      {canScrollLeft && (
        <CarouselArrowButton
          direction="left"
          onClick={() => scroll("left")}
        />
      )}

      {canScrollRight && (
        <CarouselArrowButton
          direction="right"
          onClick={() => scroll("right")}
        />
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
      >
        {posts.map((post) => (
          <ServiceCarouselItem
            key={post.id}
            post={post}
            onClick={() => onSelect(post.id)}
          />
        ))}
      </div>
    </div>
  );
}