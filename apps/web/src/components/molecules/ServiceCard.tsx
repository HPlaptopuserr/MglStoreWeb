"use client";

import React, { useState } from "react";

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

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-orange-200 transition-colors duration-200">
      <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <svg
              className="w-10 h-10 text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
              />
            </svg>
          </div>
        )}

        {post.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            1/{post.images.length}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 pt-3 px-3 pb-3">
        {post.priceText && (
          <div className="flex items-center gap-1 text-sm font-bold text-[#FFAD02]">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {post.priceText}
          </div>
        )}

        <p className="text-sm text-black font-medium line-clamp-2 leading-snug mt-0.5">
          {post.title}
        </p>

        <span className="text-xs text-gray-400 truncate mt-0.5">
          {post.organization.name}
        </span>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}