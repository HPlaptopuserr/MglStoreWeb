import type { SmsChallenge } from "./usePasswordFlow";
export function SmsInstructions({
  challenge,
  remaining,
}: {
  challenge: SmsChallenge;
  remaining: number;
}) {
  const validShortcode = /^\d+$/.test(challenge.shortcode);
  return (
    <div className="account-sms">
      <p>
        Бүртгэлтэй утаснаасаа <strong>{challenge.shortcode}</strong> дугаарт
        дараах текстийг SMS-ээр илгээнэ үү.
      </p>
      <strong className="account-code">{challenge.text}</strong>
      {remaining > 0 && validShortcode && (
        <a
          className="account-sms-link"
          href={`sms:${challenge.shortcode}?body=${encodeURIComponent(challenge.text)}`}
        >
          SMS апп нээх ↗
        </a>
      )}
      <p className="account-hint">
        Хоёр SIM-тэй бол бүртгэлтэй дугаараа сонгоно уу. Операторын SMS тариф
        үйлчилнэ.
      </p>
      <p aria-live="off">
        {remaining > 0
          ? `Хүчинтэй хугацаа: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
          : "Хугацаа дууслаа. Дахин эхлүүлнэ үү."}
      </p>
    </div>
  );
}
