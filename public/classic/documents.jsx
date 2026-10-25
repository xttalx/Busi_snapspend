/* Printable document templates — Invoice, Estimate & Paystub */

const fmtMoney = (n, sym = "$") => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return sign + sym + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
window.fmtMoney = fmtMoney;
window.fmtDate = fmtDate;

function pdfCaptureTarget(element) {
  if (!element) return null;
  return element.querySelector?.(".doc-shell") || element;
}

const PDF_LETTER_WIDTH_PX = 816; /* 8.5in @ 96dpi — matches .doc-pdf-letter */
const PDF_MARGIN_IN = 0.35;

function fixPdfClone(clonedDoc, clonedShell, widthPx) {
  const w = `${widthPx}px`;
  clonedShell.style.width = w;
  clonedShell.style.minWidth = w;
  clonedShell.style.maxWidth = w;
  clonedShell.style.boxSizing = "border-box";
  clonedShell.style.visibility = "visible";
  clonedShell.style.opacity = "1";
  clonedShell.style.overflow = "visible";

  clonedDoc.querySelectorAll(".doc-pdf-letter, .invoice-lite-preview").forEach((root) => {
    root.style.cssText =
      "position:static;left:auto;top:auto;visibility:visible;opacity:1;overflow:visible;z-index:auto;pointer-events:none;";
  });

  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const accentInk = getComputedStyle(document.documentElement).getPropertyValue("--accent-ink").trim();
  if (accent) {
    clonedShell.querySelectorAll(".head-block").forEach((el) => {
      el.style.background = accent;
      if (accentInk) el.style.color = accentInk;
    });
  }
}

async function rasterizeDocShell(shell, { fast = false } = {}) {
  if (!window.html2canvas) {
    throw new Error("PDF libraries missing. Refresh once and try again.");
  }

  const rect = shell.getBoundingClientRect();
  const width = Math.max(Math.ceil(rect.width), shell.scrollWidth, PDF_LETTER_WIDTH_PX);
  const height = Math.max(Math.ceil(shell.scrollHeight), shell.offsetHeight);

  return window.html2canvas(shell, {
    scale: fast ? 1.25 : 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    logging: false,
    onclone: (clonedDoc, clonedShell) => fixPdfClone(clonedDoc, clonedShell, width),
  });
}

