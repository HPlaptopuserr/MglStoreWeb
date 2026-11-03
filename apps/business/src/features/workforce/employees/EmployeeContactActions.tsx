import { ArrowUpRight, Mail, Phone } from "lucide-react";
export function EmployeeContactActions({
  email,
  phone,
}: {
  email: string;
  phone: string;
}) {
  const phoneHref = /^[+\d\s()-]+$/.test(phone)
    ? `tel:${phone.replace(/[^+\d]/g, "")}`
    : undefined;
  return (
    <div
      className="wf-profile-contact-actions"
      aria-label="Холбоо барих мэдээлэл"
    >
      {phoneHref ? (
        <a href={phoneHref}>
          <Phone size={18} aria-hidden="true" />
          <span>
            <small>Утас</small>
            <strong>{phone}</strong>
          </span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      ) : (
        <div>
          <Phone size={18} aria-hidden="true" />
          <span>
            <small>Утас</small>
            <strong>{phone || "Утас бүртгээгүй"}</strong>
          </span>
        </div>
      )}
      {email ? (
        <a href={`mailto:${encodeURIComponent(email)}`}>
          <Mail size={18} aria-hidden="true" />
          <span>
            <small>Имэйл</small>
            <strong>{email}</strong>
          </span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      ) : (
        <div>
          <Mail size={18} aria-hidden="true" />
          <span>
            <small>Имэйл</small>
            <strong>Имэйл бүртгээгүй</strong>
          </span>
        </div>
      )}
    </div>
  );
}
