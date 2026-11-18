"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ImageIcon, Pencil, Plus, Trash2, X, ArrowUpRight } from "lucide-react";
import {
  isClubWebsiteImage,
  type ClubSectionItem,
  type ClubWebsiteAccess,
  type ClubWebsiteTheme,
} from "@mgl/types";
import { resolveApiAssetUrl } from "@/lib/api";
import { WebsiteImageField } from "./WebsiteImageField";
import styles from "./site-builder.module.css";

type ProductProps = {
  companyId: string;
  items: ClubSectionItem[];
  onChange: (items: ClubSectionItem[]) => void;
  onBusy: (busy: boolean) => void;
  onAccessDenied: (access: ClubWebsiteAccess) => void;
  disabled: boolean;
  demo: boolean;
  theme?: ClubWebsiteTheme;
  tone: "light" | "dark";
};

export function CompanyProductEditor(props: ProductProps) {
  const [editing, setEditing] = useState<{
    index: number | null;
    item: ClubSectionItem;
  } | null>(null);
  return (
    <div className={styles.productList}>
      <div className={styles.productListHeading}>
        <h3>Манай бүтээгдэхүүн / үйлчилгээ</h3>
        <span>{props.items.length} / 8</span>
      </div>
      {props.items.length === 0 && (
        <p className={styles.help}>
          Бүтээгдэхүүний нэр, тайлбар, зургийг тус бүрээр нь нэмнэ үү.
        </p>
      )}
      {props.items.map((item, index) => (
        <article className={styles.productCard} key={index}>
          <div className={styles.productThumbnail}>
            {item.imageUrl && isClubWebsiteImage(item.imageUrl) ? (
              <Image
                src={
                  item.imageUrl.startsWith("/api/")
                    ? resolveApiAssetUrl(item.imageUrl)
                    : item.imageUrl
                }
                alt={item.imageAlt || item.title}
                width={64}
                height={64}
                unoptimized
              />
            ) : (
              <ImageIcon size={22} aria-hidden="true" />
            )}
          </div>
          <div className={styles.productBrief}>
            <strong>{item.title || "Нэр оруулаагүй"}</strong>
            <p>{item.text || "Тайлбар оруулаагүй"}</p>
          </div>
          <div className={styles.productActions}>
            <button
              type="button"
              disabled={props.disabled}
              onClick={() => setEditing({ index, item })}
              aria-label={`${item.title || "Бүтээгдэхүүн"} засах`}
            >
              <Pencil size={15} />
              <span>Засах</span>
            </button>
            <button
              type="button"
              disabled={props.disabled}
              aria-label={`${item.title || "Бүтээгдэхүүн"} хасах`}
              onClick={() => {
                if (
                  window.confirm(
                    `“${item.title || "Бүтээгдэхүүн"}”-ийг нооргоос хасах уу?`,
                  )
                )
                  props.onChange(props.items.filter((_, i) => i !== index));
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </article>
      ))}
      <button
        type="button"
        disabled={props.disabled || props.items.length >= 8}
        onClick={() =>
          setEditing({
            index: null,
            item: { title: "", text: "", imageUrl: "", imageAlt: "" },
          })
        }
      >
        <Plus size={16} /> Бүтээгдэхүүн нэмэх
      </button>
      {editing && (
        <ProductDialog
          {...props}
          initial={editing.item}
          adding={editing.index === null}
          onClose={() => setEditing(null)}
          onApply={(item) => {
            if (props.disabled) return;
            if (editing.index === null) {
              if (props.items.length >= 8) return;
              props.onChange([...props.items, item]);
            } else
              props.onChange(
                props.items.map((current, index) =>
                  index === editing.index ? item : current,
                ),
              );
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductDialog({
  initial,
  adding,
  onClose,
  onApply,
  ...props
}: ProductProps & {
  initial: ClubSectionItem;
  adding: boolean;
  onClose: () => void;
  onApply: (item: ClubSectionItem) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [draft, setDraft] = useState<ClubSectionItem>({ ...initial });
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    node?.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
    return () => node?.close();
  }, []);
  const close = () => {
    if (!uploading) onClose();
  };
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={styles.productDialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        className={styles.productDialogForm}
        onSubmit={(event) => {
          event.preventDefault();
          if (!props.disabled && !uploading && draft.title.trim())
            onApply({
              ...draft,
              title: draft.title.trim(),
              text: draft.text.trim(),
            });
        }}
      >
        <header className={styles.productDialogHeader}>
          <div>
            <h2 id={titleId}>
              {adding ? "Бүтээгдэхүүн нэмэх" : "Бүтээгдэхүүн засах"}
            </h2>
            <p>Мэдээллээ бөглөж, зураг сонгоно уу.</p>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={close}
            aria-label="Цонх хаах"
          >
            <X size={19} />
          </button>
        </header>
        <div className={styles.productDialogWorkspace}>
          <div className={`${styles.editor} ${styles.productDialogBody}`}>
            <fieldset
              disabled={props.disabled || uploading}
              className={styles.fields}
            >
              <label>
                Бүтээгдэхүүн, үйлчилгээний нэр
                <input
                  type="text"
                  value={draft.title}
                  required
                  maxLength={160}
                  autoFocus
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Тайлбар
                <textarea
                  rows={4}
                  value={draft.text}
                  maxLength={1000}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      text: event.target.value,
                    }))
                  }
                />
              </label>
            </fieldset>
            <WebsiteImageField
              companyId={props.companyId}
              url={draft.imageUrl}
              alt={draft.imageAlt}
              onChange={(patch) =>
                setDraft((current) => ({ ...current, ...patch }))
              }
              onBusy={(busy) => {
                setUploading(busy);
                props.onBusy(busy);
              }}
              demo={props.demo}
              disabled={props.disabled}
              onAccessDenied={props.onAccessDenied}
            />
          </div>
          <ProductDraftPreview
            item={draft}
            theme={props.theme}
            tone={props.tone}
            index={adding ? props.items.length : props.items.indexOf(initial)}
            adding={adding}
          />
        </div>
        <footer className={styles.productDialogFooter}>
          <p>
            Хэрэглэсний дараа үндсэн ноорогт орно. Нийтэд харагдуулахын тулд
            “Нийтлэх” дарна.
          </p>
          <div>
            <button type="button" disabled={uploading} onClick={close}>
              Болих
            </button>
            <button
              type="submit"
              className={styles.primary}
              disabled={props.disabled || uploading || !draft.title.trim()}
            >
              {uploading
                ? "Зураг оруулж байна…"
                : adding
                  ? "Ноорогт оруулах"
                  : "Өөрчлөлтийг хэрэглэх"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}

function ProductDraftPreview({
  item,
  theme,
  tone,
  index,
  adding,
}: {
  item: ClubSectionItem;
  theme?: ClubWebsiteTheme;
  tone: "light" | "dark";
  index: number;
  adding: boolean;
}) {
  const primary = theme?.primaryColor || "#0f3e2e";
  const background = theme?.backgroundColor || "#ffffff";
  const brightness =
    Number.parseInt(background.slice(1, 3), 16) * 0.299 +
    Number.parseInt(background.slice(3, 5), 16) * 0.587 +
    Number.parseInt(background.slice(5, 7), 16) * 0.114;
  const previewStyle: CSSProperties = {
    background:
      tone === "dark"
        ? `color-mix(in srgb, ${primary} 75%, #050d18)`
        : background,
    color: tone === "dark" || brightness < 135 ? "#eef3f8" : "#17251d",
  };
  return (
    <aside
      className={styles.productDraftPreview}
      aria-label="Бүтээгдэхүүний шууд харагдац"
    >
      <header>
        <strong>Шууд харагдац</strong>
        <p>Зөвхөн энэ цонхны ноорог · бичих бүрд шинэчлэгдэнэ</p>
      </header>
      <div className={styles.productPreviewCanvas} style={previewStyle}>
        <article className={styles.productPreviewCard}>
          {item.imageUrl && isClubWebsiteImage(item.imageUrl) && (
            <div className={styles.productPreviewImage}>
              <Image
                src={
                  item.imageUrl.startsWith("/api/")
                    ? resolveApiAssetUrl(item.imageUrl)
                    : item.imageUrl
                }
                alt={item.imageAlt || item.title || "Бүтээгдэхүүний зураг"}
                width={480}
                height={360}
                unoptimized
              />
            </div>
          )}
          <div className={styles.productPreviewNumber}>
            <span>{String(Math.max(0, index) + 1).padStart(2, "0")}</span>
            <ArrowUpRight size={24} aria-hidden="true" />
          </div>
          <h3>{item.title || "Бүтээгдэхүүний нэр"}</h3>
          {item.text && <p>{item.text}</p>}
        </article>
      </div>
      <p className={styles.help}>
        “{adding ? "Ноорогт оруулах" : "Өөрчлөлтийг хэрэглэх"}” дарахад үндсэн
        танилцуулгад орно.
      </p>
    </aside>
  );
}
