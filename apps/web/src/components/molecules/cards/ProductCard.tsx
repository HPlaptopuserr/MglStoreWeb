import React from "react";
import Image from "next/image";
import { Plus, Heart, Store, Star } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";

interface ProductCardProps {
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  tag?: string;
  rating?: number;
  reviews?: number;
  store?: {
    name: string;
    logo?: string;
  };
}

export const ProductCard = ({
  title,
  price,
  originalPrice,
  image,
  tag,
  rating,
  reviews,
  store,
}: ProductCardProps) => {
  return (
    <div className="flex flex-col h-full group relative bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-100 transition-all duration-300 overflow-hidden text-sm">
      {tag && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm px-1.5 py-0.5 text-[10px] tracking-wide">
            {tag}
          </Badge>
        </div>
      )}

      <button className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-500 hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
        <Heart size={14} />
      </button>

      <div className="relative aspect-6/5 w-full overflow-hidden bg-slate-50 shrink-0">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-3 flex flex-col flex-1">
        {store && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {store.logo ? (
              <div className="w-6 h-6 rounded-full overflow-hidden relative shrink-0 border border-slate-100">
                <Image
                  src={store.logo}
                  fill
                  alt={store.name}
                  className="object-cover"
                />
              </div>
            ) : (
              <Store size={12} className="text-slate-400 shrink-0" />
            )}
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
              {store.name}
            </span>
          </div>
        )}

        <h3 className="font-semibold text-slate-800 line-clamp-2 mb-1 group-hover:text-amber-600 transition-colors text-xs sm:text-sm">
          {title}
        </h3>

        {rating !== undefined && (
          <div className="flex items-center gap-1 mb-1.5 mt-0.5">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  className={
                    star <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-200 text-slate-200"
                  }
                />
              ))}
            </div>
            {reviews !== undefined && (
              <span className="text-[15px] sm:text-[16px] text-slate-400 ml-0.5">
                ({reviews})
              </span>
            )}
          </div>
        )}

        <div className="flex items-end justify-between gap-1 mt-auto h-10 pt-2">
          <div className="flex flex-col justify-end">
            <span
              className={`text-[17px] leading-none select-none ${originalPrice ? "text-slate-400 line-through decoration-red-500" : "opacity-0"}`}
            >
              {(originalPrice || 0).toLocaleString()} ₮
            </span>
            <span className="text-xs sm:text-[20px] font-bold text-slate-900 leading-none mt-0.5">
              {price.toLocaleString()} ₮
            </span>
          </div>
          <Button
            size="icon"
            className="h-7 w-7 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors shadow-none shrink-0"
          >
            <Plus size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};
