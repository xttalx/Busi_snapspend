/* Printable document templates — Invoice & Paystub
   Branded color-block header (accent), serif title, mono numbers.
*/

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

async function rasterizeDocShell(shell) {
  if (!window.html2canvas) {
    throw new Error("PDF libraries missing. Refresh once and try again.");
  }

  const rect = shell.getBoundingClientRect();
  const width = Math.max(Math.ceil(rect.width), shell.scrollWidth, PDF_LETTER_WIDTH_PX);
  const height = Math.max(Math.ceil(shell.scrollHeight), shell.offsetHeight);

  return window.html2canvas(shell, {
    scale: 2,
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

function canvasToLetterPdf(canvas, fileName) {
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
  const img = canvas.toDataURL("image/jpeg", 0.92);

  const pdf = new jsPDF({ unit: "in", format: "letter", orientation: "portrait", compress: true });
  let offset = 0;
  let page = 0;

  while (offset < imgH) {
    if (page > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", PDF_MARGIN_IN, PDF_MARGIN_IN - offset, imgW, imgH);
    offset += contentH;
    page += 1;
  }

  pdf.save(fileName);
}

/** Capture the on-screen preview node exactly as rendered (WYSIWYG). */
async function downloadPreviewPdfFromElement(element, fileName) {
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
  await new Promise((r) => setTimeout(r, 100));

  try {
    const canvas = await rasterizeDocShell(shell);
    canvasToLetterPdf(canvas, fileName);
  } finally {
    shell.classList.remove("pdf-capture-snapshot");
  }
}

async function downloadInvoicePdf({ invoice, element }) {
  await downloadPreviewPdfFromElement(element, `${invoice.number || "invoice"}.pdf`);
}

async function downloadPaystubPdf({ stub, element }) {
  await downloadPreviewPdfFromElement(element, `paystub-${stub.id || Date.now()}.pdf`);
}

function InvoiceDocument({ invoice, client, business }) {
  const subtotal = invoice.items.reduce((s, it) => s + it.qty * it.rate, 0);
  const tax = subtotal * (invoice.taxRate || 0);
  const total = subtotal + tax;

  return (
    <div className="doc-shell">
      <div className="head-block">
        <div>
          <div className="doc-kicker">Invoice</div>
          <h1 className="doc-title" style={{ fontFamily: "Arial" }}>{business.name}</h1>
        </div>
        <div className="doc-num">
          <div>{invoice.number}</div>
          <div style={{ opacity: 0.7, marginTop: 4 }}>Issued {fmtDate(invoice.date)}</div>
        </div>
      </div>

      <div className="body-block">
        <div className="parties">
          <div>
            <div className="lbl">Billed to</div>
            <p className="name" style={{ fontFamily: "Arial" }}>{client.name}</p>
            <p>{client.address}</p>
            <p>{client.email}</p>
          </div>
          <div>
            <div className="lbl">From</div>
            <p className="name" style={{ fontFamily: "Arial" }}>{business.name}</p>
            <p>{business.address}</p>
            <p>{business.email}</p>
            {business.businessNo && <p>Business No.: {business.businessNo}</p>}
            {business.gstTaxId && <p>GST/Tax ID: {business.gstTaxId}</p>}
          </div>
        </div>

        <div className="summary-grid">
          <div className="cell">
            <div className="lbl">Invoice no.</div>
            <div className="val">{invoice.number}</div>
          </div>
          <div className="cell">
            <div className="lbl">Date of issue</div>
            <div className="val">{fmtDate(invoice.date)}</div>
          </div>
          <div className="cell">
            <div className="lbl">Due date</div>
            <div className="val">{fmtDate(invoice.due)}</div>
          </div>
        </div>

        <table className="items">
          <thead>
            <tr>
              <th>Description</th>
              <th className="num" style={{ width: 60 }}>Qty</th>
              <th className="num" style={{ width: 100 }}>Rate</th>
              <th className="num" style={{ width: 110 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) =>
            <tr key={i}>
                <td>
                  <div className="desc">{it.desc}</div>
                  {it.sub && <div className="sub">{it.sub}</div>}
                </td>
                <td className="num">{it.qty}</td>
                <td className="num">{fmtMoney(it.rate)}</td>
                <td className="num">{fmtMoney(it.qty * it.rate)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="totals">
          <div className="stack">
            <div className="row"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
            {invoice.taxRate > 0 &&
            <div className="row"><span>Tax · {(invoice.taxRate * 100).toFixed(2)}%</span><span>{fmtMoney(tax)}</span></div>
            }
            <div className="row grand"><span>Total due</span><span className="v">{fmtMoney(total)}</span></div>
          </div>
        </div>

        {invoice.notes &&
        <div className="footnote">
            <strong style={{ color: "#111", letterSpacing: "0.18em", fontSize: 9.5, textTransform: "uppercase", fontFamily: "var(--mono)", fontWeight: 500 }}>Notes</strong>
            <div style={{ marginTop: 6 }}>{invoice.notes}</div>
          </div>
        }
      </div>
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

window.InvoiceDocument = InvoiceDocument;
window.PaystubDocument = PaystubDocument;
window.downloadInvoicePdf = downloadInvoicePdf;
window.downloadPaystubPdf = downloadPaystubPdf;