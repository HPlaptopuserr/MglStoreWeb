"use client";

import React from "react";
import {
  Car,
  Headset,
  PackageSearch,
  Code,
  Bike,
  User,
  Bell,
  Package,
  Wallet,
  Menu,
  Star,
  Clock,
  Banknote,
} from "lucide-react";

const CAREER_OPPORTUNITIES = [
  {
    id: "driver",
    title: "Хүргэлтийн жолооч",
    department: "Ложистик",
    type: "Уян хатан цагийн хуваарь",
    salary: "3,500,000₮ хүртэл",
    description:
      "Өөрийн хуваариар ажиллаж, хийснээрээ орлогоо өсгөх боломжтой бие даасан гүйцэтгэгч.",
    icon: Car,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    id: "customer-success",
    title: "Хэрэглэгчийн зөвлөх",
    department: "Үйлчилгээ",
    type: "Бүрэн цагийн",
    salary: "2,000,000₮ - 2,500,000₮",
    description:
      "Хэрэглэгчдэд тулгарсан асуудлыг шийдвэрлэж, системийн хэвийн ажиллагааг хангахад туслах.",
    icon: Headset,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    id: "warehouse-ops",
    title: "Агуулахын оператор",
    department: "Үйл ажиллагаа",
    type: "Ээлжийн хуваарь",
    salary: "1,800,000₮ - 2,200,000₮",
    description:
      "Бараа бүтээгдэхүүний хүлээн авалт, хуваарилалт, чанарын хяналтыг стандартын дагуу гүйцэтгэх.",
    icon: PackageSearch,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  {
    id: "software-engineer",
    title: "Full-Stack Хөгжүүлэгч",
    department: "Технологи",
    type: "Бүрэн цагийн",
    salary: "Өрсөлдөхүйц",
    description:
      "Next.js болон Node.js дээр суурилсан өндөр ачаалал даах систем, микросервис хөгжүүлэх.",
    icon: Code,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
];

export const CareersPhone = () => {
  return (
    <section className="min-h-screen font-sans">
      <div className="lg:col-span-5 relative hidden lg:block h-full min-h-200">
        <div className="sticky top-10">
          <div className="relative mx-auto border-gray-900 bg-gray-900 border-14 rounded-[2.5rem] h-150 w-75 shadow-2xl">
            <div className="h-[32px] w-0.75 bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
            <div className="h-[46px] w-0.75 bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
            <div className="h-[46px] w-0.75 bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
            <div className="h-[64px] w-0.75 bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>

            <div className="rounded-4xl overflow-hidden w-full h-full bg-gray-50 relative">
              <div className="h-6 bg-white w-full flex items-center justify-between px-6 text-[10px] font-bold text-gray-900 z-20 relative">
                <span>9:41</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-black rounded-full"></div>
                  <div className="w-3 h-3 bg-black rounded-full"></div>
                </div>
              </div>

              <div className="p-5 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-500" />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">
                        Сайн байна уу?
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        Хэрэглэгч
                      </div>
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-full shadow-sm">
                    <Bell className="w-5 h-5 text-gray-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>

                  <div className="relative z-10 flex flex-col items-center text-center gap-4">
                    <div className="text-lg text-white mt-[-10]">200,000₮</div>

                    <div className="text-4xl font-extrabold tracking-tight">
                      150,000₮
                    </div>

                    <div className="flex gap-2">
                      <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                        <Package className="w-3 h-3" /> 12 хүргэлт
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 5.2 цаг
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        Идэвхтэй
                      </div>
                      <div className="text-xs text-gray-500">
                        Захиалга хүлээж байна
                      </div>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-green-500 rounded-full p-1 flex justify-end">
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-gray-900">
                      Сүүлийн захиалгууд
                    </h4>
                    <span className="text-xs text-[#FFB700] font-medium">
                      Бүгд
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-white p-3 rounded-xl shadow-sm border border-gray-50 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-[#FFB700]">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-gray-900">
                            Захиалга #{2045 + i}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Хан-Уул дүүрэг • 2.5км
                          </div>
                        </div>
                        <div className="text-xs font-bold text-green-600">
                          +12,500₮
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-6 flex justify-around text-gray-400">
                <div className="text-[#FFB700] flex flex-col items-center gap-1">
                  <Bike className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Menu className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-20 -right-12 bg-white p-4 rounded-2xl shadow-xl animate-bounce-slow z-20">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-bold uppercase">
                  Үнэлгээ
                </div>
                <div className="text-lg font-bold text-gray-900">4.9/5.0</div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-40 -left-12 bg-white p-4 rounded-2xl shadow-xl animate-pulse-slow z-20">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full text-green-600">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-bold uppercase">
                  Бонус
                </div>
                <div className="text-lg font-bold text-gray-900">+500k</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
