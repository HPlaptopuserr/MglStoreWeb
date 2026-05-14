"use client";

import React, { useState } from "react";
import { getServicePostCategories } from "@mgl/ui";

export interface ServicePost {
  id: string;
  title: string;
  description: string | null;
  priceText: string | null;
  tags: string[];
  images: { id: string; url: string }[];
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  createdAt: string;
}

interface ServiceCardProps {
  post: ServicePost;
}

export function ServiceCard({ post }: ServiceCardProps) {
  const [imgError, setImgError] = useState(false);
  const thumb = !imgError && post.images[0]?.url ? post.images[0].url : null;
  const categories = getServicePostCategories(post.tags);

  return (
    <article className="group relative flex h-full min-h-[285px] min-w-0 flex-col items-center overflow-visible bg-white px-5 pb-6 pt-[104px] text-center shadow-[0_18px_40px_rgba(15,23,42,0.26)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_52px_rgba(15,23,42,0.32)]">
      <div className="absolute -top-8 left-1/2 aspect-[1.08/1] w-[68%] max-w-[156px] -translate-x-1/2 overflow-hidden bg-slate-200 shadow-[0_8px_18px_rgba(15,23,42,0.22)]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={post.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877m-3.703 3.796 2.496-3.03c.317-.384.74-.626 1.208-.766m-3.704 3.796-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center pt-5">
        <h3 className="line-clamp-2 min-h-[40px] max-w-full break-words text-base font-extrabold leading-tight text-slate-950">
          {post.title}
        </h3>

        {categories.length > 0 && (
          <div className="mt-3 flex max-w-full flex-wrap justify-center gap-1.5">
            {categories.slice(0, 2).map((category) => (
              <span
                key={category}
                className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-[#c94f00]"
              >
                {category}
              </span>
            ))}
          </div>
        )}

        <p className="mt-3 line-clamp-3 min-h-[58px] max-w-full break-words text-[13px] italic leading-relaxed text-slate-500 [overflow-wrap:anywhere]">
          {post.description || post.organization.name}
        </p>

        {post.priceText && (
          <span className="mt-4 max-w-full break-words text-sm font-bold text-[#c94f00] [overflow-wrap:anywhere]">
            {post.priceText}
          </span>
        )}

        <span className="mt-auto inline-flex border-b border-slate-500 pt-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-700 transition-colors group-hover:border-[#c94f00] group-hover:text-[#c94f00]">
          Дэлгэрэнгүй
        </span>
      </div>
    </article>
  );
}
