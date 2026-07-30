"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Store } from "lucide-react";
import { SectionHeading } from "../SectionHeading";

const featuredStoreImages = [
  "/mgl-store/featured-stores/store-01.jpg",
  "/mgl-store/featured-stores/store-02.jpg",
  "/mgl-store/featured-stores/store-03.jpg",
  "/mgl-store/featured-stores/store-04.jpg",
];

function FeaturedStoreImage({
  src,
  index,
}: {
  src: string;
  index: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="group relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/10">
      <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.10),transparent_55%),#f8fafc]">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            <ImagePlus className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-black text-slate-700">
            Дэлгүүрийн зураг
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            store-{String(index + 1).padStart(2, "0")}.jpg
          </p>
        </div>
      </div>

      {!imageFailed && (
        <Image
          src={src}
          alt={`Онцлох MGL Store дэлгүүр ${index + 1}`}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          onError={() => setImageFailed(true)}
        />
      )}
    </article>
  );
}

export function FeaturedStoresSection() {
  return (
    <section className="border-t border-slate-200/80 bg-[#f7f8fc] py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-16">
        <SectionHeading
          eyebrow="MGL Store сүлжээ"
          title="Онцлох дэлгүүрүүд"
          description="MGL Store-ийн онцлох салбар дэлгүүрүүдтэй танилцана уу."
          action={
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
              <Store className="h-4 w-4" />
              MGL STORE
            </span>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {featuredStoreImages.map((src, index) => (
            <FeaturedStoreImage key={src} src={src} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
