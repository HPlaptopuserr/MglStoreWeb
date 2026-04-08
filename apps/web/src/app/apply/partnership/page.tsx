import { PartnershipForm } from "@/components/organisms/partnership/PartnershipForm";

export const metadata = {
  title: "Хамтран ажиллах - MGL Store",
  description: "MGL Store-тэй хамтран ажиллах хүсэлт илгээх",
};

export default function ApplyPartnershipPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-start mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Хамтран ажиллах
        </h1>
        <p className="text-gray-500">
          Доорх маягтыг бөглөн хамтран ажиллах хүсэлтээ илгээнэ үү.
        </p>
      </div>
      <PartnershipForm />
    </div>
  );
}
