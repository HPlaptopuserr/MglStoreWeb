"use client";
import { useEffect, useState, useRef } from "react";
import {
  ShoppingBasket,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import { API } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  icon?: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const loadCats = async () => {
      try {
        const res = await fetch(`${API}/business-categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to load categories", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCats();
  }, []);

  const bgColors = [
    "bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white",
    "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white",
    "bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white",
    "bg-red-50 text-red-600 group-hover:bg-red-500 group-hover:text-white",
    "bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white",
    "bg-pink-50 text-pink-600 group-hover:bg-pink-500 group-hover:text-white",
    "bg-purple-50 text-purple-600 group-hover:bg-purple-500 group-hover:text-white",
  ];

  return (
    <div className="py-24 bg-white border-y border-gray-100">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-left"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
              Ангиллаар дэлгүүр хэсэх
            </h2>
            <p className="text-lg text-gray-500">
              Манай нэгдсэн сүлжээнээс байгууллагуудаас өөрт хэрэгтэй зүйлээ
              олоорой
            </p>
          </motion.div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() => scroll("right")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center text-slate-500 py-10 border border-dashed rounded-2xl">
            Ангилал олдсонгүй
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto pb-4 gap-4 sm:gap-6 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((cat, index) => {
              const colorClass = bgColors[index % bgColors.length];
              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="shrink-0 w-32 sm:w-36 flex flex-col items-center justify-center p-6 rounded-3xl bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all group border border-transparent hover:border-gray-100 snap-center cursor-pointer"
                  onClick={() => router.push(`/products?category=${cat.id}`)}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300 ${colorClass}`}
                  >
                    {cat.icon ? (
                      cat.icon.startsWith("data:image") ||
                      cat.icon.startsWith("http") ? (
                        <img
                          src={cat.icon}
                          alt={cat.name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <span className="text-3xl">{cat.icon}</span>
                      )
                    ) : (
                      <ShoppingBasket className="w-7 h-7" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 text-center group-hover:text-gray-900">
                    {cat.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
