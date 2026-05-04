"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Phone, Tag, Eye, Megaphone } from "lucide-react";
import { API } from "@/lib/api";

interface ServiceImage {
  id: string;
  url: string;
}

interface Organization {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
}

interface ServicePost {
  id: string;
  title: string;
  description?: string | null;
  priceText?: string | null;
  tags: string[];
  isActive: boolean;
  viewCount: number;
  images: ServiceImage[];
  organization?: Organization;
  createdAt: string;
}

interface Props {
  postId: string;
  onClose: () => void;
}

export function ServiceDetailOverlay({ postId, onClose }: Props) {
  const [post, setPost] = useState<ServicePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    fetch(`${API}/service-posts/${postId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setPost(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [postId]);

  const images = post?.images ?? [];

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#f4f4f4] w-full md:max-w-4xl rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[95vh] md:max-h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100 shrink-0">
          <nav className="text-sm text-slate-500 flex items-center gap-1.5 truncate">
            <Link href="/services" className="hover:text-slate-700 transition-colors shrink-0">
              Үйлчилгээ
            </Link>
            <span className="shrink-0">•</span>
            <span className="text-slate-900 font-medium line-clamp-1">
              {post?.title ?? "Уншиж байна..."}
            </span>
          </nav>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0 ml-3"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-72">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !post ? (
            <div className="flex flex-col items-center justify-center h-72 gap-3 text-slate-400">
              <Megaphone className="w-14 h-14 opacity-30" />
              <p className="font-medium">Үйлчилгээ олдсонгүй</p>
            </div>
          ) : (
            <div className="p-4 md:p-6 flex flex-col md:grid md:grid-cols-[64px_1fr_300px] gap-4 md:gap-5">

              {/* Col 1: Thumbnail strip (desktop only) */}
              {images.length > 1 && (
                <div className="hidden md:flex flex-col gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImg(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        idx === activeImg
                          ? "border-purple-500 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Col 2: Main image + info */}
              <div className="flex flex-col gap-4">
                {/* Main image */}
                {images.length > 0 ? (
                  <div className="bg-white rounded-2xl overflow-hidden relative aspect-video">
                    <Image
                      src={images[activeImg]?.url ?? images[0].url}
                      alt={post.title}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setActiveImg((prev) => Math.max(0, prev - 1))}
                          disabled={activeImg === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 text-white rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setActiveImg((prev) =>
                            Math.min(images.length - 1, prev + 1)
                          )}
                          disabled={activeImg === images.length - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 text-white rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveImg(idx)}
                              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                idx === activeImg ? "bg-purple-500" : "bg-white/50"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
                      <Eye className="w-3 h-3" />
                      {post.viewCount}
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-50 rounded-2xl w-full aspect-video flex items-center justify-center">
                    <Megaphone className="w-16 h-16 text-purple-200" />
                  </div>
                )}

                {/* Description */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Дэлгэрэнгүй мэдээлэл
                  </p>
                  {post.description ? (
                    <p className="text-sm text-slate-600 leading-relaxed">{post.description}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      Дэлгэрэнгүй мэдээлэл байхгүй байна.
                    </p>
                  )}
                </div>
              </div>

              {/* Col 3: Info panel */}
              <div className="flex flex-col gap-4">
                {/* Org card */}
                {post.organization && (
                  <Link
                    href={`/organizations/${post.organization.id}`}
                    className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                    onClick={onClose}
                  >
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-purple-50 border border-purple-100 shrink-0">
                      {post.organization.logoUrl ? (
                        <Image
                          src={post.organization.logoUrl}
                          alt={post.organization.name}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-purple-300">
                          <Megaphone className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {post.organization.name}
                      </p>
                      <p className="text-xs text-slate-400">Профайл харах →</p>
                    </div>
                  </Link>
                )}

                {/* Price + title */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <h1 className="text-base font-bold text-slate-900 leading-snug mb-3">
                    {post.title}
                  </h1>
                  {post.priceText && (
                    <p
                      className="text-2xl font-extrabold mb-4"
                      style={{ color: "#FFAD02" }}
                    >
                      {post.priceText}
                    </p>
                  )}

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-purple-50 text-purple-600 px-3 py-1 rounded-full"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all text-sm">
                    <Phone className="w-4 h-4" />
                    Холбоо барих
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
