import React from "react";
import { QrGenerator } from "../../atoms/QrGenerator";
import { cn } from "../../lib/utils";

export type CardColorScheme =
  | "default"
  | "dark"
  | "charcoal"
  | "navy"
  | "forest";

export interface CardColorConfig {
  label: string;
  swatch: string;
  bg: string;
  accent: string;
  text: string;
  sub: string;
  line: string;
  backBg: string;
  qrFg: string;
}

export const CARD_COLOR_SCHEMES: Record<CardColorScheme, CardColorConfig> = {
  default: {
    label: "MGL (Үндсэн)",
    swatch: "#FFAD02",
    bg: "#FFFDF8",
    accent: "#E35B0D",
    text: "#1F2937",
    sub: "#64748B",
    line: "#E5E7EB",
    backBg: "#FFF4E6",
    qrFg: "#1F2937",
  },
  dark: {
    label: "Харанхуй",
    swatch: "#111827",
    bg: "#0F172A",
    accent: "#22C55E",
    text: "#F8FAFC",
    sub: "#CBD5E1",
    line: "#334155",
    backBg: "#111827",
    qrFg: "#0F172A",
  },
  charcoal: {
    label: "Хар саарал",
    swatch: "#374151",
    bg: "#1F2937",
    accent: "#FB923C",
    text: "#F9FAFB",
    sub: "#D1D5DB",
    line: "#4B5563",
    backBg: "#111827",
    qrFg: "#111827",
  },
  navy: {
    label: "Хөх (Navy)",
    swatch: "#1E3A8A",
    bg: "#1E3A8A",
    accent: "#FBBF24",
    text: "#FFFFFF",
    sub: "#DBEAFE",
    line: "#2563EB",
    backBg: "#1D4ED8",
    qrFg: "#1E3A8A",
  },
  forest: {
    label: "Ногоон",
    swatch: "#065F46",
    bg: "#065F46",
    accent: "#FBBF24",
    text: "#FFFFFF",
    sub: "#D1FAE5",
    line: "#047857",
    backBg: "#064E3B",
    qrFg: "#065F46",
  },
};

export interface BusinessCardData {
  name: string;
  type?: string;
  category?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  bannerUrl?: string;
  slug: string;
  profileTarget?: string;
  profileId?: string;
}

export interface BusinessCardProps {
  data: BusinessCardData;
  scheme?: CardColorScheme;
  webBaseUrl?: string;
  className?: string;
}

