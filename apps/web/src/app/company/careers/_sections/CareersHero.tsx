"use client";

import {
  Send,
  CheckCircle2,
  FileSignature,
  UserCheck,
  ArrowRight,
} from "lucide-react";

export default function CareersHero() {
  const steps = [
    {
      id: 1,
      title: "Хүсэлт илгээх",
      description: "Та доорх формыг бөглөн хүсэлтээ илгээнэ үү.",
      icon: Send,
    },
    {
      id: 2,
      title: "Шаардлага хангах",
      description: "Бид таны мэдээлэлтэй танилцан холбогдох болно.",
      icon: CheckCircle2,
    },
    {
      id: 3,
      title: "Гэрээ байгуулах",
      description: "Хамтран ажиллах гэрээ байгуулна.",
      icon: FileSignature,
    },
    {
      id: 4,
      title: "MGLStore гишүүн",
      description: "Та манай багийн албан ёсны гишүүн боллоо.",
      icon: UserCheck,
    },
  ];

  return (
    <section className="w-full py-20 px-4 md:px-6 lg:px-8 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white font-sans overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
            Ажилд орох үе шатууд
          </h1>
          <p className="text-xl md:text-2xl text-indigo-100 font-medium max-w-3xl mx-auto">
            Одоо бүртгүүлээд орлогоо нэмэгдүүл!
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-indigo-500/30 z-0"></div>

          {steps.map((step, index) => (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center text-center group"
            >
              <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 group-hover:bg-[#FFB700] group-hover:text-white transition-all duration-300 shadow-lg">
                <step.icon className="w-10 h-10" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#FFB700] text-white flex items-center justify-center font-bold text-sm border-2 border-indigo-900">
                  {step.id}
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-indigo-200 text-sm leading-relaxed max-w-[200px]">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button
            onClick={() =>
              document
                .getElementById("job-form")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center gap-2 bg-[#FFB700] hover:bg-[#e6a600] text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg shadow-orange-500/30 transition-all transform hover:scale-105"
          >
            Бүртгүүлэх <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
