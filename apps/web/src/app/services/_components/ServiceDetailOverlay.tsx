"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Megaphone,
  Phone,
  Send,
  Store,
  Tag,
  X,
} from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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
  tags?: string[];
  isActive: boolean;
  viewCount?: number;
  images?: ServiceImage[];
  organization?: Organization;
  createdAt?: string;
}

interface Props {
  postId: string;
  onClose: () => void;
}

export function ServiceDetailOverlay({ postId, onClose }: Props) {
  const [post, setPost] = useState<ServicePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { user, authFetch } = useAuth();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    setRequestMessage("");

    fetch(`${API}/service-posts/${postId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch(() => {
        setPost(null);
        setLoading(false);
      });
  }, [postId]);

  const images = post?.images ?? [];
  const activeImage = images[activeImg]?.url ?? images[0]?.url;
  const tags = post?.tags ?? [];
  const viewCount = post?.viewCount ?? 0;
  const createdAtLabel = post?.createdAt
    ? new Date(post.createdAt).toLocaleDateString("mn-MN")
    : "";

  const handleSendRequest = async () => {
    if (!post || requesting) return;

    if (!user) {
      alert("Үйлчилгээний хүсэлт илгээхийн тулд эхлээд нэвтэрнэ үү.");
      return;
    }

    setRequesting(true);
    setRequestMessage("");

    try {
      const response = await authFetch(`${API}/service-posts/${post.id}/request`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Хүсэлт илгээж чадсангүй");
      }

      setRequestMessage("Хүсэлт илгээгдлээ. Vendor талын хүсэлтүүд дээр харагдана.");
    } catch (error) {
      setRequestMessage(
        error instanceof Error ? error.message : "Хүсэлт илгээхэд алдаа гарлаа",
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.scrollTop += event.deltaY;
    event.preventDefault();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
      onWheel={handleWheel}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl md:max-h-[88vh] md:max-w-5xl md:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <nav className="flex min-w-0 items-center gap-1.5 truncate text-sm text-slate-500">
            <Link href="/services" className="shrink-0 transition-colors hover:text-slate-700">
              Үйлчилгээ
            </Link>
            <span className="shrink-0 text-slate-300">/</span>
            <span className="line-clamp-1 font-medium text-slate-900">
              {post?.title ?? "Уншиж байна..."}
            </span>
          </nav>

          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 transition-colors hover:bg-slate-200"
            aria-label="Хаах"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : !post ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 text-slate-400">
              <Megaphone className="h-14 w-14 opacity-30" />
              <p className="font-medium">Үйлчилгээ олдсонгүй</p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_300px] md:p-5">
              <div className="min-w-0 space-y-3">
                {activeImage ? (
                  <div className="relative aspect-[16/9] max-h-[470px] overflow-hidden rounded-xl bg-white shadow-sm">
                    <Image
                      src={activeImage}
                      alt={post.title}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />

                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveImg((prev) => Math.max(0, prev - 1))}
                          disabled={activeImg === 0}
                          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/60 disabled:opacity-30"
                          aria-label="Өмнөх зураг"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveImg((prev) => Math.min(images.length - 1, prev + 1))
                          }
                          disabled={activeImg === images.length - 1}
                          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/60 disabled:opacity-30"
                          aria-label="Дараагийн зураг"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                          {images.map((image, idx) => (
                            <button
                              key={image.id}
                              type="button"
                              onClick={() => setActiveImg(idx)}
                              className={`h-2 w-2 rounded-full transition-colors ${
                                idx === activeImg ? "bg-amber-400" : "bg-white/60"
                              }`}
                              aria-label={`${idx + 1}-р зураг`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white">
                      <Eye className="h-3 w-3" />
                      {viewCount}
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] max-h-[470px] w-full items-center justify-center rounded-xl bg-white">
                    <Megaphone className="h-14 w-14 text-slate-200" />
                  </div>
                )}

                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((image, idx) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setActiveImg(idx)}
                        className={`relative h-14 w-[72px] shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                          idx === activeImg ? "border-amber-400" : "border-white hover:border-slate-300"
                        }`}
                      >
                        <Image
                          src={image.url}
                          alt=""
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <section className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Дэлгэрэнгүй
                  </p>
                  {post.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {post.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-slate-400">
                      Дэлгэрэнгүй мэдээлэл байхгүй байна.
                    </p>
                  )}
                </section>
              </div>

              <aside className="space-y-3 md:sticky md:top-0 md:self-start">
                <section className="rounded-xl bg-white p-4 shadow-sm">
                  {post.priceText && (
                    <p className="mb-2 text-xl font-black text-amber-500">
                      {post.priceText}
                    </p>
                  )}
                  <h1 className="text-lg font-black leading-snug text-slate-950">
                    {post.title}
                  </h1>

                  <div className="mt-4 flex items-center justify-between border-y border-slate-100 py-3 text-xs text-slate-500">
                    <span>{createdAtLabel}</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {viewCount} үзэлт
                    </span>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/services?tag=${encodeURIComponent(tag)}`}
                          onClick={onClose}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-black hover:text-white"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                {post.organization && (
                  <Link
                    href={`/organizations/${post.organization.id}`}
                    className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                    onClick={onClose}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {post.organization.logoUrl ? (
                        <Image
                          src={post.organization.logoUrl}
                          alt={post.organization.name}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <Store className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {post.organization.name}
                      </p>
                      <p className="text-xs text-slate-400">Профайл харах</p>
                    </div>
                  </Link>
                )}

                <Link
                  href={post.organization ? `/organizations/${post.organization.id}` : "/services"}
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition-colors hover:bg-amber-500 hover:text-black"
                >
                  <Phone className="h-4 w-4" />
                  Холбоо барих
                </Link>

                <button
                  type="button"
                  onClick={handleSendRequest}
                  disabled={requesting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {requesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {requesting ? "Илгээж байна..." : "Хүсэлт илгээх"}
                </button>

                {requestMessage && (
                  <p className="rounded-xl bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600 shadow-sm">
                    {requestMessage}
                  </p>
                )}
              </aside>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
