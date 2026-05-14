"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Loader2, Megaphone, Phone, Send, Store, Tag } from "lucide-react";
import { getServicePostCategories } from "@mgl/ui";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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

export default function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [post, setPost] = useState<ServicePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const { user, authFetch } = useAuth();

  useEffect(() => {
    fetch(`${API}/service-posts/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <Megaphone className="h-12 w-12 text-slate-200" />
        <p className="text-lg font-medium text-slate-400">Үйлчилгээ олдсонгүй</p>
        <Link href="/services" className="text-sm font-semibold text-slate-500 underline hover:text-black">
          Бүх үйлчилгээ харах
        </Link>
      </div>
    );
  }

  const images = post.images ?? [];
  const activeImage = images[activeImg]?.url ?? images[0]?.url;
  const categories = getServicePostCategories(post.tags);

  const handleSendRequest = async () => {
    if (!post || requesting) return;
    if (!user) {
      alert("Үйлчилгээний хүсэлт илгээхийн тулд эхлээд нэвтэрнэ үү.");
      return;
    }

    setRequesting(true);
    setRequestMessage("");
    try {
      const res = await authFetch(`${API}/service-posts/${post.id}/request`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Хүсэлт илгээж чадсангүй");
      }
      setRequestMessage("Хүсэлт илгээгдлээ. Vendor талын хүсэлтүүд дээр харагдана.");
    } catch (error) {
      setRequestMessage(error instanceof Error ? error.message : "Хүсэлт илгээхэд алдаа гарлаа");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-3 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="transition-colors hover:text-black">
              Нүүр
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/services" className="transition-colors hover:text-black">
              Үйлчилгээ
            </Link>
            <span className="text-slate-300">/</span>
            <span className="line-clamp-1 max-w-xs font-medium text-slate-900">{post.title}</span>
          </nav>
        </div>
      </div>

      <main className="container mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-3">
            <div className="relative aspect-[16/9] max-h-[520px] overflow-hidden rounded-xl bg-white shadow-sm">
              {activeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeImage} alt={post.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white">
                  <Megaphone className="h-20 w-20 text-slate-200" />
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImg((prev) => Math.max(0, prev - 1))}
                    disabled={activeImg === 0}
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/60 disabled:opacity-30"
                    aria-label="Өмнөх зураг"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImg((prev) => Math.min(images.length - 1, prev + 1))}
                    disabled={activeImg === images.length - 1}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/60 disabled:opacity-30"
                    aria-label="Дараагийн зураг"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImg(idx)}
                    className={`relative h-16 aspect-[4/3] shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      idx === activeImg ? "border-amber-400" : "border-white hover:border-slate-300"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
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
          </section>

          <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-xl bg-white p-4 shadow-sm">
              {post.priceText && (
                <p className="mb-2 text-xl font-black text-amber-500">{post.priceText}</p>
              )}
              <h1 className="text-xl font-black leading-tight text-slate-950">{post.title}</h1>

              <div className="mt-4 flex items-center justify-between border-y border-slate-100 py-3 text-xs text-slate-500">
                <span>{new Date(post.createdAt).toLocaleDateString("mn-MN")}</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {post.viewCount} үзэлт
                </span>
              </div>

              {categories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {categories.map((tag) => (
                    <Link
                      key={tag}
                      href={`/services?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-black hover:text-white"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <Link
              href={`/organizations/${post.organization.id}`}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {post.organization.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.organization.logoUrl}
                    alt={post.organization.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="h-5 w-5 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{post.organization.name}</p>
                <p className="text-xs text-slate-400">Профайл харах</p>
              </div>
            </Link>

            <Link
              href={`/organizations/${post.organization.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition-colors hover:bg-amber-500 hover:text-black"
            >
              <Phone className="h-4 w-4" />
              Холбоо барих
            </Link>
            <button
              type="button"
              onClick={handleSendRequest}
              disabled={requesting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {requesting ? "Илгээж байна..." : "Хүсэлт илгээх"}
            </button>
            {requestMessage && (
              <p className="rounded-xl bg-white px-3 py-2 text-center text-xs font-semibold text-slate-600 shadow-sm">
                {requestMessage}
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
