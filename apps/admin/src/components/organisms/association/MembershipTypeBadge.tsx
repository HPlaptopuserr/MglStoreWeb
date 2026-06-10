import { MEMBERSHIP_TYPES, type MembershipTypeKey } from "./membership-constants";

interface Props {
  type: MembershipTypeKey | string;
  size?: "sm" | "md";
  showDot?: boolean;
}

export function MembershipTypeBadge({ type, size = "md", showDot = true }: Props) {
  const cfg = MEMBERSHIP_TYPES[type as MembershipTypeKey];
  if (!cfg) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-semibold rounded-full ${cfg.color} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotColor}`} />}
      {cfg.labelShort}
    </span>
  );
}