const CARD_W = 420;
const CARD_H = 240;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function normalizeBaseUrl(url?: string): string {
  const raw = (url || "https://mglstore.mn").trim();
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function getProfileUrl(data: BusinessCardData, webBaseUrl?: string): string {
  const target = encodeURIComponent(data.profileTarget || data.slug);
  const oid = data.profileId?.trim();
  const suffix = oid ? `?oid=${encodeURIComponent(oid)}` : "";
  return `${normalizeBaseUrl(webBaseUrl)}/organizations/${target}${suffix}`;
}

function truncateMiddle(value: string, max = 38): string {
  if (value.length <= max) return value;
  const head = value.slice(0, 18);
  const tail = value.slice(-12);
  return `${head}...${tail}`;
}

function frontSurface(c: CardColorConfig): string {
  return `linear-gradient(165deg, ${c.bg} 0%, ${c.bg} 55%, ${c.accent}1F 100%)`;
}

function toTypeMn(value?: string): string {
  if (!value) return "Мэдээлэлгүй";
  const key = value.trim().toUpperCase();
  const map: Record<string, string> = {
    PARTNER: "Түнш",
    VENDOR: "Нийлүүлэгч",
    SUPPLIER: "Нийлүүлэгч",
    COMPANY: "Компани",
    BUSINESS: "Бизнес",
    STORE: "Дэлгүүр",
    ORGANIZATION: "Байгууллага",
  };
  return map[key] || value;
}

export function BusinessCardFront({
  data,
  scheme = "default",
  className,
}: BusinessCardProps) {
  const c = CARD_COLOR_SCHEMES[scheme];
  const initials = getInitials(data.name);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 18,
        border: `1px solid ${c.line}`,
        background: frontSurface(c),
        color: c.text,
        boxSizing: "border-box",
        fontFamily: "var(--font-site, system-ui, sans-serif)",
        boxShadow: "0 16px 34px rgba(15, 23, 42, 0.18)",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: -64,
          top: -54,
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: `${c.accent}24`,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -74,
          bottom: -96,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: `${c.accent}14`,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid ${c.line}`,
                background: `${c.accent}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.logoUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontWeight: 800, fontSize: 15, color: c.accent }}>{initials}</span>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, color: c.sub, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                MGL Дэлгүүр
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 12,
                  color: c.sub,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 200,
                }}
              >
                {data.category || "Бизнес гишүүн"}
              </p>
            </div>
          </div>

          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.06em",
              background: "linear-gradient(90deg, #22C55E, #16A34A)",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            БАТАЛГААЖСАН
          </span>
        </div>

        <div style={{ marginTop: 6 }}>
          <p
            style={{
              margin: 0,
              fontSize: 31,
              lineHeight: 1.08,
              fontWeight: 800,
              color: c.text,
              letterSpacing: "-0.01em",
            }}
          >
            {truncateMiddle(data.name, 28)}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 9,
          }}
        >
          <div style={{ border: `1px solid ${c.line}`, borderRadius: 11, padding: "9px 10px", background: `${c.bg}90` }}>
            <p style={{ margin: 0, fontSize: 10, color: c.sub, fontWeight: 700, textTransform: "uppercase" }}>Утас</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: c.text }}>{data.phone || "Мэдээлэлгүй"}</p>
          </div>
          <div style={{ border: `1px solid ${c.line}`, borderRadius: 11, padding: "9px 10px", background: `${c.bg}90` }}>
            <p style={{ margin: 0, fontSize: 10, color: c.sub, fontWeight: 700, textTransform: "uppercase" }}>Төрөл</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {toTypeMn(data.type)}
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: `1px solid ${c.line}`,
            paddingTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: c.sub, fontWeight: 600, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {truncateMiddle(data.address || "Улаанбаатар, Монгол", 32)}
          </p>
          <span style={{ color: c.accent, fontWeight: 800, fontSize: 13, letterSpacing: "0.05em", flexShrink: 0 }}>
            АР ТАЛЫГ УНШУУЛ
          </span>
        </div>
      </div>
    </div>
  );
}

export function BusinessCardBack({
  data,
  scheme = "default",
  webBaseUrl = "https://mglstore.mn",
  className,
}: BusinessCardProps) {
  const c = CARD_COLOR_SCHEMES[scheme];
  const profileUrl = getProfileUrl(data, webBaseUrl);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 18,
        border: `1px solid ${c.line}`,
        background: `linear-gradient(145deg, ${c.backBg} 0%, ${c.bg} 100%)`,
        color: c.text,
        boxSizing: "border-box",
        fontFamily: "var(--font-site, system-ui, sans-serif)",
        boxShadow: "0 16px 34px rgba(15, 23, 42, 0.18)",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div
        style={{
          height: "100%",
          padding: "18px 20px",
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: c.sub, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Цахим профайл
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 24, lineHeight: 1.2, fontWeight: 800, color: c.text }}>
            {truncateMiddle(data.name, 22)}
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.5, color: c.sub, fontWeight: 600 }}>
            QR кодыг уншуулж байгууллагын профайл, бараа болон мэдээллийг шууд нээнэ.
          </p>
        </div>

        <div
          style={{
            justifySelf: "end",
            background: "#ffffff",
            borderRadius: 14,
            padding: 12,
            boxShadow: "0 8px 20px rgba(0,0,0,0.16)",
          }}
        >
          <QrGenerator
            value={profileUrl}
            size={154}
            bgColor="#ffffff"
            fgColor={c.qrFg}
            level="H"
            includeMargin={false}
          />
        </div>
      </div>
    </div>
  );
}

export function BusinessCard({
  data,
  scheme = "default",
  webBaseUrl = "https://mglstore.mn",
}: BusinessCardProps) {
  return (
    <div className="flex gap-6 flex-wrap items-start">
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#94a3b8",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            textAlign: "center",
          }}
        >
          Нүүр тал
        </p>
        <BusinessCardFront data={data} scheme={scheme} />
      </div>
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#94a3b8",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            textAlign: "center",
          }}
        >
          Ар тал
        </p>
        <BusinessCardBack data={data} scheme={scheme} webBaseUrl={webBaseUrl} />
      </div>
    </div>
  );
}
