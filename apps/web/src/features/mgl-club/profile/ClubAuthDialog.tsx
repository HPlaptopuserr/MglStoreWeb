"use client";
import CommunityAuthDialog from "@/features/auth/CommunityAuthDialog";
export default function ClubAuthDialog({ onClose }: { onClose: () => void }) {
  return (
    <CommunityAuthDialog
      onClose={onClose}
      brandName="MGL Club"
      marketingBanner={{
        eyebrow: "MGL CLUB",
        title: "Таны бизнесийн шинэ хүрээлэл",
        quote: "Танилцъя. Холбогдъё. Хамтдаа өсөцгөөе.",
        author: "MGL CLUB",
        role: "Бизнесийн хамтын нийгэмлэг",
        href: "/mgl-club",
        cta: "Клубийн гишүүдийг харах",
      }}
    />
  );
}
