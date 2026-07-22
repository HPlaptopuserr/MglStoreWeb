import { Loader2, Mail, Phone, User } from "lucide-react";

interface NewOperatorFormProps {
  fullName: string;
  email: string;
  phoneNumber: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function NewOperatorForm({
  fullName,
  email,
  phoneNumber,
  canSubmit,
  isSubmitting,
  onFullNameChange,
  onEmailChange,
  onPhoneNumberChange,
  onCancel,
  onSubmit,
}: NewOperatorFormProps) {
  const fields = [
    {
      label: "Нэр",
      value: fullName,
      placeholder: "Ажилтны бүтэн нэр",
      icon: User,
      onChange: onFullNameChange,
      type: "text",
    },
    {
      label: "Имэйл",
      value: email,
      placeholder: "operator@example.com",
      icon: Mail,
      onChange: onEmailChange,
      type: "email",
    },
    {
      label: "Утасны дугаар",
      value: phoneNumber,
      placeholder: "9900 0000",
      icon: Phone,
      onChange: onPhoneNumberChange,
      type: "tel",
    },
  ];
  return (
    <>
      {fields.map(
        ({ label, value, placeholder, icon: Icon, onChange, type }) => (
          <label key={label} className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <input
              type={type}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#5B4CFF] focus:ring-2 focus:ring-[#5B4CFF]/15"
            />
          </label>
        ),
      )}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          Болих
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4b3ee8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Бүртгэх
        </button>
      </div>
    </>
  );
}