function canvasToLetterPdfDoc(canvas, { fast = false } = {}) {
  if (!window.jspdf?.jsPDF) {
    throw new Error("PDF libraries missing. Refresh once and try again.");
  }
  const { jsPDF } = window.jspdf;
  const pageW = 8.5;
  const pageH = 11;
  const contentW = pageW - PDF_MARGIN_IN * 2;
  const contentH = pageH - PDF_MARGIN_IN * 2;
  const imgW = contentW;
  const imgH = (canvas.height * contentW) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", fast ? 0.85 : 0.92);

  const pdf = new jsPDF({ unit: "in", format: "letter", orientation: "portrait", compress: true });
  let offset = 0;
  let page = 0;

  while (offset < imgH) {
    if (page > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", PDF_MARGIN_IN, PDF_MARGIN_IN - offset, imgW, imgH);
    offset += contentH;
    page += 1;
  }

  return pdf;
}

function canvasToLetterPdf(canvas, fileName, { fast = false } = {}) {
  canvasToLetterPdfDoc(canvas, { fast }).save(fileName);
}

/** Capture the on-screen preview node exactly as rendered (WYSIWYG). */
async function downloadPreviewPdfFromElement(element, fileName, { fast = false } = {}) {
  const shell = pdfCaptureTarget(element);
  if (!shell) {
    throw new Error("Preview document not found.");
  }

  const scrollTarget =
    element.closest?.(".invoice-lite-preview-slot, .invoice-lite-preview, .doc-pdf-letter, .doc-preview-col") ||
    shell;
  scrollTarget.scrollIntoView?.({ block: "nearest", inline: "nearest" });

  shell.classList.add("pdf-capture-snapshot");
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (!fast) await new Promise((r) => setTimeout(r, 50));

  try {
    const canvas = await rasterizeDocShell(shell, { fast });
    canvasToLetterPdf(canvas, fileName, { fast });
  } finally {
    shell.classList.remove("pdf-capture-snapshot");
  }
}

async function invoicePdfBase64FromElement(element, { fast = true } = {}) {
  const shell = pdfCaptureTarget(element);
  if (!shell) {
    throw new Error("Preview document not found.");
  }

  const scrollTarget =
    element.closest?.(".invoice-lite-preview-slot, .invoice-lite-preview, .doc-pdf-letter, .doc-preview-col") ||
    shell;
  scrollTarget.scrollIntoView?.({ block: "nearest", inline: "nearest" });

  shell.classList.add("pdf-capture-snapshot");
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (!fast) await new Promise((r) => setTimeout(r, 50));

  try {
    const canvas = await rasterizeDocShell(shell, { fast });
    const pdf = canvasToLetterPdfDoc(canvas, { fast });
    const dataUri = pdf.output("datauristring");
    return (dataUri.split(",")[1] || "").trim();
  } finally {
    shell.classList.remove("pdf-capture-snapshot");
  }
}

async function downloadInvoicePdf({ invoice, element, fast = false }) {
  await downloadPreviewPdfFromElement(element, `${invoice.number || "invoice"}.pdf`, { fast });
}

async function downloadPaystubPdf({ stub, element }) {
  await downloadPreviewPdfFromElement(element, `paystub-${stub.id || Date.now()}.pdf`);
}

async function downloadEstimatePdf({ estimate, element, fast = false }) {
  await downloadPreviewPdfFromElement(element, `${estimate.number || "estimate"}.pdf`, { fast });
}

/* ---------- Modern invoice / estimate template ---------- */
function DocHeader({ business, type, number }) {
  return (
    <div className="dm-top">
      <div className="dm-brand">
        <div className="dm-biz-name">{business.name}</div>
        <div className="dm-biz-lines">
          {business.address && <div className="dm-pre">{business.address}</div>}
          {business.email && <div>{business.email}</div>}
          {business.businessNo && <div>Business No. {business.businessNo}</div>}
          {business.gstTaxId && <div>GST/Tax ID {business.gstTaxId}</div>}
        </div>
      </div>
      <div className="dm-doc-id">
        <div className="dm-doc-type">{type}</div>
        <div className="dm-doc-num">{number}</div>
      </div>
    </div>);
}

function DocMeta({ cells }) {
  return (
    <div className="dm-meta">
      {cells.map((c) =>
      <div key={c.label} className={"dm-meta-cell" + (c.strong ? " is-strong" : "")}>
          <div className="dm-label">{c.label}</div>
          <div className="dm-meta-val">{c.value}</div>
        </div>
      )}
    </div>);
}

function DocItems({ items, headers }) {
  return (
    <table className="dm-items">
      <thead>
        <tr>
          <th>{headers[0]}</th>
          <th className="num dm-col-qty">{headers[1]}</th>
          <th className="num dm-col-rate">{headers[2]}</th>
          <th className="num dm-col-amt">{headers[3]}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => {
          const qty = Number(it.qty || 0);
          const rate = Number(it.rate || 0);
          return (
            <tr key={i}>
              <td>
                <div className="dm-desc">{it.desc || "—"}</div>
                {it.sub && <div className="dm-sub">{it.sub}</div>}
              </td>
              <td className="num">{it.qty}</td>
              <td className="num">{fmtMoney(rate)}</td>
              <td className="num">{fmtMoney(qty * rate)}</td>
            </tr>);
        })}
      </tbody>
    </table>);
}

function DocTotals({ rows, grandLabel, grand }) {
  return (
    <div className="dm-totals">
      {rows.map((r) =>
      <div key={r.label} className="dm-total-row"><span>{r.label}</span><span>{r.value}</span></div>
      )}
      <div className="dm-total-row is-grand"><span>{grandLabel}</span><span>{grand}</span></div>
    </div>);
}

function DocFooter({ business }) {
  const note = (business.invoiceFooter || "").trim() || "Thank you for your business.";
  return (
    <div className="dm-footer">
      <span>{note}</span>
      {business.email && <span>{business.email}</span>}
    </div>);
}

