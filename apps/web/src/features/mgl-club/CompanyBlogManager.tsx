"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  parseMglClubPost,
  type MglClubMember,
  type MglClubPost,
  type MglClubPostInput,
} from "@mgl/types";
import { API, authFetch } from "@/lib/api";
import styles from "./company-blog.module.css";
const emptyPost: MglClubPostInput = { title: "", body: "", published: false };
interface Props {
  company: MglClubMember;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}
export function CompanyBlogManager({
  company,
  onDirtyChange,
  onBusyChange,
}: Props) {
  const [posts, setPosts] = useState<MglClubPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [postId, setPostId] = useState("");
  const [draft, setDraft] = useState<MglClubPostInput>(emptyPost);
  const [baseline, setBaseline] = useState<MglClubPostInput>(emptyPost);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const dirty =
    draft.title !== baseline.title ||
    draft.body !== baseline.body ||
    draft.published !== baseline.published;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange(pending);
    return () => onBusyChange(false);
  }, [pending, onBusyChange]);
  const loadPosts = useCallback(
    async (after?: string, signal?: AbortSignal) => {
      const response = await authFetch(
        `${API}/forms/mgl-club/my-companies/${company.id}/posts${after ? `?cursor=${encodeURIComponent(after)}` : ""}`,
        { signal },
      );
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү."
            : response.status === 403
              ? "Нийтлэлийг зөвхөн систем админ удирдана."
              : "Нийтлэлүүдийг ачаалж чадсангүй.",
        );
      const page: { posts: MglClubPost[]; nextCursor: string | null } =
        await response.json();
      if (signal?.aborted) return;
      setPosts((previous) =>
        after ? [...previous, ...page.posts] : page.posts,
      );
      setCursor(page.nextCursor);
    },
    [company.id],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void loadPosts(undefined, controller.signal)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Нийтлэлүүдийг ачаалж чадсангүй.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loadPosts, retry]);
  function choosePost(post?: MglClubPost) {
    if (
      pending ||
      (dirty && !window.confirm("Хадгалаагүй нийтлэлийн засвараа орхих уу?"))
    )
      return;
    const next = post
      ? { title: post.title, body: post.body, published: post.published }
      : emptyPost;
    setPostId(post?.id || "");
    setDraft(next);
    setBaseline(next);
    setNotice("");
    setError("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = parseMglClubPost(draft);
    if (pending) return;
    if (!input) {
      setError("Нийтлэлийн гарчиг, агуулгыг бөглөнө үү.");
      return;
    }
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await authFetch(
        `${API}/forms/mgl-club/my-companies/${company.id}/posts${postId ? `/${postId}` : ""}`,
        { method: postId ? "PATCH" : "POST", body: JSON.stringify(input) },
      );
      const result: { message?: string; post?: MglClubPost } =
        await response.json();
      if (!response.ok || !result.post)
        throw new Error(result.message || "Нийтлэл хадгалж чадсангүй.");
      const saved = {
        title: result.post.title,
        body: result.post.body,
        published: result.post.published,
      };
      setPostId(result.post.id);
      setDraft(saved);
      setBaseline(saved);
      setNotice(
        input.published
          ? "Нийтлэлийг нийтэллээ."
          : "Нооргийг хадгаллаа. Нийтэд харагдахгүй.",
      );
      try {
        await loadPosts();
      } catch {
        setError(
          "Нийтлэл хадгалагдсан боловч жагсаалтыг шинэчилж чадсангүй. Дахин ачаална уу.",
        );
      }
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Нийтлэл хадгалж чадсангүй. Бичсэн мэдээлэл хэвээр байна.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={styles.managerInner}>
      <div className={styles.sectionIntro}>
        <h2>Мэдээ, нийтлэл</h2>
        <p>
          {company.businessName} байгууллагын шинэ бүтээгдэхүүн, үйлчилгээ, үйл
          ажиллагааны мэдээг оруулна.
        </p>
      </div>
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRetry((value) => value + 1)}
          >
            Жагсаалт дахин ачаалах
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}
      <div className={styles.workspace}>
        <aside className={styles.postList} aria-label="Байгууллагын нийтлэлүүд">
          <button type="button" disabled={pending} onClick={() => choosePost()}>
            + Шинэ нийтлэл
          </button>
          {loading && <p role="status">Нийтлэлүүдийг ачаалж байна…</p>}
          {!loading && !error && !posts.length && (
            <p className={styles.note}>Нийтлэл хараахан оруулаагүй байна.</p>
          )}
          {posts.map((post) => (
            <button
              type="button"
              key={post.id}
              disabled={pending}
              aria-pressed={postId === post.id}
              onClick={() => choosePost(post)}
            >
              {post.title}
              <span>{post.published ? "Нийтлэгдсэн" : "Ноорог"}</span>
            </button>
          ))}
          {cursor && (
            <button
              type="button"
              disabled={pending || loading}
              onClick={() => {
                setPending(true);
                void loadPosts(cursor)
                  .catch((cause: unknown) =>
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Нийтлэлүүдийг ачаалж чадсангүй.",
                    ),
                  )
                  .finally(() => setPending(false));
              }}
            >
              Өмнөх нийтлэлүүд
            </button>
          )}
        </aside>
        <form className={styles.editor} onSubmit={save}>
          <h3>{postId ? "Нийтлэл засах" : "Шинэ нийтлэл"}</h3>
          <label>
            Гарчиг
            <input
              type="text"
              required
              maxLength={160}
              value={draft.title}
              disabled={pending}
              onChange={(event) => {
                setDraft({ ...draft, title: event.target.value });
                setNotice("");
              }}
            />
          </label>
          <label>
            Нийтлэлийн агуулга
            <textarea
              required
              maxLength={12000}
              value={draft.body}
              disabled={pending}
              onChange={(event) => {
                setDraft({ ...draft, body: event.target.value });
                setNotice("");
              }}
            />
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={draft.published}
              disabled={pending}
              onChange={(event) => {
                setDraft({ ...draft, published: event.target.checked });
                setNotice("");
              }}
            />
            Нийтэд харагдуулах
          </label>
          <p className={styles.note}>
            Сонголтыг унтрааж хадгалбал зөвхөн админд харагдах ноорог болно.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.primary}
              type="submit"
              disabled={pending || !dirty}
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
    </div>
  );
}
