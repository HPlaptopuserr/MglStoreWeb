import { emailLayout, primaryButton, safe } from "../email-layout";
import type { EmailTemplate } from "../email.types";

export const vendorEmailTemplates = {
  phoneConfirmation(input: {
    fullName?: string | null;
    organizationName?: string | null;
    phone: string | null;
    confirmUrl: string;
  }): EmailTemplate {
    const greeting = input.fullName
      ? `Эрхэм ${input.fullName},`
      : "Сайн байна уу.";
    const organization = input.organizationName || "Таны байгууллага";
    const phone = input.phone || "хоосон";
    return {
      subject: "Vendor нэвтрэх утасны өөрчлөлт баталгаажуулах тухай",
      text: [
        greeting,
        "",
        `${organization}-ийн vendor нэвтрэх утасны дугаарыг ${phone} болгон өөрчлөх хүсэлтийг системийн администратор бүртгэсэн байна.`,
        "",
        "Та энэхүү өөрчлөлтийг зөвшөөрч байгаа бол доорх холбоосоор баталгаажуулна уу:",
        input.confirmUrl,
        "",
        "Баталгаажуулах холбоос нь 24 цагийн хугацаанд хүчинтэй.",
        "Хэрэв та энэхүү өөрчлөлтийг хүсээгүй бол холбоосыг ашиглахгүй байхыг хүсье.",
        "",
        "Хүндэтгэсэн,",
        "MGL Store",
      ].join("\n"),
      html: emailLayout({
        eyebrow: "Vendor аюулгүй байдал",
        title: "Утасны өөрчлөлтийг баталгаажуулна уу",
        preview: `${organization}-ийн vendor нэвтрэх утас өөрчлөх хүсэлт`,
        content: `<p style="font-size:15px;line-height:1.7;color:#334155">${safe(greeting)}</p>
          <p style="font-size:15px;line-height:1.7;color:#334155"><strong>${safe(organization)}</strong>-ийн vendor нэвтрэх утасны дугаарыг <strong>${safe(phone)}</strong> болгон өөрчлөх хүсэлтийг системийн администратор бүртгэсэн байна.</p>
          <p style="font-size:15px;line-height:1.7;color:#334155">Та энэхүү өөрчлөлтийг зөвшөөрч байгаа бол доорх холбоосоор баталгаажуулна уу.</p>
          ${primaryButton("Өөрчлөлтийг баталгаажуулах", input.confirmUrl)}
          <p style="font-size:13px;line-height:1.6;color:#64748b">Баталгаажуулах холбоос нь 24 цагийн хугацаанд хүчинтэй. Хэрэв та энэхүү өөрчлөлтийг хүсээгүй бол холбоосыг ашиглахгүй байхыг хүсье.</p>`,
      }),
    };
  },
};
