"use client";
import { useEffect, useState } from "react";
import type { MglClubPost } from "@mgl/types";
import { API } from "./api";
import styles from "./company-blog.module.css";
interface PostPage {
  posts: MglClubPost[];
  nextCursor: string | null;
}
export function CompanyBlog({
  companyId,
  isDemo = false,
}: {
  companyId: string;
  isDemo?: boolean;
}) {
  const [page, setPage] = useState<PostPage>({ posts: [], nextCursor: null });
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (isDemo) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API}/forms/mgl-club/members/${companyId}/posts`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        const result: PostPage = await response.json();
        if (!controller.signal.aborted) setPage(result);
      } catch {
        if (!controller.signal.aborted)
          setError("Нийтлэлүүдийг ачаалж чадсангүй.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [companyId, isDemo, retry]);
  async function more() {
    if (!page.nextCursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API}/forms/mgl-club/members/${companyId}/posts?cursor=${encodeURIComponent(page.nextCursor)}`,
      );
      if (!response.ok) throw new Error();
      const result: PostPage = await response.json();
      setPage((previous) => ({
        posts: [...previous.posts, ...result.posts],
        nextCursor: result.nextCursor,
      }));
    } catch {
      setError("Нийтлэлүүдийг ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }
  const posts = isDemo
    ? [
        {
          id: "intro",
          title: "Манай байгууллагатай танилцаарай",
          body: "Энэ бол байгууллагын блогийн жишээ нийтлэл. Эзэмшигч өөрийн бүртгэлээс байгууллагын мэдээ, шинэ бүтээгдэхүүн, үйлчилгээ болон үйл ажиллагааны тухай мэдээллээ энд нийтэлж болно.",
          createdAt: "2026-11-15T00:00:00Z",
        },
        {
          id: "partners",
          title: "Хамтын ажиллагаанд нээлттэй",
          body: "Шинэ хамтрагчдад зориулсан мэдээлэл, хамтран хэрэгжүүлэх санаачилга, үйлчилгээний шинэчлэлээ танилцуулах жишээ. Энэ нь туршилтын агуулга юм.",
          createdAt: "2026-11-15T00:00:00Z",
        },
      ]
    : page.posts;
  return (
    <div className={styles.posts} aria-busy={loading}>
      {isDemo && (
        <p className={styles.note}>
          Туршилтын нийтлэлүүд · Бодит байгууллагын мэдээ биш
        </p>
      )}
      {posts.map((post) => (
        <article className={styles.post} key={post.id}>
          <time dateTime={post.createdAt}>
            {new Intl.DateTimeFormat("mn-MN", {
              dateStyle: "medium",
              timeZone: "Asia/Ulaanbaatar",
            }).format(new Date(post.createdAt))}
          </time>
          <details>
            <summary>
              {post.title}
              <span aria-hidden="true">↗</span>
            </summary>
            <p>{post.body}</p>
          </details>
        </article>
      ))}
      {loading && <p role="status">Нийтлэлүүдийг ачаалж байна…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Дахин оролдох
          </button>
        </div>
      )}
      {!loading && !error && !posts.length && (
        <p className={styles.note}>Одоогоор нийтлэл оруулаагүй байна.</p>
      )}
      {page.nextCursor && (
        <button type="button" disabled={loading} onClick={() => void more()}>
          Өмнөх нийтлэлүүдийг харах
        </button>
      )}
    </div>
  );
}
