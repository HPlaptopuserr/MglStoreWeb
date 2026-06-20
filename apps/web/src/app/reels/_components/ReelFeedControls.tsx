import { ChevronDown, ChevronUp } from "lucide-react";

type DesktopStepControlsProps = {
  activeIndex: number;
  itemCount: number;
  onStep: (index: number) => void;
};

export function DesktopStepControls({
  activeIndex,
  itemCount,
  onStep,
}: DesktopStepControlsProps) {
  return (
    <div className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
      <button
        type="button"
        disabled={activeIndex === 0}
        onClick={() => onStep(activeIndex - 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/10 backdrop-blur-xl transition hover:bg-white hover:text-black disabled:opacity-30"
        aria-label="Өмнөх reel"
      >
        <ChevronUp size={20} />
      </button>
      <button
        type="button"
        disabled={activeIndex === itemCount - 1}
        onClick={() => onStep(activeIndex + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/10 backdrop-blur-xl transition hover:bg-white hover:text-black disabled:opacity-30"
        aria-label="Дараах reel"
      >
        <ChevronDown size={20} />
      </button>
    </div>
  );
}
