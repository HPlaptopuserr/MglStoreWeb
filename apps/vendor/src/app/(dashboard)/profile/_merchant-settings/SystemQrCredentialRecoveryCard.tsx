import { KeyRound, Loader2 } from "lucide-react";

type SystemQrCredentialRecoveryCardProps = {
  merchantCode: string;
  credentialsStored: boolean;
  isSubmitting: boolean;
  onRecover: () => void;
};

export function SystemQrCredentialRecoveryCard({
  merchantCode,
  credentialsStored,
  isSubmitting,
  onRecover,
}: SystemQrCredentialRecoveryCardProps) {
  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-start gap-3">
        <KeyRound
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-violet-700"
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-violet-950">
            Minu Dynamic QR нэвтрэх эрх
          </p>
          <p className="break-all text-xs text-violet-800">
            Merchant code: {merchantCode}
          </p>
          <p className="text-xs leading-5 text-violet-800">
            {credentialsStored
              ? "Нэвтрэх эрх хадгалагдсан. QR үүсэхгүй эсвэл эрх буруу болсон үед сэргээнэ."
              : "Merchant code холбогдсон боловч тусгай нэвтрэх эрх хадгалагдаагүй байна."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRecover}
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <KeyRound aria-hidden="true" className="h-4 w-4" />
        )}
        {isSubmitting ? "Сэргээж байна..." : "Minu нэвтрэх эрх сэргээх"}
      </button>
    </div>
  );
}
