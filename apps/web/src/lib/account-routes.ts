export const ACCOUNT_ROUTES = {
  login: "/login",
  profile: "/profile",
  profileLibrary: "/profile?tab=library",
  profileSettings: "/profile/settings",
  profileInfo: "/profile/settings?section=profile",
  profileSecurity: "/profile/settings?section=security",
  profileAddress: "/profile/settings?section=address",
  orders: "/orders",
} as const;

export const PROFILE_SETTING_LINKS = [
  {
    key: "profile",
    href: ACCOUNT_ROUTES.profileInfo,
    label: "Профайл засах",
  },
  {
    key: "security",
    href: ACCOUNT_ROUTES.profileSecurity,
    label: "Аюулгүй байдал",
  },
  {
    key: "address",
    href: ACCOUNT_ROUTES.profileAddress,
    label: "Мэдэгдэл, хаяг",
  },
] as const;

export type ProfileSettingKey = (typeof PROFILE_SETTING_LINKS)[number]["key"];
