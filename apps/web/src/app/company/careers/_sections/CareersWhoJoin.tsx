"use client";

import { Car, Bike, CreditCard, UserCheck, Check } from "lucide-react";

export default function CareersWhoJoin() {
  return (
    <section className="w-full py-20 px-4 md:px-6 lg:px-8 bg-gray-50 font-sans">
      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              Хэн бүртгүүлэх боломжтой вэ?
            </h2>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-[#FFB700]">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Тээврийн хэрэгсэл
                  </h3>
                  <p className="text-gray-600">
                    Авто машин, мотоцикл эсвэл дугуйтай байх (өөрийн эсвэл
                    түрээсийн байж болно).
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Жолооны үнэмлэх
                  </h3>
                  <p className="text-gray-600">
                    Хэрэв та тээврийн хэрэгсэлтэй бол хүчин төгөлдөр жолооны
                    үнэмлэхтэй байх шаардлагатай.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Хувийн зохион байгуулалт
                  </h3>
                  <p className="text-gray-600">
                    Хариуцлагатай, найрсаг харилцаатай, цаг баримталдаг байх.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="relative bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#FFB700] rounded-full opacity-20 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-indigo-600 rounded-full opacity-10 blur-2xl"></div>

            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-700">
                  18-аас дээш настай байх
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-700">
                  Ухаалаг утастай байх (Android/iOS)
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-700">
                  Банкны данстай байх
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-700">
                  Эрүүл мэндийн хувьд асуудалгүй
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
