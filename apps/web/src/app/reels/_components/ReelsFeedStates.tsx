import { Loader2, Play } from "lucide-react";

export function ReelsLoadingState() {
  return (
    <div className="relative z-10 flex min-h-dvh items-center justify-center">
      <Loader2 className="animate-spin text-orange-500" size={34} />
    </div>
  );
}

type ReelsEmptyStateProps = {
  description?: string;
  title?: string;
};

export function ReelsEmptyState({
  description = "Байгууллага эсвэл бүтээгдэхүүний богино video орсны дараа энд харагдана.",
  title = "Reel одоогоор алга байна",
}: ReelsEmptyStateProps) {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
        <Play className="ml-1 fill-current text-white/80" size={28} />
      </div>
      <p className="mt-4 text-xl font-black">{title}</p>
      <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-white/55">
        {description}
      </p>
    </div>
  );
}
