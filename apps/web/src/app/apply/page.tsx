import Link from "next/link";
import { Briefcase, Handshake } from "lucide-react";

export const metadata = {
  title: "Маягт - MGL Store",
  description: "MGL Store-д ажилд орох эсвэл хамтран ажиллах хүсэлт илгээх",
};

export default function ApplyPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Маягт бөглөх
        </h1>
        <p className="text-gray-500">
          Доорхоос хүсэлтийн төрлөө сонгоно уу.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          href="/apply/careers"
          className="flex flex-col items-center gap-4 border rounded-2xl p-8 hover:shadow-md transition-shadow hover:border-orange-400 group"
        >
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
            <Briefcase className="w-8 h-8 text-orange-500" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">Ажилд орох</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ажлын анкетаа илгээх
            </p>
          </div>
        </Link>

        <Link
          href="/apply/partnership"
          className="flex flex-col items-center gap-4 border rounded-2xl p-8 hover:shadow-md transition-shadow hover:border-orange-400 group"
        >
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
            <Handshake className="w-8 h-8 text-orange-500" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">Хамтран ажиллах</h2>
            <p className="text-sm text-gray-500 mt-1">
              Түншлэлийн хүсэлт илгээх
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
