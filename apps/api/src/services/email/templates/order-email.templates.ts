import { emailLayout, infoRows, safe } from "../email-layout";
import type { EmailTemplate } from "../email.types";

export const orderEmailTemplates = {
  pickupRequest(input: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    pickupAddress: string;
    total: number;
  }): EmailTemplate {
    return {
      subject: `Салбараас авах шинэ хүсэлт — #${input.orderNumber}`,
      text: [
        "Сайн байна уу.",
        "",
        "Танай дэлгүүрийн бараатай шинэ захиалгын хүсэлт ирлээ.",
        "",
        `Захиалагч: ${input.customerName}`,
        `Холбогдох утас: ${input.customerPhone}`,
        `Сонгосон байршил: ${input.pickupAddress}`,
        `Нийт дүн: ${input.total.toLocaleString()}₮`,
        "",
        "Хүргэлтийн салбар баталгаажаагүй тохиолдолд барааг салбараас авахад бэлтгэнэ үү.",
        "",
        "Хүндэтгэсэн,",
        "MGL Store",
      ].join("\n"),
      html: emailLayout({
        eyebrow: "Салбараас авах хүсэлт",
        title: "Шинэ захиалгын хүсэлт ирлээ",
        preview: `#${input.orderNumber} • ${input.customerName} • ${input.customerPhone}`,
        content: `<p style="font-size:15px;line-height:1.7;color:#334155">Сайн байна уу.</p>
          <p style="font-size:15px;line-height:1.7;color:#334155">Танай дэлгүүрийн бараатай шинэ захиалгын хүсэлт ирлээ. Хүргэлтийн салбар баталгаажаагүй тохиолдолд барааг салбараас авахад бэлтгэнэ үү.</p>
          ${infoRows([
            ["Захиалгын дугаар", `#${input.orderNumber}`],
            ["Захиалагч", input.customerName],
            ["Холбогдох утас", input.customerPhone],
            ["Сонгосон байршил", input.pickupAddress],
            ["Нийт дүн", `${input.total.toLocaleString()}₮`],
          ])}`,
      }),
    };
  },

  newOrder(input: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    total: number;
  }): EmailTemplate {
    return {
      subject: `Шинэ захиалгын мэдэгдэл — #${input.orderNumber}`,
      text: [
        "Сайн байна уу.",
        "",
        "Дараах шинэ захиалгын төлбөр амжилттай баталгаажсаныг мэдэгдье.",
        "",
        `Захиалагч: ${input.customerName}`,
        `Холбогдох утас: ${input.customerPhone}`,
        `Хүргэх хаяг: ${input.shippingAddress}`,
        `Нийт дүн: ${input.total.toLocaleString()}₮`,
        "",
        "Та захиалгын мэдээллийг хянан, бараа бэлтгэх ажиллагааг эхлүүлнэ үү.",
        "",
        "Хүндэтгэсэн,",
        "MGL Store",
      ].join("\n"),
      html: emailLayout({
        eyebrow: "Шинэ захиалга",
        title: "Шинэ захиалгын мэдэгдэл",
        preview: `#${input.orderNumber} • ${input.customerName} • ${input.customerPhone}`,
        content: `<p style="font-size:15px;line-height:1.7;color:#334155">Сайн байна уу.</p>
          <p style="font-size:15px;line-height:1.7;color:#334155">Дараах шинэ захиалгын төлбөр амжилттай баталгаажсаныг мэдэгдье. Та захиалгын мэдээллийг хянан, бараа бэлтгэх ажиллагааг эхлүүлнэ үү.</p>
          ${infoRows([
            ["Захиалгын дугаар", `#${input.orderNumber}`],
            ["Захиалагч", input.customerName],
            ["Холбогдох утас", input.customerPhone],
            ["Хүргэх хаяг", input.shippingAddress],
            ["Нийт дүн", `${input.total.toLocaleString()}₮`],
          ])}`,
      }),
    };
  },

  customerStatus(input: {
    subject: string;
    customerName: string;
    orderNumber: string;
    message: string;
  }): EmailTemplate {
    return {
      subject: `${input.subject} #${input.orderNumber}`,
      text: [
        `Сайн байна уу, ${input.customerName}.`,
        "",
        input.message,
        "",
        `Захиалгын дугаар: #${input.orderNumber}`,
        "",
        "Хүндэтгэсэн,",
        "MGL Store",
      ].join("\n"),
      html: emailLayout({
        eyebrow: "Захиалгын төлөв",
        title: input.subject,
        preview: input.message,
        content: `<p style="font-size:15px;line-height:1.7;color:#334155">Эрхэм <strong>${safe(input.customerName)}</strong>,</p>
          <p style="font-size:15px;line-height:1.7;color:#334155">${safe(input.message)}</p>
          ${infoRows([["Захиалгын дугаар", `#${input.orderNumber}`]])}`,
      }),
    };
  },
};
