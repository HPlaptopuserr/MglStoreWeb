import type { BusinessCardData } from "@mgl/ui";

type Props = {
  cardData: BusinessCardData;
  qrPreviewUrl: string;
};

export function CardDetailsPanel({ cardData, qrPreviewUrl }: Props) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 space-y-1.5">
      <p>
        <span className="font-semibold text-slate-800">Нэр: </span>
        {cardData.name}
      </p>
      {cardData.category && (
        <p>
          <span className="font-semibold text-slate-800">Ангилал: </span>
          {cardData.category}
        </p>
      )}
      {cardData.phone && (
        <p>
          <span className="font-semibold text-slate-800">Утас: </span>
          {cardData.phone}
        </p>
      )}
      {cardData.address && (
        <p>
          <span className="font-semibold text-slate-800">Хаяг: </span>
          {cardData.address}
        </p>
      )}
      <div className="pt-2 mt-2 border-t border-slate-200">
        <p className="text-xs font-semibold text-slate-500 mb-1">
          QR шалгах линк (хэвлэгдэхгүй)
        </p>
        <a
          href={qrPreviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 break-all underline underline-offset-2"
        >
          {qrPreviewUrl}
        </a>
      </div>
    </div>
  );
}
