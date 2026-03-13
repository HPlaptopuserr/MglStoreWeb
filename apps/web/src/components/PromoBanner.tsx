"use client";
import Image from "next/image";
import Link from "next/link";
import { Building2, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";

export default function Hero() {
  return (
    <div className="relative bg-white overflow-hidden border-b border-gray-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-orange-50 via-white to-white opacity-70" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-20 md:pt-40 md:pb-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs sm:text-sm font-semibold mb-4 sm:mb-8 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Монголын Нэгдсэн Дэлгүүрийн Сүлжээ
          </motion.div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-4 sm:mb-8 leading-[1.1]">
            Монголын худалдааны <br className="hidden md:block" /> нэгдсэн
            сүлжээ
          </h1>

          <p className="text-sm sm:text-lg md:text-2xl text-gray-500 mb-5 sm:mb-12 leading-relaxed max-w-3xl mx-auto font-light px-2 sm:px-0">
            Монголын бизнесүүдийг орчин үеийн жижиглэн худалдааны нэг экосистемд
            холбох. Илүү ухаалаг дэлгүүр хэсч,
            <br className="hidden md:block" />
            орон нутгаа дэмжин, хамтдаа хөгжинө.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0"
          >
            <Link
              href="/company/partnership"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-full transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5"
            >
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Бизнесээр элсээрэй
            </Link>
            <Link
              href="/organizations"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-full transition-all shadow-sm hover:-translate-y-0.5"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              Дэлгүүрүүдтэй танилцах
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-6 sm:mt-16 flex items-center justify-center gap-3 text-xs sm:text-sm text-gray-500 font-medium"
          >
            <div className="flex -space-x-2 sm:-space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white overflow-hidden shadow-sm"
                >
                  <Image
                    src={`https://picsum.photos/seed/face${i}/100/100`}
                    alt="Partner"
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-0.5 text-yellow-400 text-xs sm:text-sm">
                {"★★★★★"}
              </div>
              <p className="text-xs sm:text-sm">300+ бизнес нэгдсэн</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
