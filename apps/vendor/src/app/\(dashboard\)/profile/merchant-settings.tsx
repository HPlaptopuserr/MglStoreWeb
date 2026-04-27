"use client";

import { useState } from "react";
import { Copy, RotateCcw, Loader2, Check, AlertCircle } from "lucide-react";
import { API, authFetch } from "@/lib/api";

type MerchantStatus = {
  isConnected: boolean;
  merchantId: string | null;
  connectedAt: string | null;
  orgName: string;
};

export function MerchantSettingsSection() {
  const [merchantStatus, setMerchantStatus] = useState<MerchantStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [merchantKey, setMerchantKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Load merchant status on mount
  React.useEffect(() => {
    loadMerchantStatus();
  }, []);

  const loadMerchantStatus = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API}/vendor/merchant/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMerchantStatus(data);
        }
      }
    } catch (error) {
      console.error("Failed to load merchant status", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!merchantId.trim() || !merchantKey.trim()) {
      setMessage({
        type: "error",
        text: "Мерчант ID ба key хоёулаа шаардлагатай",
      });
      return;
    }

    setIsConnecting(true);
    setMessage(null);

    try {
      const res = await authFetch(`${API}/vendor/merchant/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchantId.trim(),
          merchantKey: merchantKey.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: data.message,
        });
        setMerchantId("");
        setMerchantKey("");
        setShowForm(false);
        await loadMerchantStatus();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Холбохэд алдаа гарлаа",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Серверийн алдаа",
      });
      console.error("Connect error", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Мерчант данс сүүлэм салгахыг сайн санаж байна уу?")) {
      return;
    }

    setIsConnecting(true);
    setMessage(null);

    try {
      const res = await authFetch(`${API}/vendor/merchant/disconnect`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: data.message,
        });
        await loadMerchantStatus();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Салгахэд алдаа гарлаа",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Серверийн алдаа",
      });
      console.error("Disconnect error", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Ачаалж байна...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {merchantStatus?.isConnected ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-emerald-900">
                Мерчант данс холбогдсон
              </h3>
              <p className="text-sm text-emerald-700">
                QPay multimerchant платформтой холбогдсон байна
              </p>
              {merchantStatus.connectedAt && (
                <p className="text-xs text-emerald-600 mt-1">
                  Холбогдсон: {new Date(merchantStatus.connectedAt).toLocaleDateString(
                    "mn-MN",
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">
                Мерчант данс угалхгүй
              </h3>
              <p className="text-sm text-amber-700">
                QPay multimerchant платформтой холбохын тулд доор мерчант
                мэдээллээ оруулна уу
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Connected Info */}
      {merchantStatus?.isConnected && merchantStatus?.merchantId && (
        <div className="space-y-4 rounded-xl bg-slate-50 p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900">
            Холбогдсон мерчант мэдээлэл
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Мерчант ID
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={merchantStatus.merchantId}
                readOnly
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900"
              />
              <button
                onClick={() => copyToClipboard(merchantStatus.merchantId, "id")}
                className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
                title="Хуулах"
              >
                {copied === "id" ? (
                  <Check className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={handleDisconnect}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Мерчант салгах
            </button>
          </div>
        </div>
      )}

      {/* Connect Form */}
      {!merchantStatus?.isConnected && (
        <div className="space-y-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full rounded-lg bg-[#5B4CFF] hover:bg-[#4A3CDB] text-white font-semibold py-3 transition-colors"
            >
              Мерчант данс холбох
            </button>
          ) : (
            <div className="space-y-4 rounded-xl bg-slate-50 p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900">
                Мерчант мэдээллээ оруулна уу
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Мерчант ID
                </label>
                <input
                  type="text"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  placeholder="Ваш мерчант ID"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Мерчант Key
                </label>
                <input
                  type="password"
                  value={merchantKey}
                  onChange={(e) => setMerchantKey(e.target.value)}
                  placeholder="Ваш мерчант key"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-200">
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || !merchantId || !merchantKey}
                  className="flex-1 rounded-lg bg-[#5B4CFF] hover:bg-[#4A3CDB] text-white font-semibold py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Холбож байна...
                    </>
                  ) : (
                    "Холбох"
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setMerchantId("");
                    setMerchantKey("");
                    setMessage(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold py-2 transition-colors"
                >
                  Цуцлах
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <p className="text-xs text-blue-700">
          <strong>Сан:</strong> Та QPay multimerchant платформын мерчант ID ба
          key-г оруулснаар үйлчилгээний төлбөрийг хүлээн аваж болно.
        </p>
      </div>
    </div>
  );
}
