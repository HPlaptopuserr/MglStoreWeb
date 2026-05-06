"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VendorServicesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/service-posts");
  }, [router]);

  return (
    <div className="flex h-96 items-center justify-center text-sm font-semibold text-slate-500">
      Үйлчилгээний постууд руу шилжүүлж байна...
    </div>
  );
}
