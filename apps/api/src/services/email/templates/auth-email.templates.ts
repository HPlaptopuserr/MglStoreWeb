import { emailLayout, primaryCode, safe } from "../email-layout";
import type { EmailTemplate } from "../email.types";

function otpTemplate(input: {
  subject: string;
  title: string;
  code: string;
  description: string;
  warning: string;
}): EmailTemplate {
  const text = [
    "Сайн байна уу.",
    "",
    input.description,
    "",
    `${input.title}: ${input.code}`,
    "",
    "Баталгаажуулах код нь 10 минутын хугацаанд хүчинтэй.",
    input.warning,
    "",
    "Хүндэтгэсэн,",
    "MGL Store",
  ].join("\n");
  return {
    subject: input.subject,
    text,
    html: emailLayout({
      eyebrow: "Аюулгүй байдал",
      title: input.title,
      preview: `${input.title}: ${input.code}`,
      content: `<p style="font-size:15px;line-height:1.7;color:#334155">Сайн байна уу.</p>
        <p style="font-size:15px;line-height:1.7;color:#334155">${safe(input.description)}</p>
        ${primaryCode(input.code)}
        <p style="font-size:15px;line-height:1.7;color:#334155">Баталгаажуулах код нь <strong>10 минутын хугацаанд</strong> хүчинтэй.</p>
        <p style="font-size:13px;line-height:1.6;color:#64748b">${safe(input.warning)}</p>`,
    }),
  };
}

export const authEmailTemplates = {
  loginOtp: (code: string) =>
    otpTemplate({
      subject: "MGL Store нэвтрэх баталгаажуулах код",
      title: "Нэвтрэх баталгаажуулах код",
      code,
      description:
        "Таны MGL Store системд нэвтрэх хүсэлтийг баталгаажуулах нэг удаагийн кодыг хүргүүлж байна.",
      warning:
        "Хэрэв та энэхүү хүсэлтийг гаргаагүй бол уг кодыг бусдад дамжуулахгүй байхыг хүсье.",
    }),

  passwordResetOtp: (code: string) =>
    otpTemplate({
      subject: "MGL Store нууц үг сэргээх код",
      title: "Нууц үг сэргээх код",
      code,
      description:
        "Таны гаргасан нууц үг сэргээх хүсэлтийг баталгаажуулах нэг удаагийн кодыг хүргүүлж байна.",
      warning:
        "Хэрэв та нууц үг сэргээх хүсэлт гаргаагүй бол уг кодыг бусдад дамжуулахгүй байхыг хүсье.",
    }),

  accountDeletionOtp: (code: string) =>
    otpTemplate({
      subject: "MGL Store бүртгэл устгах баталгаажуулах код",
      title: "Бүртгэл устгах баталгаажуулах код",
      code,
      description:
        "Таны MGL бүртгэлийг системээс бүрмөсөн устгах хүсэлтийг баталгаажуулах нэг удаагийн кодыг хүргүүлж байна.",
      warning:
        "АНХААРУУЛГА: Энэхүү кодыг оруулснаар таны бүртгэл болон хувийн мэдээлэл системээс устгагдах болно. Хэрэв та уг хүсэлтийг гаргаагүй бол кодыг хэнд ч бүү дамжуулаарай.",
    }),
};

