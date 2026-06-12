"use client";

import { useState } from "react";
import { cn } from "../lib";

type MglLoadingScreenProps = {
  label?: string;
  className?: string;
};

const WALKING_DUCK_GIF = "/loaders/walking-duck.gif?v=5";

export function MglLoadingScreen({
  label = "Ачааллаж байна",
  className,
}: MglLoadingScreenProps) {
  return (
    <main
      className={cn(
        "grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_50%_30%,#fff7ed_0%,#ffffff_38%,#f8fafc_100%)] px-6 text-slate-950",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <section className="flex flex-col items-center gap-5 text-center">
        <WalkingDuck />
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-orange-500">
            MGL Store
          </p>
          <p className="mt-2 text-base font-black text-slate-900">{label}</p>
        </div>
        <span className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-200">
          <span className="mgl-loader-bar block h-full w-1/2 rounded-full bg-orange-500" />
        </span>
      </section>
      <style>{`
        @keyframes mglDuckWalk {
          0%, 100% { transform: translate3d(-9px, 0, 0) rotate(-1.4deg); }
          25% { transform: translate3d(-3px, -1px, 0) rotate(1deg); }
          50% { transform: translate3d(8px, 0, 0) rotate(1.4deg); }
          75% { transform: translate3d(2px, -1px, 0) rotate(-0.8deg); }
        }

        @keyframes mglDuckBob {
          0%, 100% { transform: translateY(0) scaleY(1); }
          25%, 75% { transform: translateY(-7px) scaleY(1.015); }
          50% { transform: translateY(0) scaleY(0.985); }
        }

        @keyframes mglDuckHead {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          25% { transform: translateY(-2px) rotate(3deg); }
          50% { transform: translateY(1px) rotate(1deg); }
          75% { transform: translateY(-2px) rotate(-3deg); }
        }

        @keyframes mglDuckBeak {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          25% { transform: rotate(2deg) translateX(1px); }
          75% { transform: rotate(-2deg) translateX(-1px); }
        }

        @keyframes mglDuckWing {
          0%, 100% { transform: rotate(-4deg) translateY(0); }
          25% { transform: rotate(7deg) translateY(-2px); }
          50% { transform: rotate(0deg) translateY(1px); }
          75% { transform: rotate(-9deg) translateY(-1px); }
        }

        @keyframes mglDuckBlink {
          0%, 88%, 100% { transform: scaleY(1); }
          92%, 96% { transform: scaleY(0.12); }
        }

        @keyframes mglDuckLeftLeg {
          0%, 100% { transform: rotate(20deg) translateY(0); }
          25% { transform: rotate(-12deg) translateY(-7px); }
          50% { transform: rotate(-26deg) translateY(0); }
          75% { transform: rotate(8deg) translateY(3px); }
        }

        @keyframes mglDuckRightLeg {
          0%, 100% { transform: rotate(-26deg) translateY(0); }
          25% { transform: rotate(8deg) translateY(3px); }
          50% { transform: rotate(20deg) translateY(0); }
          75% { transform: rotate(-12deg) translateY(-7px); }
        }

        @keyframes mglDuckShadow {
          0%, 100% { transform: translateX(-5px) scaleX(0.8); opacity: 0.2; }
          25%, 75% { transform: translateX(0) scaleX(0.94); opacity: 0.16; }
          50% { transform: translateX(5px) scaleX(1.08); opacity: 0.28; }
        }

        @keyframes mglLoaderBar {
          0% { transform: translateX(-110%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(220%); }
        }

        .mgl-duck-walk {
          animation: mglDuckWalk 1.05s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .mgl-duck-body {
          animation: mglDuckBob 0.52s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .mgl-duck-head {
          animation: mglDuckHead 0.52s ease-in-out infinite;
          transform-origin: 104px 74px;
        }

        .mgl-duck-beak {
          animation: mglDuckBeak 0.52s ease-in-out infinite;
          transform-origin: 118px 91px;
        }

        .mgl-duck-wing {
          animation: mglDuckWing 0.52s ease-in-out infinite;
          transform-origin: 72px 111px;
        }

        .mgl-duck-eye {
          animation: mglDuckBlink 3.4s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .mgl-duck-left-leg {
          animation: mglDuckLeftLeg 0.52s ease-in-out infinite;
          transform-origin: 94px 158px;
        }

        .mgl-duck-right-leg {
          animation: mglDuckRightLeg 0.52s ease-in-out infinite;
          transform-origin: 116px 158px;
        }

        .mgl-duck-shadow {
          animation: mglDuckShadow 0.52s ease-in-out infinite;
          transform-origin: center;
        }

        .mgl-loader-bar {
          animation: mglLoaderBar 1.15s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .mgl-duck-walk,
          .mgl-duck-body,
          .mgl-duck-head,
          .mgl-duck-beak,
          .mgl-duck-wing,
          .mgl-duck-eye,
          .mgl-duck-left-leg,
          .mgl-duck-right-leg,
          .mgl-duck-shadow {
            animation: none;
          }

          .mgl-loader-bar {
            animation: none;
            transform: translateX(50%);
          }
        }
      `}</style>
    </main>
  );
}

export function WalkingDuck() {
  const [gifFailed, setGifFailed] = useState(false);

  if (!gifFailed) {
    return (
      <div className="relative h-40 w-40 overflow-visible">
        <span className="absolute bottom-6 left-1/2 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-950/10 blur-md" />
        <img
          src={WALKING_DUCK_GIF}
          alt="Walking duck loading animation"
          className="relative h-full w-full object-contain drop-shadow-[0_18px_22px_rgba(15,23,42,0.16)]"
          draggable={false}
          onError={() => setGifFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="mgl-duck-walk h-40 w-40 drop-shadow-[0_18px_24px_rgba(15,23,42,0.12)]">
      <svg
        viewBox="0 0 220 220"
        className="h-full w-full"
        role="img"
        aria-label="Walking duck loading animation"
      >
        <ellipse
          className="mgl-duck-shadow"
          cx="110"
          cy="184"
          rx="58"
          ry="13"
          fill="#020617"
        />

        <g className="mgl-duck-right-leg">
          <path
            d="M115 151 C118 160 120 169 123 178"
            fill="none"
            stroke="#f97316"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M122 181 C136 177 148 181 154 188 C141 195 127 194 116 187"
            fill="#f97316"
            stroke="#0f172a"
            strokeLinejoin="round"
            strokeWidth="5"
          />
        </g>

        <g className="mgl-duck-left-leg">
          <path
            d="M95 151 C92 160 90 169 87 178"
            fill="none"
            stroke="#f97316"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M87 181 C72 178 61 182 54 189 C68 195 84 194 96 187"
            fill="#f97316"
            stroke="#0f172a"
            strokeLinejoin="round"
            strokeWidth="5"
          />
        </g>

        <g className="mgl-duck-body">
          <path
            d="M67 79 C57 99 55 131 67 151 C82 178 128 181 151 159 C172 139 169 95 151 63 C132 29 91 27 73 52 C68 59 66 68 67 79Z"
            fill="#ffffff"
            stroke="#0f172a"
            strokeLinejoin="round"
            strokeWidth="7"
          />
          <path
            d="M86 55 C72 78 70 126 88 151 C99 166 121 168 139 158"
            fill="none"
            opacity="0.45"
            stroke="#e2e8f0"
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path
            className="mgl-duck-wing"
            d="M70 91 C55 95 48 108 51 125 C54 145 69 155 87 160 C78 146 75 130 78 115"
            fill="#ffffff"
            stroke="#0f172a"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="7"
          />
          <g className="mgl-duck-wing">
            <path
              d="M62 122 C52 119 47 112 46 103"
              fill="none"
              stroke="#0f172a"
              strokeLinecap="round"
              strokeWidth="6"
            />
            <path
              d="M66 145 C56 143 49 136 47 128"
              fill="none"
              stroke="#0f172a"
              strokeLinecap="round"
              strokeWidth="6"
            />
          </g>

          <g className="mgl-duck-head">
            <path
              d="M83 69 C88 52 105 43 124 50 C138 55 148 68 153 83"
              fill="none"
              stroke="#0f172a"
              strokeLinecap="round"
              strokeWidth="7"
            />
            <g className="mgl-duck-beak">
              <path
                d="M114 88 C136 71 162 67 176 77 C166 92 143 103 119 99 Z"
                fill="#fde047"
                stroke="#0f172a"
                strokeLinejoin="round"
                strokeWidth="5"
              />
              <path
                d="M119 94 C139 91 159 84 173 77"
                fill="none"
                stroke="#0f172a"
                strokeLinecap="round"
                strokeWidth="4"
              />
              <path
                d="M128 89 C139 82 151 78 164 77"
                fill="none"
                opacity="0.55"
                stroke="#ffffff"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </g>
            <circle className="mgl-duck-eye" cx="98" cy="75" r="6" fill="#020617" />
            <circle className="mgl-duck-eye" cx="130" cy="63" r="4" fill="#020617" />
          </g>
        </g>
      </svg>
    </div>
  );
}
