"use client";

import { cn } from "../lib";

type MglLoadingScreenProps = {
  label?: string;
  className?: string;
};

type MglCraneLoaderProps = {
  className?: string;
};

export function MglLoadingScreen({
  label = "Ачааллаж байна",
  className,
}: MglLoadingScreenProps) {
  return (
    <main
      className={cn("mgl-loading-screen", className)}
      aria-label={label}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <MglCraneLoader />
      <style>{`
        .mgl-loading-screen {
          position: fixed;
          inset: 0;
          z-index: 2147483646;
          display: grid;
          min-height: 100dvh;
          place-items: center;
          padding: 24px;
          color: #020617;
          background: radial-gradient(
            circle at 50% 43%,
            #ffffff 0%,
            #fbfcfe 58%,
            #f4f7fb 100%
          );
        }
      `}</style>
    </main>
  );
}

export function MglCraneLoader({ className }: MglCraneLoaderProps) {
  return (
    <div
      className={cn("mgl-crane-loader", className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 360 188"
        className="mgl-crane-loader-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mgl-product-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fb923c" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="mgl-carton-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>

        <path
          d="M32 27H328"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="2.5 3.5"
        />
        <path
          d="M32 30H328"
          stroke="#e2e8f0"
          strokeWidth="1"
          strokeDasharray="1 5"
        />

        <g className="mgl-crane-secondary">
          <path
            d="M272 28L280 19L288 28L280 37L272 28Z"
            fill="#fff"
            stroke="#334155"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M275 24H285"
            stroke="#334155"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M280 37V47"
            stroke="#64748b"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M276 48C276 53 284 53 284 48"
            stroke="#334155"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        <g className="mgl-crane-main">
          <path
            d="M171 28L180 18L189 28L180 38L171 28Z"
            fill="#fff"
            stroke="#334155"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path
            d="M175 23H185"
            stroke="#334155"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            className="mgl-crane-cable"
            d="M180 37V67"
            stroke="#64748b"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <g className="mgl-crane-hook">
            <path
              d="M176 66C176 72 184 72 184 66"
              stroke="#334155"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <g className="mgl-product">
              <rect
                x="171"
                y="74"
                width="18"
                height="18"
                rx="1.5"
                fill="url(#mgl-product-fill)"
              />
              <path d="M171 80H189" stroke="#fed7aa" strokeWidth="1.2" />
              <path d="M180 74V92" stroke="#fdba74" strokeWidth="1.2" />
            </g>
          </g>
        </g>

        <path
          d="M24 147H336"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          className="mgl-conveyor-belt"
          d="M29 151H331"
          stroke="#64748b"
          strokeWidth="1.6"
          strokeDasharray="10 10"
          strokeLinecap="round"
        />
        <g fill="#fff" stroke="#94a3b8" strokeWidth="1.4">
          <circle cx="50" cy="151" r="4" />
          <circle cx="82" cy="151" r="4" />
          <circle cx="114" cy="151" r="4" />
          <circle cx="146" cy="151" r="4" />
          <circle cx="178" cy="151" r="4" />
          <circle cx="210" cy="151" r="4" />
          <circle cx="242" cy="151" r="4" />
          <circle cx="274" cy="151" r="4" />
          <circle cx="306" cy="151" r="4" />
        </g>

        <g className="mgl-carton-flow">
          <g className="mgl-carton-bounce">
            <g className="mgl-carton-open-flaps">
              <path
                d="M154 113L145 100H171L180 113H154Z"
                fill="#fff"
                stroke="#334155"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M180 113L189 100H215L206 113H180Z"
                fill="#f8fafc"
                stroke="#334155"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </g>

            <path
              className="mgl-carton-closed-top"
              d="M154 113L164 105H208L198 113H154Z"
              fill="#fff"
              stroke="#334155"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            <path
              d="M154 113H198V146H154V113Z"
              fill="url(#mgl-carton-fill)"
              stroke="#334155"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            <path
              className="mgl-carton-open-side"
              d="M198 113L208 120V143L198 146V113Z"
              fill="#e2e8f0"
              stroke="#334155"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            <path
              className="mgl-carton-closed-side"
              d="M198 113L208 105V138L198 146V113Z"
              fill="#e2e8f0"
              stroke="#334155"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            <path
              d="M160 121H192"
              stroke="#e2e8f0"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <g className="mgl-shipping-label">
              <rect x="165" y="124" width="21" height="12" rx="1" fill="#f97316" />
              <path d="M169 128H182M169 132H178" stroke="#fff" strokeWidth="1.2" />
            </g>
          </g>
        </g>
      </svg>

      <span className="mgl-crane-loader-word">Loading</span>

      <style>{`
        .mgl-crane-loader {
          --mgl-pack-cycle: 1.25s;
          display: flex;
          width: 100%;
          max-width: 352px;
          flex-direction: column;
          align-items: center;
        }

        .mgl-crane-loader-svg {
          display: block;
          width: 100%;
          height: auto;
          overflow: visible;
        }

        .mgl-crane-loader-word {
          margin-top: -2px;
          color: #334155;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.46em;
          line-height: 1.25;
          text-transform: uppercase;
        }

        @keyframes mglCartonFlow {
          0% {
            opacity: 0;
            transform: translateX(-132px);
          }
          4% {
            opacity: 1;
            transform: translateX(-132px);
          }
          20%, 61% {
            opacity: 1;
            transform: translateX(0);
          }
          84% {
            opacity: 1;
            transform: translateX(132px);
          }
          90% {
            opacity: 0;
            transform: translateX(164px);
          }
          91% {
            opacity: 0;
            transform: translateX(-132px);
          }
          96%, 100% {
            opacity: 1;
            transform: translateX(-132px);
          }
        }

        @keyframes mglCartonBounce {
          0%, 17%, 23%, 49%, 61%, 66%, 72%, 78%, 84%, 100% {
            transform: translateY(0) scaleY(1);
          }
          20% {
            transform: translateY(-3px) scaleY(1);
          }
          55% {
            transform: translateY(3px) scaleY(0.94);
          }
          69%, 81% {
            transform: translateY(-2px) scaleY(1);
          }
        }

        @keyframes mglCraneLift {
          0%, 23%, 49%, 100% {
            transform: translateY(0);
          }
          34%, 41% {
            transform: translateY(35px);
          }
        }

        @keyframes mglCraneCable {
          0%, 23%, 49%, 100% {
            transform: scaleY(1);
          }
          34%, 41% {
            transform: scaleY(2.18);
          }
        }

        @keyframes mglProductVisibility {
          0%, 40% {
            opacity: 1;
            transform: scale(1);
          }
          44%, 92% {
            opacity: 0;
            transform: scale(0.72);
          }
          95%, 100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes mglFlapsClose {
          0%, 47% {
            transform: scaleY(1);
          }
          56%, 90% {
            transform: scaleY(0.05);
          }
          92%, 100% {
            transform: scaleY(1);
          }
        }

        @keyframes mglClosedTop {
          0%, 51% {
            opacity: 0;
          }
          58%, 90% {
            opacity: 1;
          }
          92%, 100% {
            opacity: 0;
          }
        }

        @keyframes mglOpenSide {
          0%, 51% {
            opacity: 1;
          }
          58%, 90% {
            opacity: 0;
          }
          92%, 100% {
            opacity: 1;
          }
        }

        @keyframes mglShippingLabel {
          0%, 55% {
            opacity: 0;
            transform: scale(0.7);
          }
          61%, 90% {
            opacity: 1;
            transform: scale(1);
          }
          92%, 100% {
            opacity: 0;
            transform: scale(0.7);
          }
        }

        @keyframes mglCraneSecondary {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-20px);
          }
        }

        @keyframes mglConveyor {
          to {
            stroke-dashoffset: -40;
          }
        }

        .mgl-carton-flow,
        .mgl-carton-bounce,
        .mgl-crane-hook,
        .mgl-crane-cable,
        .mgl-product,
        .mgl-carton-open-flaps,
        .mgl-carton-closed-top,
        .mgl-carton-open-side,
        .mgl-carton-closed-side,
        .mgl-shipping-label,
        .mgl-crane-secondary {
          transform-box: fill-box;
        }

        .mgl-carton-flow {
          animation: mglCartonFlow var(--mgl-pack-cycle) cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        .mgl-carton-bounce {
          animation: mglCartonBounce var(--mgl-pack-cycle) ease-in-out infinite;
          transform-origin: center bottom;
        }

        .mgl-crane-hook {
          animation: mglCraneLift var(--mgl-pack-cycle) cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        .mgl-crane-cable {
          animation: mglCraneCable var(--mgl-pack-cycle) cubic-bezier(0.65, 0, 0.35, 1) infinite;
          transform-origin: center top;
        }

        .mgl-product {
          animation: mglProductVisibility var(--mgl-pack-cycle) ease-in-out infinite;
          transform-origin: center;
        }

        .mgl-carton-open-flaps {
          animation: mglFlapsClose var(--mgl-pack-cycle) cubic-bezier(0.65, 0, 0.35, 1) infinite;
          transform-origin: center bottom;
        }

        .mgl-carton-closed-top {
          animation: mglClosedTop var(--mgl-pack-cycle) ease-in-out infinite;
        }

        .mgl-carton-open-side {
          animation: mglOpenSide var(--mgl-pack-cycle) ease-in-out infinite;
        }

        .mgl-carton-closed-side {
          animation: mglClosedTop var(--mgl-pack-cycle) ease-in-out infinite;
        }

        .mgl-shipping-label {
          animation: mglShippingLabel var(--mgl-pack-cycle) ease-in-out infinite;
          transform-origin: center;
        }

        .mgl-crane-secondary {
          animation: mglCraneSecondary 2.1s ease-in-out infinite;
        }

        .mgl-conveyor-belt {
          animation: mglConveyor 0.7s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .mgl-carton-flow {
            animation: none;
            transform: translateX(0);
          }

          .mgl-carton-bounce,
          .mgl-crane-hook,
          .mgl-crane-cable,
          .mgl-product,
          .mgl-carton-open-flaps,
          .mgl-carton-closed-top,
          .mgl-carton-open-side,
          .mgl-carton-closed-side,
          .mgl-shipping-label,
          .mgl-crane-secondary,
          .mgl-conveyor-belt {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Kept as an alias so existing consumers migrate without a breaking UI package change.
 */
export const WalkingDuck = MglCraneLoader;
