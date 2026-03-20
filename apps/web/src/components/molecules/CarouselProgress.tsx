"use client";

interface Props {
  progress: number;
}

export const CarouselProgress = ({ progress }: Props) => {
  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="h-0.75 bg-gray-200 relative max-w-full">
        <div
          className="absolute top-0 left-0 h-full bg-orange-500 transition-all duration-300"
          style={{
            width: "25%",
            left: `${progress * 75}%`,
          }}
        />
      </div>
    </div>
  );
};