function InvoiceDocument({ invoice, client, business }) {
  const c = client || {};
  const subtotal = invoice.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0);
  const taxRate = Number(invoice.taxRate) || 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <div className="doc-shell doc-modern">
      <DocHeader business={business} type="Invoice" number={invoice.number} />

      <DocMeta cells={[
      { label: "Invoice no.", value: invoice.number || "—" },
      { label: "Issue date", value: fmtDate(invoice.date) },
      { label: "Due date", value: fmtDate(invoice.due) },
      { label: "Amount due", value: fmtMoney(total), strong: true }]
      } />

      <div className="dm-parties">
        <div className="dm-party">
          <div className="dm-label">Bill to</div>
          <div className="dm-party-name">{c.name || "—"}</div>
          {c.address && <div className="dm-pre">{c.address}</div>}
          {c.email && <div>{c.email}</div>}
        </div>
        {invoice.projectAddress &&
        <div className="dm-party">
            <div className="dm-label">Project address</div>
            <div className="dm-pre">{invoice.projectAddress}</div>
          </div>
        }
      </div>

      <DocItems items={invoice.items} headers={["Description", "Qty", "Rate", "Amount"]} />

      <div className="dm-summary">
        <div className="dm-notes">
          {invoice.notes &&
          <>
              <div className="dm-label">Notes</div>
              <div className="dm-pre">{invoice.notes}</div>
            </>
          }
        </div>
        <DocTotals
          rows={[
          { label: "Subtotal", value: fmtMoney(subtotal) },
          ...(taxRate > 0 ? [{ label: `Tax (${(taxRate * 100).toFixed(2)}%)`, value: fmtMoney(tax) }] : [])]
          }
          grandLabel="Total due"
          grand={fmtMoney(total)} />
      </div>

      <DocFooter business={business} />
    </div>);
}

function PaystubDocument({ stub, employee, business }) {
  const totalTax = stub.taxes.reduce((s, t) => s + t.v, 0);
  const totalDed = stub.deductions.reduce((s, t) => s + t.v, 0);
  const net = stub.gross - totalTax - totalDed;

  return (
    <div className="doc-shell">
      <div className="head-block">
        <div>
          <div className="doc-kicker">Pay statement</div>
          <h1 className="doc-title">{business.name}</h1>
        </div>
        <div className="doc-num">
          <div>Stub #{stub.id.toUpperCase()}</div>
          <div style={{ opacity: 0.7, marginTop: 4 }}>Issued {fmtDate(stub.issued)}</div>
        </div>
      </div>

      <div className="body-block">
        <div className="parties">
          <div>
            <div className="lbl">Paid to</div>
            <p className="name">{employee.name}</p>
            <p>{employee.role}</p>
            <p>Employee · since {employee.since}</p>
          </div>
          <div>
            <div className="lbl">Employer</div>
            <p className="name">{business.name}</p>
            <p>{business.address}</p>
            <p>EIN 00-0000000</p>
          </div>
        </div>

        <div className="summary-grid">
          <div className="cell">
            <div className="lbl">Pay period</div>
            <div className="val">{fmtDate(stub.periodStart)} → {fmtDate(stub.periodEnd)}</div>
          </div>
          <div className="cell">
            <div className="lbl">Pay date</div>
            <div className="val">{fmtDate(stub.issued)}</div>
          </div>
          <div className="cell">
            <div className="lbl">Net pay</div>
            <div className="val">{fmtMoney(net)}</div>
          </div>
        </div>

        <div className="paystub-grid">
          <div className="panel">
            <h4>Earnings</h4>
            {stub.earnings.map((e, i) =>
            <div className="li" key={i}><span>{e.k}</span><span>{fmtMoney(e.v)}</span></div>
            )}
            <div className="li total"><span>Gross pay</span><span>{fmtMoney(stub.gross)}</span></div>
          </div>
          <div className="panel">
            <h4>Taxes withheld</h4>
            {stub.taxes.map((e, i) =>
            <div className="li" key={i}><span>{e.k}</span><span>{fmtMoney(e.v)}</span></div>
            )}
            <div className="li total"><span>Total taxes</span><span>{fmtMoney(totalTax)}</span></div>
          </div>
        </div>

        {stub.deductions.length > 0 &&
        <div className="paystub-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="panel">
              <h4>Other deductions</h4>
              {stub.deductions.map((e, i) =>
            <div className="li" key={i}><span>{e.k}</span><span>{fmtMoney(e.v)}</span></div>
            )}
              <div className="li total"><span>Total deductions</span><span>{fmtMoney(totalDed)}</span></div>
            </div>
          </div>
        }

        <div className="totals">
          <div className="stack">
            <div className="row"><span>Gross</span><span>{fmtMoney(stub.gross)}</span></div>
            <div className="row"><span>Taxes</span><span>−{fmtMoney(totalTax)}</span></div>
            {totalDed > 0 && <div className="row"><span>Deductions</span><span>−{fmtMoney(totalDed)}</span></div>}
            <div className="row grand"><span>Net pay</span><span className="v">{fmtMoney(net)}</span></div>
          </div>
        </div>

        <div className="footnote">
          This statement is a record of wages earned and taxes withheld during the pay period above.
          Retain for your records. Questions? Contact {business.email}.
        </div>
      </div>
    </div>);

}

