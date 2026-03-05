"use client";

import { Clock, TrendingUp, CalendarCheck, GraduationCap } from "lucide-react";

export default function CareersWhyWeSection() {
  const benefits = [
    {
      icon: Clock,
      title: "Уян хатан цагийн хуваарь",
      description:
        "Та өөрийн боломжтой цагаар ажиллаж, орлогоо нэмэгдүүлэх боломжтой.",
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      icon: TrendingUp,
      title: "Өндөр орлого",
      description:
        "Та хэдий чинээ олон захиалга хүргэнэ, төдий чинээ их орлого олох боломжтой.",
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      icon: CalendarCheck,
      title: "Тогтмол, найдвартай төлбөр",
      description:
        "Таны хийсэн ажлын хөлс 7 хоног бүр таны дансанд шилжих болно.",
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      icon: GraduationCap,
      title: "Дэмжлэг ба сургалт",
      description:
        "Бид таныг амжилттай ажиллахад шаардлагатай бүх сургалт, мэдээллээр хангах болно.",
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
  ];

  return (
    <section className="w-full py-20 px-4 md:px-6 lg:px-8 bg-white font-sans">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Яагаад бидэнтэй нэгдэх хэрэгтэй вэ?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Бид танд өөрийгөө хөгжүүлэх, орлогоо өсгөх хамгийн таатай нөхцөлийг
            санал болгож байна.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
            >
              <div
                className={`w-14 h-14 rounded-2xl ${benefit.bg} ${benefit.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
              >
                <benefit.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {benefit.title}
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
