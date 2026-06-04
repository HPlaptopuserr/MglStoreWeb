import type { LoginMarketingBanner } from "@/components/organisms/auth/LoginModal";

export const AUTH_LOGIN_BANNER_KEY = "auth-login-banner";

export function createLoginMarketingBanner(): Required<LoginMarketingBanner> {
  return {
    imageUrl: "",
    eyebrow: "MGL Store",
    title: "Хэрэглэгчид юу хэлдэг вэ?",
    quote: "Энэ платформ маш ойлгомжтой, энгийн интерфейстэй. Миний бизнесийн онлайн борлуулалтад их тус болсон.",
    author: "Мөнх Баатар",
    role: "MGL Store хэрэглэгч",
    cta: "Бидэнтэй нэгдэх",
    href: "/",
    socialLinks: {
      facebook: "",
      x: "",
      linkedin: "",
    },
  };
}

export function parseLoginMarketingBanner(raw?: string): Required<LoginMarketingBanner> {
  const fallback = createLoginMarketingBanner();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const socials = parsed.socialLinks && typeof parsed.socialLinks === "object" ? parsed.socialLinks : {};
    return {
      imageUrl: String(parsed.imageUrl || ""),
      eyebrow: String(parsed.eyebrow || fallback.eyebrow),
      title: String(parsed.title || fallback.title),
      quote: String(parsed.quote || fallback.quote),
      author: String(parsed.author || fallback.author),
      role: String(parsed.role || fallback.role),
      cta: String(parsed.cta || fallback.cta),
      href: String(parsed.href || fallback.href),
      socialLinks: {
        facebook: String(socials.facebook || ""),
        x: String(socials.x || ""),
        linkedin: String(socials.linkedin || ""),
      },
    };
  } catch {
    return fallback;
  }
}
