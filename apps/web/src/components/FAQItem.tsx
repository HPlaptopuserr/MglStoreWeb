"use client";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { FAQIcon } from "../../../../packages/ui/src/atoms/FAQIcon";

interface FAQItemProps {
  id: number;
  title: string;
  answer: string;
  images?: string[];
  isOpen: boolean;
  onToggle: (id: number) => void;
}

export const FAQItem = ({
  id,
  title,
  answer,
  images,
  isOpen,
  onToggle,
}: FAQItemProps) => (
  <div className="border-b border-gray-100 last:border-0">
    <button
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between py-6 text-left group focus:outline-none"
    >
      <span
        className={`text-lg md:text-xl font-medium transition-colors ${isOpen ? "text-gray-900" : "text-gray-700 hover:text-gray-900"}`}
      >
        {title}
      </span>
      <FAQIcon isOpen={isOpen} />
    </button>

    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="pb-8 text-gray-500 leading-relaxed">
            <p className="mb-6 max-w-md">{answer}</p>
            {images && images.length > 0 && (
              <div className="flex gap-4 mt-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-gray-100 shadow-sm"
                  >
                    <Image
                      src={img}
                      alt="Detail"
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
