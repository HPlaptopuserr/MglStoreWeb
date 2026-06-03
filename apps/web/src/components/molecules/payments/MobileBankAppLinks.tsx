"use client";

import { useMemo, useState } from "react";
import { Smartphone } from "lucide-react";

export type PaymentDeepLink = {
  name?: string;
  description?: string;
  logo?: string;
  link?: string;
};

type MobileBankAppLinksProps = {
  links?: PaymentDeepLink[];
  maxItems?: number;
  title?: string;
  variant?: "dark" | "light";
};

const LOCAL_APP_LOGOS = [
  {
    src: "/payment-apps/khan-bank.png",
    patterns: ["khan bank", "khan", "хаан банк", "хаан"],
  },
  {
    src: "/payment-apps/state-bank.png",
    patterns: ["state bank", "statebank", "төрийн банк", "төрийн"],
  },
  {
    src: "/payment-apps/xac-bank.png",
    patterns: [
      "xac bank",
      "xac",
      "khas bank",
      "khas",
      "хас банк",
      "хасбанк",
      "хас",
    ],
  },
  {
    src: "/payment-apps/tdb.png",
    patterns: [
      "trade and development",
      "tdb online",
      "tdb",
      "худалдаа хөгжлийн",
      "худалдаа",
    ],
  },
  {
    src: "/payment-apps/social-pay.png",
    patterns: ["social pay", "socialpay"],
  },
  {
    src: "/payment-apps/most-money.png",
    patterns: ["most money", "mostmoney", "most"],
  },
  {
    src: "/payment-apps/national-investment-bank.png",
    patterns: [
      "national investment bank",
      "national investment",
      "investment bank",
      "nib",
      "үндэсний хөрөнгө оруулалтын банк",
      "үндэсний хөрөнгө",
    ],
  },
  {
    src: "/payment-apps/chinggis-khaan-bank.png",
    patterns: [
      "chinggis khaan",
      "chinggis",
      "chingis",
      "чингис хаан",
      "чингис",
    ],
  },
  {
    src: "/payment-apps/capitron-bank.png",
    patterns: ["capitron bank", "capitron", "капитрон банк", "капитрон"],
  },
  {
    src: "/payment-apps/bogd-bank.png",
    patterns: ["bogd bank", "bogd", "богд банк", "богд"],
  },
  {
    src: "/payment-apps/toki.png",
    patterns: ["toki app", "toki pay", "toki"],
  },
  {
    src: "/payment-apps/arig-bank.png",
    patterns: ["arig bank", "arig", "ариг банк", "ариг"],
  },
  {
    src: "/payment-apps/monpay.png",
    patterns: ["monpay", "mon pay", "мон пэй"],
  },
  {
    src: "/payment-apps/hipay.png",
    patterns: ["hipay", "hi pay"],
  },
  {
    src: "/payment-apps/happy-pay.png",
    patterns: ["happy pay mn", "happy pay", "happypay"],
  },
  {
    src: "/payment-apps/sono.png",
    patterns: ["sono"],
  },
  {
    src: "/payment-apps/payon.png",
    patterns: ["payon", "pay on"],
  },
] as const;

function normalizeText(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function findLocalAppLogo(item: PaymentDeepLink & { label?: string }) {
  const haystack = normalizeText(
    [item.name, item.description, item.label, item.link]
      .filter(Boolean)
      .join(" "),
  );

  let bestMatch: { src: string; score: number } | null = null;

  for (const logo of LOCAL_APP_LOGOS) {
    for (const pattern of logo.patterns) {
      const normalizedPattern = normalizeText(pattern);
      if (!normalizedPattern || !haystack.includes(normalizedPattern)) continue;

      if (!bestMatch || normalizedPattern.length > bestMatch.score) {
        bestMatch = { src: logo.src, score: normalizedPattern.length };
      }
    }
  }

  return bestMatch?.src;
}

function looksLikeBase64Image(value: string) {
  if (value.length < 80 || value.includes("/") || value.includes("\\")) {
    return false;
  }

  return /^[A-Za-z0-9+/=]+$/.test(value);
}

function getLogoCandidates(value?: string) {
  const logo = String(value || "").trim();
  if (!logo) return [];

  if (logo.startsWith("data:image")) return [logo];

  if (looksLikeBase64Image(logo)) {
    return [`data:image/png;base64,${logo}`];
  }

  if (logo.startsWith("//")) return [`https:${logo}`];

  if (logo.startsWith("http://")) {
    return [`https://${logo.slice("http://".length)}`, logo];
  }

  if (logo.startsWith("https://")) return [logo];

  if (logo.startsWith("/payment-apps/")) return [logo];

  const path = logo.replace(/^\/+/, "");

  return [
    `https://api.minu.mn/${path}`,
    `https://api.minu.mn/qrpay/${path}`,
    `https://api.minu.mn/deeplink/${path}`,
  ];
}

function BankAppIcon({ logo, isDark }: { logo?: string; isDark: boolean }) {
  const candidates = useMemo(() => getLogoCandidates(logo), [logo]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const src = candidates[candidateIndex];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setCandidateIndex((index) => index + 1)}
        className="h-8 w-8 rounded-lg object-contain"
      />
    );
  }

  return (
    <span
      className={
        isDark
          ? "flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
          : "flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500"
      }
    >
      <Smartphone className="h-5 w-5" />
    </span>
  );
}

export function MobileBankAppLinks({
  links,
  maxItems,
  title = "Утаснаасаа төлөх бол банкны апп сонгоно уу",
  variant = "dark",
}: MobileBankAppLinksProps) {
  const normalizedLinks = Array.isArray(links)
    ? links
        .map((item) => ({
          ...item,
          link: String(item.link || "").trim(),
          label: String(item.description || item.name || "Банкны апп").trim(),
        }))
        .filter((item) => item.link)
    : [];
  const appLinks =
    typeof maxItems === "number" && maxItems > 0
      ? normalizedLinks.slice(0, maxItems)
      : normalizedLinks;

  if (appLinks.length === 0) return null;

  const isDark = variant === "dark";

  return (
    <div
      className={
        isDark
          ? "sm:hidden rounded-2xl border border-white/10 bg-white/[0.06] p-2.5"
          : "sm:hidden rounded-2xl border border-gray-100 bg-gray-50 p-2.5"
      }
    >
      <div
        className={
          isDark
            ? "mb-2.5 flex items-center justify-center gap-2 text-center text-[11px] font-bold leading-tight text-white/70"
            : "mb-2.5 flex items-center justify-center gap-2 text-center text-[11px] font-bold leading-tight text-gray-500"
        }
      >
        <Smartphone className="h-4 w-4 shrink-0" />
        <span>{title}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {appLinks.map((item, index) => (
          <a
            key={`${item.name || item.label}-${index}`}
            href={item.link}
            aria-label={`${item.label} апп-р төлөх`}
            className={
              isDark
                ? "flex min-h-[66px] flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/95 px-2 py-2 text-[#0a2a57] transition hover:bg-blue-50 active:scale-[0.98]"
                : "flex min-h-[66px] flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-100 bg-white px-2 py-2 text-gray-700 transition hover:bg-gray-100 active:scale-[0.98]"
            }
          >
            <BankAppIcon
              logo={findLocalAppLogo(item) || item.logo}
              isDark={isDark}
            />
            <span className="line-clamp-2 text-center text-[9.5px] font-bold leading-tight">
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
