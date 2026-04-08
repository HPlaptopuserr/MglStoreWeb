"use client";

import { CareersForm } from "@/components/organisms/careers/CareersForm";

export default function ApplyCareersPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-start mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Ажилд орох
        </h1>
        <p className="text-gray-500">
          Доорх маягтыг бөглөн ажлын анкетаа илгээнэ үү.
        </p>
      </div>
      <CareersForm />
    </div>
  );
}