function EstimateDocument({ estimate, business }) {
  const items = estimate.items || [];
  const taxRate = Number(estimate.taxRate) || 0;
  const subtotal = items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0);
  const gst = subtotal * taxRate;
  const total = subtotal + gst;
  const taxLabel =
    (window.SEED?.COUNTRY_TAX_RATES && business?.country && window.SEED.COUNTRY_TAX_RATES[business.country]?.label) ||
    "GST";
  const drawing = estimate.drawing;
  const drawingSrc = drawing?.dataUrl || drawing?.url || null;
  const isDrawingImage = drawing && (
    (drawing.type && String(drawing.type).startsWith("image/")) ||
    (drawingSrc && String(drawingSrc).startsWith("data:image/"))
  );

  return (
    <div className="doc-shell doc-modern">
      <DocHeader business={business} type="Estimate" number={estimate.number} />

      <DocMeta cells={[
      { label: "Estimate no.", value: estimate.number || "—" },
      { label: "Issue date", value: fmtDate(estimate.date) },
      { label: "Valid until", value: fmtDate(estimate.validUntil) },
      { label: "Estimate total", value: fmtMoney(total), strong: true }]
      } />

      <div className="dm-parties">
        <div className="dm-party">
          <div className="dm-label">Prepared for</div>
          <div className="dm-party-name">{estimate.clientName || "—"}</div>
          {estimate.clientCompany && <div>{estimate.clientCompany}</div>}
          {estimate.clientAddress && <div className="dm-pre">{estimate.clientAddress}</div>}
          {estimate.clientEmail && <div>{estimate.clientEmail}</div>}
          {estimate.clientPhone && <div>{estimate.clientPhone}</div>}
        </div>
        {estimate.projectAddress &&
        <div className="dm-party">
            <div className="dm-label">Project address</div>
            <div className="dm-pre">{estimate.projectAddress}</div>
          </div>
        }
      </div>

      {drawing &&
      <div className="dm-drawing">
          <div className="dm-label">Job drawing</div>
          {isDrawingImage && drawingSrc ?
        <img src={drawingSrc} alt={drawing.name || "Drawing"} className="dm-drawing-img" /> :
        <div className="dm-drawing-file">{drawing.name || "Attached drawing"}</div>
        }
        </div>
      }

      <DocItems items={items} headers={["Work", "Qty", "Unit price", "Total"]} />

      <div className="dm-summary">
        <div className="dm-notes">
          {estimate.notes &&
          <>
              <div className="dm-label">Notes</div>
              <div className="dm-pre">{estimate.notes}</div>
            </>
          }
        </div>
        <DocTotals
          rows={[
          { label: "Subtotal", value: fmtMoney(subtotal) },
          { label: `${taxLabel} (${(taxRate * 100).toFixed(2)}%)`, value: fmtMoney(gst) }]
          }
          grandLabel={`Total (incl. ${taxLabel})`}
          grand={fmtMoney(total)} />
      </div>

      <div className="dm-accept">
        <div className="dm-sign">
          <div className="dm-sign-line" />
          <div className="dm-label">Accepted by (signature)</div>
        </div>
        <div className="dm-sign dm-sign-date">
          <div className="dm-sign-line" />
          <div className="dm-label">Date</div>
        </div>
      </div>

      <DocFooter business={business} />
    </div>
  );
}

window.InvoiceDocument = InvoiceDocument;
window.PaystubDocument = PaystubDocument;
window.EstimateDocument = EstimateDocument;
window.downloadInvoicePdf = downloadInvoicePdf;
window.downloadPaystubPdf = downloadPaystubPdf;
window.downloadEstimatePdf = downloadEstimatePdf;
window.invoicePdfBase64FromElement = invoicePdfBase64FromElement;