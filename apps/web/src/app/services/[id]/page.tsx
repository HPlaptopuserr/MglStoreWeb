"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { API } from "@/lib/api";

interface ServicePost {
  id: string;
  title: string;
  description: string | null;
  priceText: string | null;
  tags: string[];
  isActive: boolean;
  viewCount: number;
  images: { id: string; url: string }[];
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  createdAt: string;
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<ServicePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    fetch(`${API}/service-posts/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setPost(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <p className="text-gray-400 text-lg font-medium">Үйлчилгээ олдсонгүй</p>
        <Link href="/services" className="text-sm underline text-gray-500 hover:text-black">Бүх үйлчилгээ харах</Link>
      </div>
    );
  }

  const images = post.images ?? [];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-black transition-colors">Нүүр хуудас</Link>
            <span className="text-gray-300">/</span>
            <Link href="/services" className="hover:text-black transition-colors">Үйлчилгээ</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800 font-medium line-clamp-1 max-w-xs">{post.title}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: thumbnail strip + main image ── */}
          <div className="flex gap-3 flex-1 min-w-0">
            {images.length > 1 && (
              <div className="hidden sm:flex flex-col gap-2 w-16 shrink-0">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImg(idx)}
                    className={`relative w-16 h-16 border-2 overflow-hidden transition-all ${
                      idx === activeImg ? "border-black" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="flex-1 min-w-0">
              <div className="bg-white relative aspect-video overflow-hidden">
                {images.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[activeImg]?.url ?? images[0].url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <svg className="w-20 h-20 text-gray-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                )}

                {/* Mobile dot nav */}
                {images.length > 1 && (
                  <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImg(idx)}
                        className={`w-2 h-2 rounded-full transition-colors ${idx === activeImg ? "bg-black" : "bg-white/70"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: org card + details ── */}
          <div className="flex flex-col gap-4 w-full lg:w-[340px] shrink-0">
            {/* Organization card */}
            <Link
              href={`/organizations/${post.organization.id}`}
              className="bg-white p-4 flex items-center gap-3 hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                {post.organization.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.organization.logoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{post.organization.name}</p>
                <p className="text-xs text-gray-400">{post.organization.name} · Профайл харах →</p>
              </div>
            </Link>

            {/* Main info card */}
            <div className="bg-white p-5 flex flex-col gap-4">
              {/* Price */}
              {post.priceText && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#FFAD02] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xl font-black text-[#FFAD02]">{post.priceText}</span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-base font-bold text-gray-900 leading-snug">{post.title}</h1>

              {/* Description */}
              {post.description ? (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Дэлгэрэнгүй</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{post.description}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Дэлгэрэнгүй мэдээлэл байхгүй.</p>
              )}

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/services?tag=${encodeURIComponent(tag)}`}
                      className="text-xs bg-gray-100 hover:bg-black hover:text-white text-gray-600 px-3 py-1 rounded-full transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {post.viewCount} үзэлт
                </span>
                <span>{new Date(post.createdAt).toLocaleDateString("mn-MN")}</span>
              </div>
            </div>

            {/* Contact button */}
            <Link
              href={`/organizations/${post.organization.id}`}
              className="w-full py-4 bg-black hover:bg-[#FFAD02] hover:text-black text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              Холбоо барих
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
