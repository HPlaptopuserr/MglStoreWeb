"use client";

import { merchantInputClass } from "./constants";
import type { City, District, Khoroo } from "./types";

export function MerchantLocationFields({
  city,
  district,
  khorooId,
  cities,
  districts,
  khoroos,
  citiesLoading,
  khoroosLoading,
  khoroosError,
  onCityChange,
  onDistrictChange,
  onKhorooChange,
  onRetryCities,
  onRetryKhoroos,
}: {
  city: string;
  district: string;
  khorooId: string;
  cities: City[];
  districts: District[];
  khoroos: Khoroo[];
  citiesLoading: boolean;
  khoroosLoading: boolean;
  khoroosError: string;
  onCityChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onKhorooChange: (value: string) => void;
  onRetryCities: () => void;
  onRetryKhoroos: () => void;
}) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-600">
        Аймаг/Хот *
        <select
          value={city}
          onChange={(event) => onCityChange(event.target.value)}
          disabled={citiesLoading || !cities.length}
          className={merchantInputClass}
        >
          <option value="">
            {citiesLoading ? "Ачаалж байна…" : "Хот / аймгаа сонгоно уу"}
          </option>
          {cities.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {!citiesLoading && !cities.length && (
        <p role="alert" className="text-xs text-red-600">
          Minu-ийн хот, аймгийн жагсаалт ирээгүй байна.{" "}
          <button
            type="button"
            onClick={onRetryCities}
            className="font-semibold underline"
          >
            Дахин ачаалах
          </button>
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-600">
        Дүүрэг/Сум *
        <select
          value={district}
          onChange={(event) => onDistrictChange(event.target.value)}
          disabled={!districts.length}
          className={merchantInputClass}
        >
          <option value="">
            {city
              ? "Дүүрэг / сумаа сонгоно уу"
              : "Эхлээд хот / аймгаа сонгоно уу"}
          </option>
          {districts.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-600">
        Хороо/Баг *
        <select
          value={khoroos.some((item) => item.code === khorooId) ? khorooId : ""}
          onChange={(event) => onKhorooChange(event.target.value)}
          disabled={khoroosLoading || !khoroos.length}
          className={merchantInputClass}
        >
          <option value="">
            {khoroosLoading
              ? "Ачаалж байна…"
              : district
                ? "Хороо / багаа сонгоно уу"
                : "Эхлээд дүүрэг / сумаа сонгоно уу"}
          </option>
          {khoroos.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {khoroosError && (
        <p role="alert" className="text-xs text-red-600">
          {khoroosError}{" "}
          <button
            type="button"
            onClick={onRetryKhoroos}
            className="font-semibold underline"
          >
            Дахин ачаалах
          </button>
        </p>
      )}
    </>
  );
}
