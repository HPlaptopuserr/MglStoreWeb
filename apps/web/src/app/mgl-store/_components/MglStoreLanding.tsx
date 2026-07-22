"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BenefitsSection } from "./sections/BenefitsSection";
import { HeroSection } from "./sections/HeroSection";
import { PresentationSection } from "./sections/PresentationSection";
import { StandardsSection } from "./sections/StandardsSection";
import { franchiseSlideDeck } from "./mgl-store-content";

export function MglStoreLanding() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const goToPrevious = useCallback(() => {
    setActiveSlideIndex((index) =>
      index === 0 ? franchiseSlideDeck.length - 1 : index - 1,
    );
  }, []);

  const goToNext = useCallback(() => {
    setActiveSlideIndex((index) =>
      index === franchiseSlideDeck.length - 1 ? 0 : index + 1,
    );
  }, []);

  const progressLabel = useMemo(
    () =>
      `${String(activeSlideIndex + 1).padStart(2, "0")} / ${String(franchiseSlideDeck.length).padStart(2, "0")}`,
    [activeSlideIndex],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goToPrevious();
      if (event.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious]);

  return (
    <main className="overflow-hidden bg-[#f7f8fc] text-slate-950">
      <HeroSection />
      <StandardsSection />
      <PresentationSection
        activeSlideIndex={activeSlideIndex}
        progressLabel={progressLabel}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onSelect={setActiveSlideIndex}
      />
      <BenefitsSection />
    </main>
  );
}
