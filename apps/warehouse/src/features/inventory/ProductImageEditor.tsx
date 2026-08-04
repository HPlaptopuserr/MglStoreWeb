"use client";

import { useRef } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { ProductThumbnail } from "./ProductThumbnail";

const MAX_IMAGE_COUNT = 5;

interface ProductImageEditorProps {
  images: string[];
  productName: string;
  uploading: boolean;
  error: string | null;
  onAdd: (files: FileList) => void;
  onRemove: (index: number) => void;
}

export function ProductImageEditor({
  images,
  productName,
  uploading,
  error,
  onAdd,
  onRemove,
}: ProductImageEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = images.length < MAX_IMAGE_COUNT && !uploading;

  return (
    <section className="space-y-3 sm:col-span-2" aria-labelledby="product-images-label">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p
            id="product-images-label"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Барааны зураг
          </p>
          <p className="mt-1 text-xs text-slate-400">
            JPG, PNG эсвэл WebP · 5 хүртэл зураг
          </p>
        </div>
        <span className="text-xs font-medium text-slate-400">
          {images.length}/{MAX_IMAGE_COUNT}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {images.map((image, index) => (
          <div key={`${image}-${index}`} className="group relative aspect-square">
            <ProductThumbnail
              imageUrl={image}
              productName={`${productName} ${index + 1}`}
              className="h-full w-full"
              size={320}
              eager={index === 0}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={uploading}
              aria-label={`${index + 1}-р зургийг устгах`}
              className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-red-600 opacity-100 shadow-sm transition hover:bg-red-50 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-600 transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs font-semibold">Зураг нэмэх</span>
          </button>
        )}

        {uploading && (
          <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-xs font-medium">Хуулж байна...</span>
          </div>
        )}
      </div>

      {images.length === 0 && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <Upload className="h-5 w-5" />
          Зураг сонгох
        </button>
      )}

      {error && <p className="text-xs font-medium text-red-600" role="alert">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) onAdd(event.target.files);
          event.target.value = "";
        }}
      />
    </section>
  );
}

