const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const safe = (value: unknown) => escapeHtml(String(value ?? ""));

export function emailLayout(input: {
  eyebrow?: string;
  title: string;
  preview: string;
  content: string;
}) {
  return `<!doctype html>
<html lang="mn">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safe(input.title)}</title>
  </head>
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
    <div style="display:none;max-height:0;overflow:hidden">${safe(input.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.08)">
          <tr><td style="background:#0f172a;padding:24px 28px;color:#ffffff">
            <div style="font-size:20px;font-weight:800">MGL Store</div>
            ${input.eyebrow ? `<div style="margin-top:8px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#93c5fd">${safe(input.eyebrow)}</div>` : ""}
          </td></tr>
          <tr><td style="padding:30px 28px">
            <h1 style="margin:0 0 20px;font-size:25px;line-height:1.25">${safe(input.title)}</h1>
            ${input.content}
          </td></tr>
          <tr><td style="border-top:1px solid #e2e8f0;padding:20px 28px;font-size:12px;line-height:1.6;color:#64748b">
            Хүндэтгэсэн,<br />
            <strong>MGL Store</strong><br /><br />
            Энэ нь системээс автоматаар илгээсэн мэдэгдэл тул хариу бичих шаардлагагүй.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function infoRows(rows: Array<[string, unknown]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:11px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px">${safe(label)}</td><td align="right" style="padding:11px 14px;border-bottom:1px solid #e2e8f0;font-weight:700;font-size:13px">${safe(value)}</td></tr>`,
      )
      .join("")}
  </table>`;
}

export function primaryCode(code: string) {
  return `<div style="margin:24px 0;padding:18px;border-radius:14px;background:#eff6ff;text-align:center;font-size:32px;font-weight:900;letter-spacing:8px;color:#1d4ed8">${safe(code)}</div>`;
}

export function primaryButton(label: string, url: string) {
  return `<p style="margin:24px 0"><a href="${safe(url)}" style="display:inline-block;border-radius:12px;background:#2563eb;padding:13px 20px;color:#ffffff;text-decoration:none;font-weight:800">${safe(label)}</a></p>`;
}
