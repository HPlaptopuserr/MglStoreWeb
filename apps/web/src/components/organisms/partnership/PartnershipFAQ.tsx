"use client";
import { motion } from "motion/react";
import { HelpCircle, MessageCircle, Headset } from "lucide-react";

export const FAQIllustration = () => (
  <div className="relative h-[500px] md:h-[600px] w-full bg-[#F8F9FA] rounded-3xl overflow-hidden hidden md:flex items-center justify-center">
    {/* Decorative Background Elements */}
    <div className="absolute inset-0">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl"></div>
    </div>

    {/* Main Composition */}
    <div className="relative z-10 w-full max-w-[400px] px-6">
      {/* Floating Elements - Top Right */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-12 -right-4 bg-white p-4 rounded-2xl shadow-lg border border-gray-100 z-20"
      >
        <HelpCircle className="w-8 h-8 text-orange-500" />
      </motion.div>

      {/* Floating Elements - Bottom Left */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute -bottom-8 -left-4 bg-white p-4 rounded-2xl shadow-lg border border-gray-100 z-20"
      >
        <MessageCircle className="w-8 h-8 text-purple-500" />
      </motion.div>

      {/* Central Chat Card */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden relative">
        {/* Header */}
        <div className="bg-white border-b border-gray-50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <Headset className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">
                Customer Support
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-xs text-gray-500">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Body */}
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-[300px]">
          {/* Message 1 */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs">
                U
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-600 max-w-[85%]">
              Сайн байна уу? Төлбөрийн нөхцөлийн талаар мэдээлэл авах гэсэн юм.
            </div>
          </div>

          {/* Message 2 */}
          <div className="flex gap-3 flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-orange-600">
              <Headset className="w-4 h-4" />
            </div>
            <div className="bg-orange-500 p-4 rounded-2xl rounded-tr-none shadow-sm text-sm text-white max-w-[85%]">
              Сайн байна уу! Та манай QR төлбөр, SocialPay болон бүх банкны картаар
              төлбөрөө хийх боломжтой.
            </div>
          </div>

          {/* Message 3 */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
              <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs">
                U
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm text-gray-600 max-w-[85%]">
              Баярлалаа, ойлгомжтой байна.
            </div>
          </div>
        </div>

        {/* Input Placeholder */}
        <div className="p-4 bg-white border-t border-gray-50">
          <div className="h-12 bg-gray-50 rounded-xl flex items-center px-4 text-gray-400 text-sm">
            Асуултаа бичнэ үү...
          </div>
        </div>
      </div>
    </div>
  </div>
);
