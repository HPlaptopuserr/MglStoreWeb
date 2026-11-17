"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  parseMglClubPost,
  type MglClubMember,
  type MglClubPost,
  type MglClubPostInput,
} from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import styles from "./company-blog.module.css";
const emptyPost: MglClubPostInput = { title: "", body: "", published: false };
export function CompanyBlogManager() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [companies, setCompanies] = useState<MglClubMember[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [posts, setPosts] = useState<MglClubPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [postId, setPostId] = useState("");
  const [draft, setDraft] = useState<MglClubPostInput>(emptyPost);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const loadPosts = useCallback(
    async (id: string, after?: string, signal?: AbortSignal) => {
      const response = await authFetch(
        `${API}/forms/mgl-club/my-companies/${id}/posts${after ? `?cursor=${encodeURIComponent(after)}` : ""}`,
        { signal },
      );
      if (!response.ok) throw new Error("Нийтлэлүүдийг ачаалж чадсангүй.");
      const page: { posts: MglClubPost[]; nextCursor: string | null } =
        await response.json();
      if (signal?.aborted) return;
      setPosts((previous) =>
        after ? [...previous, ...page.posts] : page.posts,
      );
      setCursor(page.nextCursor);
    },
    [],
  );
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await authFetch(`${API}/forms/mgl-club/my-companies`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Байгууллагуудыг ачаалж чадсангүй.");
        const data: { companies: MglClubMember[] } = await response.json();
        if (controller.signal.aborted) return;
        setCompanies(data.companies);
        setCompanyId((previous) =>
          data.companies.some((c) => c.id === previous)
            ? previous
            : data.companies[0]?.id || "",
        );
      } catch (cause: unknown) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Холболтын алдаа гарлаа.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [userId, retry]);
  useEffect(() => {
    if (!companyId || !userId) return;
    const controller = new AbortController();
    void loadPosts(companyId, undefined, controller.signal).catch(() => {
      if (!controller.signal.aborted)
        setError("Нийтлэлүүдийг ачаалж чадсангүй.");
    });
    return () => controller.abort();
  }, [companyId, loadPosts, userId, retry]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = parseMglClubPost(draft);
    if (!companyId || pending) return;
    if (!input) {
      setError(
        "Нийтлэлийн гарчиг, агуулгыг хоосон зайгаар бус, бүрэн бөглөнө үү.",
      );
      return;
    }
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await authFetch(
        `${API}/forms/mgl-club/my-companies/${companyId}/posts${postId ? `/${postId}` : ""}`,
        { method: postId ? "PATCH" : "POST", body: JSON.stringify(input) },
      );
      const result: { message?: string; post?: MglClubPost } =
        await response.json();
      if (!response.ok)
        throw new Error(result.message || "Нийтлэл хадгалж чадсангүй.");
      if (result.post) setPostId(result.post.id);
      setNotice(
        input.published
          ? "Нийтлэлийг байгууллагын хуудсанд нийтэллээ."
          : "Нооргийг хадгаллаа. Нийтэд харагдахгүй.",
      );
      await loadPosts(companyId);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Нийтлэл хадгалж чадсангүй.",
      );
    } finally {
      setPending(false);
    }
  }
  if (authLoading)
    return (
      <p role="status" className={styles.manager}>
        Бүртгэлийг ачаалж байна…
      </p>
    );
  if (!user)
    return (
      <section className={styles.manager}>
        <h1>Байгууллагын удирдлага</h1>
        <p>
          Байгууллагын мэдээллийг удирдахын тулд систем админаар нэвтэрнэ үү.
        </p>
        <Link href="/mgl-club/profile">Миний клуб рүү нэвтрэх ↗</Link>
      </section>
    );
  return (
    <section className={styles.manager}>
      <Link href="/mgl-club/profile">← Миний клуб</Link>
      <h1>Байгууллагын удирдлага</h1>
      <p>
        Байгууллагын мэдээ, бүтээгдэхүүн, үйлчилгээний шинэчлэлээ нийтлээрэй.
      </p>
      <div className={styles.toolbar}>
        {!!companies.length && (
          <label>
            Байгууллага
            <select
              value={companyId}
              disabled={pending}
              onChange={(event) => {
                setCompanyId(event.target.value);
                setPostId("");
                setDraft(emptyPost);
                setPosts([]);
                setCursor(null);
                setError("");
                setNotice("");
              }}
            >
              {companies.map((company) => (
                <option value={company.id} key={company.id}>
                  {company.businessName}
                </option>
              ))}
            </select>
          </label>
        )}

        {companyId && (
          <p>
            <Link href={`/mgl-club/site-builder/${companyId}`}>
              Вэб танилцуулгын section-уудаа засах ↗
            </Link>
          </p>
        )}
        {companyId && (
          <Link href={`/mgl-club/companies/${companyId}`}>
            Байгууллагын хуудас үзэх ↗
          </Link>
        )}
      </div>
      {error && (
        <div role="alert" className={styles.error}>
          {error}{" "}
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Дахин ачаалах
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}
      {loading && <p role="status">Байгууллагуудыг ачаалж байна…</p>}
      {!loading && !companies.length && (
        <p>
          Одоогоор байгууллага бүртгэгдээгүй байна.{" "}
          <Link href="/mgl-club/join">Байгууллага нэмэх</Link>
        </p>
      )}
      {companyId && (
        <div className={styles.workspace}>
          <aside
            className={styles.postList}
            aria-label="Байгууллагын нийтлэлүүд"
          >
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setPostId("");
                setDraft(emptyPost);
                setNotice("");
              }}
            >
              + Шинэ нийтлэл
            </button>
            {posts.map((post) => (
              <button
                type="button"
                key={post.id}
                disabled={pending}
                aria-pressed={postId === post.id}
                onClick={() => {
                  setPostId(post.id);
                  setDraft({
                    title: post.title,
                    body: post.body,
                    published: post.published,
                  });
                  setNotice("");
                }}
              >
                {post.title}
                <span>{post.published ? "Нийтлэгдсэн" : "Ноорог"}</span>
              </button>
            ))}
            {cursor && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setPending(true);
                  void loadPosts(companyId, cursor)
                    .catch(() => setError("Нийтлэлүүдийг ачаалж чадсангүй."))
                    .finally(() => setPending(false));
                }}
              >
                Өмнөх нийтлэлүүд
              </button>
            )}
          </aside>
          <form className={styles.editor} onSubmit={save}>
            <h2>{postId ? "Нийтлэл засах" : "Шинэ нийтлэл"}</h2>
            <label>
              Гарчиг
              <input
                type="text"
                required
                maxLength={160}
                value={draft.title}
                disabled={pending}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </label>
            <label>
              Нийтлэлийн агуулга
              <textarea
                required
                maxLength={12000}
                value={draft.body}
                disabled={pending}
                onChange={(event) =>
                  setDraft({ ...draft, body: event.target.value })
                }
              />
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={draft.published}
                disabled={pending}
                onChange={(event) =>
                  setDraft({ ...draft, published: event.target.checked })
                }
              />
              Нийтэд харагдуулах
            </label>
            <p className={styles.note}>
              Сонголтыг унтрааж хадгалбал зөвхөн таны бүртгэлд ноорог болж
              үлдэнэ.
            </p>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                type="submit"
                disabled={pending}
              >
                {pending
                  ? "Хадгалж байна…"
                  : draft.published
                    ? "Нийтлэх"
                    : "Ноорог хадгалах"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
