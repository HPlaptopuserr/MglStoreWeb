import { CARD_COLOR_SCHEMES, type CardColorScheme } from "@mgl/ui";
import { SCHEME_ORDER } from "@/lib/sections/constants";

type Props = {
  cardScheme: CardColorScheme;
  setCardScheme: (scheme: CardColorScheme) => void;
};

export function CardSchemePicker({ cardScheme, setCardScheme }: Props) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
        Өнгөний хоршил
      </label>
      <div className="flex flex-wrap gap-3">
        {SCHEME_ORDER.map((key) => {
          const s = CARD_COLOR_SCHEMES[key];
          const isActive = cardScheme === key;
          return (
            <button
              key={key}
              onClick={() => setCardScheme(key)}
              title={s.label}
              className={`flex flex-col items-center gap-1.5 transition-all ${
                isActive ? "scale-110" : "opacity-60 hover:opacity-100 hover:scale-105"
              }`}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: s.bg,
                  border: isActive ? `3px solid ${s.accent}` : "2px solid #e5e7eb",
                  boxShadow: isActive ? `0 0 0 3px ${s.accent}40` : undefined,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "55%",
                    height: "55%",
                    background: s.accent,
                    borderTopLeftRadius: 5,
                  }}
                />
              </span>
              <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight max-w-[52px]">
                {s.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
