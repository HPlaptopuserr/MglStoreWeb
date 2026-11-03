"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  PaymentAccountForm,
  DEFAULT_SYSTEMQR_LOCATION,
  type ContractPaymentAccount,
  type SystemQrCity,
  type SystemQrCategory,
  type SystemQrKhoroo,
} from "@mgl/ui";
import { paymentRequest } from "./payment-request";

interface Props {
  warehouseId: string;
  warehouseName: string;
  onConnected: (accountId: string) => Promise<void>;
}

function ConnectForm({
  warehouseId,
  warehouseName,
  onConnected,
  onClose,
}: Props & { onClose: () => void }) {
  const [config, setConfig] = useState<Partial<ContractPaymentAccount>>({
    ...DEFAULT_SYSTEMQR_LOCATION,
    merchantName: warehouseName,
    bankCode: "050000",
  });
  const [cities, setCities] = useState<SystemQrCity[]>([]);
  const [categories, setCategories] = useState<SystemQrCategory[]>([]);
  const [khoroos, setKhoroos] = useState<SystemQrKhoroo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const endpoint = `/warehouses/${encodeURIComponent(warehouseId)}/payment-account`;
  useEffect(() => {
    const controller = new AbortController();
    void paymentRequest<{
      cities: SystemQrCity[];
      categories: SystemQrCategory[];
    }>(`${endpoint}/catalog`, { signal: controller.signal })
      .then((data) => {
        setCities(data.cities);
        setCategories(data.categories);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Minu мэдээллийг ачаалж чадсангүй.",
          );
      });
    return () => controller.abort();
  }, [endpoint, attempt]);
  useEffect(() => {
    if (!config.districtId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setKhoroos([]);
    void paymentRequest<{ khoroos: SystemQrKhoroo[] }>(
      `${endpoint}/catalog?districtId=${encodeURIComponent(config.districtId)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        setKhoroos(data.khoroos);
        if (!data.khoroos.length)
          setError("Сонгосон дүүргийн хороо/багийн жагсаалт алга байна.");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Хорооны мэдээллийг ачаалж чадсангүй.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, config.districtId, attempt]);
  const change = (field: string, value: string | boolean) =>
    setConfig((current) => ({ ...current, [field]: value }));
  return (
    <PaymentAccountForm
      config={config}
      cities={cities}
      categories={categories}
      districts={
        cities.find((city) => city.code === config.cityId)?.districts || []
      }
      khoroos={khoroos}
      khoroosLoading={loading}
      khoroosError={error}
      retryKhoroos={() => setAttempt((value) => value + 1)}
      connecting={busy}
      checking={false}
      notice={null}
      allowExisting={false}
      onChange={change}
      onCityChange={(cityId) =>
        setConfig((current) => ({
          ...current,
          cityId,
          districtId:
            cities.find((city) => city.code === cityId)?.districts?.[0]?.code ||
            "",
          khorooId: "",
        }))
      }
      onDistrictChange={(districtId) =>
        setConfig((current) => ({ ...current, districtId, khorooId: "" }))
      }
      onClose={() => {
        if (!busy) onClose();
      }}
      onSubmit={async () => {
        setBusy(true);
        try {
          const result = await paymentRequest<{ paymentAccountId: string }>(
            `${endpoint}/connect`,
            {
              method: "POST",
              body: JSON.stringify({
                ...config,
                bank_accounts: [
                  {
                    account_bank_code: config.bankCode,
                    account_number: config.accountNumber,
                    account_name:
                      config.corporateName ||
                      `${config.lastName || ""} ${config.firstName || ""}`.trim(),
                    is_default: true,
                  },
                ],
              }),
            },
          );
          await onConnected(result.paymentAccountId);
          return true;
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

export function WarehousePaymentAccountConnector(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Plus className="size-4" aria-hidden="true" /> QR данс холбох
      </button>
      {open && <ConnectForm {...props} onClose={() => setOpen(false)} />}
    </>
  );
}
