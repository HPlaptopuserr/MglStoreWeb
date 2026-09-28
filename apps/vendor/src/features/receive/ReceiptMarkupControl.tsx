interface Props {
  value: string;
  onChange: (value: string) => void;
}
export function ReceiptMarkupControl({ value, onChange }: Props) {
  return (
    <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
      <label className="text-sm font-bold text-slate-800">
        Авсан үнэ дээр нэмэх хувь
        <input
          aria-label="Үнэ нэмэх хувь"
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Хувь"
          className="ml-3 h-10 w-24 rounded-lg border border-cyan-200 bg-white px-2"
        />{" "}
        %
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {[20, 30, 40].map((rate) => (
          <button
            key={rate}
            type="button"
            aria-pressed={value === String(rate)}
            onClick={() => onChange(String(rate))}
            className="rounded-lg border border-cyan-300 bg-white px-3 py-2 text-sm font-bold text-cyan-800 hover:bg-cyan-100"
          >
            +{rate}%
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Жишээ: 10,000₮ + 20% = 12,000₮. Одоо байгаа болон шинээр нэмэх мөрүүдэд
        үйлчилнэ. Гараар зассан зарах үнийг хадгална. Хүлээн авалтыг батлахад
        барааны үндсэн зарах үнэ шинэчлэгдэнэ.
      </p>
    </div>
  );
}
