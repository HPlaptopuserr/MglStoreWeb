import { QrCode, Smartphone, CheckCircle2, CreditCard } from "lucide-react";

export function PartnershipHero() {
  return (
    <div className="relative flex flex-col items-center lg:items-start lg:sticky lg:top-8">
      {/* Illustration */}
      <div className="relative w-full max-w-md aspect-square flex items-center justify-center mb-10">
        <div className="absolute inset-0 bg-white/10 rounded-full scale-90 animate-pulse-slow"></div>
        <div className="relative z-20 w-52 h-[340px] bg-white rounded-[2.5rem] shadow-2xl border-8 border-gray-900 overflow-hidden transform -rotate-6 transition-transform hover:rotate-0 duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-xl z-30"></div>
          <div className="w-full h-full bg-gray-50 flex flex-col items-center pt-12 px-4">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4 text-purple-600">
              <QrCode className="h-8 w-8" />
            </div>
            <div className="w-full bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-3 flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-orange-500" />
              <div className="flex-1 text-xs font-bold text-gray-900">
                Төлбөр хүлээн авах
              </div>
            </div>
            <button className="mt-auto mb-6 w-full bg-purple-600 text-white text-xs font-bold py-2.5 rounded-lg">
              ТӨЛӨХ
            </button>
          </div>
        </div>

        {/* Floating Badges */}
        <div className="absolute top-10 right-0 z-30 bg-white p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce-slow">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <div className="text-xs text-gray-500 font-medium">Status</div>
            <div className="text-sm font-bold text-gray-900">Verified</div>
          </div>
        </div>
        {/* Payment Card */}
        <div className="absolute bottom-12 -left-4 z-30 bg-white p-4 rounded-2xl shadow-xl transform rotate-6 hover:rotate-12 transition-transform duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-xl">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="w-20 h-2.5 bg-gray-800 rounded-full mb-1.5"></div>
              <div className="w-12 h-2 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Text */}
      <div className="text-center lg:text-left text-white lg:pl-4">
        <h3 className="text-2xl font-bold mb-4">Хялбар, Хурдан, Найдвартай</h3>
        <p className="text-white/80 text-base leading-relaxed max-w-lg mb-6">
          Бид таны бизнесийг өргөжүүлэхэд туслах хамгийн орчин үеийн төлбөрийн
          шийдлүүдийг санал болгож байна.
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto lg:mx-0">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold">3000+</div>
            <div className="text-xs text-white/70">Харилцагч</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <div className="text-2xl font-bold">24/7</div>
            <div className="text-xs text-white/70">Тусламж</div>
          </div>
        </div>
      </div>
    </div>
  );
}
