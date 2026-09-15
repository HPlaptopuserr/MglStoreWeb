export function printWarehouseDocument(elementId: string, title: string) {
  const content = window.document.getElementById(elementId);
  if (!content) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`<!doctype html><html lang="mn"><head>
    <meta charset="utf-8" /><title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; color: #1e293b; font-family: Arial, sans-serif; }
      body { padding: 14mm; }
      article { width: 100%; }
      .header { text-align: center; border-bottom: 3px double #cbd5e1; padding-bottom: 16px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
      .info-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; break-inside: avoid; }
      .info-box .label { margin: 0; color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; }
      .info-box .value { margin: 4px 0 0; font-size: 14px; font-weight: 600; }
      .info-box .sub { margin: 2px 0 0; color: #64748b; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
      th { background: #f1f5f9; font-weight: 600; }
      .text-right, th.text-right, td.text-right { text-align: right; }
      .total-row td { background: #f8fafc; font-weight: 700; }
      footer, .signatures { break-inside: avoid; }
      @page { size: A4 portrait; margin: 0; }
    </style></head><body>${content.outerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character] || character;
  });
}
