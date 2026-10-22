import { Settings2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import {
  type LabelPrintSettings,
  type LabelPrintLayout,
  type PaperPreset,
  type LabelPriceMode,
} from "./layout";

interface Props {
  priceMode: LabelPriceMode;
  onPriceModeChange: (mode: LabelPriceMode) => void;
  settings: LabelPrintSettings;
  layout: LabelPrintLayout;
  onChange: (settings: LabelPrintSettings) => void;
}
const selectClass =
  "h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

export function PrintSettingsBar({
  settings,
  layout,
  onChange,
  priceMode,
  onPriceModeChange,
}: Props) {
  const thermal = settings.paperPreset === "THERMAL";
  const update = <Key extends keyof LabelPrintSettings>(
    key: Key,
    value: LabelPrintSettings[Key],
  ) => onChange({ ...settings, [key]: value });
  return (
    <div className="max-h-[34vh] shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50 px-5 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mb-1 flex items-center gap-2 self-center text-slate-700">
          <Settings2 size={16} />
          <span className="text-xs font-black">Хэвлэх тохиргоо</span>
        </div>
        <SettingsField label="Хэвлэх үнэ">
          <select
            value={priceMode}
            onChange={(event) =>
              onPriceModeChange(
                event.target.value === "wholesale" ? "wholesale" : "retail",
              )
            }
            className={selectClass}
          >
            <option value="retail">Энгийн үнэ</option>
            <option value="wholesale">Бөөний үнэ</option>
          </select>
        </SettingsField>
        <SettingsField label="Цаас / принтер">
          <select
            value={settings.paperPreset}
            onChange={(event) =>
              onChange({
                ...settings,
                paperPreset: event.target.value as PaperPreset,
                margin: event.target.value === "THERMAL" ? 2 : 4,
              })
            }
            className={selectClass}
          >
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="LETTER">Letter</option>
            <option value="CUSTOM">Тусгай цаас</option>
            <option value="THERMAL">Кассын принтер</option>
          </select>
        </SettingsField>
        {thermal ? (
          <>
            <SettingsField label="Рулоны хэмжээ">
              <select
                value={
                  [58, 80].includes(settings.thermalWidth)
                    ? String(settings.thermalWidth)
                    : "custom"
                }
                onChange={(event) => {
                  if (event.target.value !== "custom")
                    update("thermalWidth", Number(event.target.value));
                }}
                className={selectClass}
              >
                <option value="58">58 мм</option>
                <option value="80">80 мм</option>
                <option value="custom">Тусгай хэмжээ</option>
              </select>
            </SettingsField>
            <SettingsNumberField
              label="Цаасны өргөн"
              value={settings.thermalWidth}
              min={40}
              max={120}
              onChange={(value) => update("thermalWidth", value)}
            />
            <SettingsNumberField
              label="Нэг шошгоны цаасны урт"
              value={settings.thermalHeight}
              min={24}
              max={300}
              onChange={(value) => update("thermalHeight", value)}
            />
          </>
        ) : (
          <>
            {settings.paperPreset === "CUSTOM" && (
              <>
                <SettingsNumberField
                  label="Цаасны өргөн"
                  value={settings.customPaperWidth}
                  min={20}
                  max={500}
                  onChange={(value) => update("customPaperWidth", value)}
                />
                <SettingsNumberField
                  label="Цаасны өндөр"
                  value={settings.customPaperHeight}
                  min={20}
                  max={500}
                  onChange={(value) => update("customPaperHeight", value)}
                />
              </>
            )}
            <SettingsField label="Чиглэл">
              <select
                disabled={settings.paperPreset === "CUSTOM"}
                value={settings.orientation}
                onChange={(event) =>
                  update(
                    "orientation",
                    event.target.value === "portrait"
                      ? "portrait"
                      : "landscape",
                  )
                }
                className={selectClass}
              >
                <option value="portrait">Босоо</option>
                <option value="landscape">Хэвтээ</option>
              </select>
            </SettingsField>
            <SettingsField label="Шошгоны загвар">
              <select
                value={getLabelPreset(
                  settings.labelWidth,
                  settings.labelHeight,
                )}
                onChange={(event) => {
                  const [width, height] = event.target.value
                    .split("x")
                    .map(Number);
                  if (width && height)
                    onChange({
                      ...settings,
                      labelWidth: width,
                      labelHeight: height,
                    });
                }}
                className={selectClass}
              >
                <option value="144.5x67.3">Том (144.5 × 67.3)</option>
                <option value="100x50">Дунд (100 × 50)</option>
                <option value="70x40">Жижиг (70 × 40)</option>
                <option value="50x30">Мини (50 × 30)</option>
                <option value="custom" disabled>
                  Тусгай хэмжээ
                </option>
              </select>
            </SettingsField>
            <SettingsNumberField
              label="Шошгоны өргөн"
              value={settings.labelWidth}
              min={20}
              max={300}
              onChange={(value) => update("labelWidth", value)}
            />
            <SettingsNumberField
              label="Шошгоны өндөр"
              value={settings.labelHeight}
              min={20}
              max={300}
              onChange={(value) => update("labelHeight", value)}
            />
            <SettingsNumberField
              label="Зай"
              value={settings.gap}
              min={0}
              max={20}
              onChange={(value) => update("gap", value)}
            />
          </>
        )}
        {thermal && (
          <SettingsNumberField
            label="Шошго хоорондын зай"
            value={settings.gap}
            min={0}
            max={20}
            onChange={(value) => update("gap", value)}
          />
        )}
        <SettingsNumberField
          label="Зах"
          value={settings.margin}
          min={0}
          max={20}
          onChange={(value) => update("margin", value)}
        />
        <p
          role="status"
          className={`ml-auto rounded-lg px-3 py-2 text-xs font-bold ${layout.fitsOnPage ? "bg-sky-100 text-sky-800" : "bg-rose-100 text-rose-700"}`}
        >
          {layout.fitsOnPage
            ? thermal
              ? "Доошоо цуваа / нэг рулон"
              : `${layout.columns} × ${layout.rows} · ${layout.labelsPerPage} шошго/хуудас`
            : "Шошго цаасанд багтахгүй байна"}
        </p>
      </div>
      {thermal && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Хэвлэх цонхноос кассын принтерээ сонгож, дээрх цаасны хэмжээтэй
          тааруулна уу. Масштаб 100%, толгой/хөл хэсэггүй хэвлэнэ. Цаасны урт нь
          нэг шошгонд зарцуулах урт; сонгосон бүх шошго доошоо дараалан нэг
          рулон дээр хэвлэгдэнэ.
        </p>
      )}
    </div>
  );
}
function getLabelPreset(width: number, height: number) {
  return (
    ["144.5x67.3", "100x50", "70x40", "50x30"].find(
      (preset) => preset === `${width}x${height}`,
    ) ?? "custom"
  );
}
function SettingsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
function SettingsNumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const commit = (raw: string) => {
    const next = Number(raw);
    if (!raw.trim() || !Number.isFinite(next) || next < min || next > max) {
      setError(true);
      return;
    }
    setError(false);
    onChange(Math.round(next * 10) / 10);
  };
  return (
    <SettingsField label={`${label} (мм)`}>
      <input
        type="number"
        inputMode="decimal"
        value={editing ?? value}
        min={min}
        max={max}
        step="0.1"
        aria-invalid={error}
        aria-describedby={error ? id : undefined}
        onChange={(event) => {
          setEditing(event.target.value);
          commit(event.target.value);
        }}
        onBlur={() => {
          setEditing(null);
          setError(false);
        }}
        className={`${selectClass} w-24 tabular-nums`}
      />
      {error && (
        <span id={id} role="alert" className="text-[10px] text-rose-700">
          {min}–{max} мм оруулна уу
        </span>
      )}
    </SettingsField>
  );
}
