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

function currencySymbolFromCode(value) {
  const m = String(value || "").match(/\(([^)]+)\)/);
  return m && m[1] ? m[1] : "$";
}

function sanitizeLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function downloadInvoicePdf({ invoice, client, business }) {
  if (!window.jspdf?.jsPDF) {
    throw new Error("PDF library not loaded.");
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "in", format: [8.5, 11], compress: true });
  const pageW = 8.5;
  const pageH = 11;
  const margin = 0.55;
  const rightX = pageW - margin;
  const symbol = currencySymbolFromCode(business?.currency);
  const subtotal = invoice.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0);
  const tax = subtotal * Number(invoice.taxRate || 0);
  const total = subtotal + tax;
  let y = margin;

  const ensureSpace = (needed) => {
    if (y + needed <= pageH - margin) return;
    doc.addPage([8.5, 11], "portrait");
    y = margin;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INVOICE", margin, y);
  doc.setFontSize(10);
  doc.text(String(invoice.number || "—"), rightX, y, { align: "right" });
  y += 0.24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Issued ${fmtDate(invoice.date)}`, rightX, y, { align: "right" });
  y += 0.2;
  doc.setLineWidth(0.01);
  doc.line(margin, y, rightX, y);
  y += 0.16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("From", margin, y);
  doc.text("Billed to", margin + 3.7, y);
  y += 0.14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const fromLines = [
    business?.name || "—",
    ...sanitizeLines(business?.address),
    business?.email || "",
    business?.businessNo ? `Business No.: ${business.businessNo}` : "",
    business?.gstTaxId ? `GST/Tax ID: ${business.gstTaxId}` : "",
  ].filter(Boolean);
  const toLines = [
    client?.name || "—",
    ...sanitizeLines(client?.address),
    client?.email || "",
  ].filter(Boolean);
  const maxPartyLines = Math.max(fromLines.length, toLines.length);
  for (let i = 0; i < maxPartyLines; i++) {
    doc.text(fromLines[i] || "", margin, y);
    doc.text(toLines[i] || "", margin + 3.7, y);
    y += 0.14;
  }
  y += 0.08;

  doc.setFont("helvetica", "bold");
  doc.text("Description", margin, y);
  doc.text("Qty", margin + 4.7, y, { align: "right" });
  doc.text("Rate", margin + 5.8, y, { align: "right" });
  doc.text("Amount", rightX, y, { align: "right" });
  y += 0.08;
  doc.line(margin, y, rightX, y);
  y += 0.12;

  doc.setFont("helvetica", "normal");
  invoice.items.forEach((it) => {
    const descLines = doc.splitTextToSize(String(it.desc || "Item"), 4.35);
    const subLines = it.sub ? doc.splitTextToSize(String(it.sub), 4.35) : [];
    const rowLines = [...descLines, ...subLines];
    const rowHeight = Math.max(0.18, 0.13 * rowLines.length + 0.05);
    ensureSpace(rowHeight + 0.06);
    rowLines.forEach((line, idx) => {
      doc.text(line, margin, y + 0.12 + idx * 0.13);
    });
    const amount = Number(it.qty || 0) * Number(it.rate || 0);
    doc.text(String(it.qty || 0), margin + 4.7, y + 0.12, { align: "right" });
    doc.text(fmtMoney(Number(it.rate || 0), symbol), margin + 5.8, y + 0.12, { align: "right" });
    doc.text(fmtMoney(amount, symbol), rightX, y + 0.12, { align: "right" });
    doc.setLineWidth(0.004);
    doc.line(margin, y + rowHeight, rightX, y + rowHeight);
    y += rowHeight + 0.05;
  });

  y += 0.06;
  ensureSpace(0.9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", rightX - 1.4, y, { align: "right" });
  doc.text(fmtMoney(subtotal, symbol), rightX, y, { align: "right" });
  y += 0.16;
  if (invoice.taxRate > 0) {
    doc.text(`Tax ${(invoice.taxRate * 100).toFixed(2)}%`, rightX - 1.4, y, { align: "right" });
    doc.text(fmtMoney(tax, symbol), rightX, y, { align: "right" });
    y += 0.16;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total due", rightX - 1.4, y, { align: "right" });
  doc.text(fmtMoney(total, symbol), rightX, y, { align: "right" });
  y += 0.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Due ${fmtDate(invoice.due)}`, rightX, y, { align: "right" });

  if (invoice.notes || business?.invoiceFooter) {
    y += 0.32;
    ensureSpace(0.8);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", margin, y);
    doc.setFont("helvetica", "normal");
    const notes = [invoice.notes, business?.invoiceFooter].filter(Boolean).join("\n\n");
    const notesLines = doc.splitTextToSize(notes, rightX - margin);
    doc.text(notesLines, margin, y + 0.14);
  }

  doc.save(`${invoice.number || "invoice"}.pdf`);
}

function downloadPaystubPdf({ stub, employee, business }) {
  if (!window.jspdf?.jsPDF) {
    throw new Error("PDF library not loaded.");
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "in", format: [8.5, 11], compress: true });
  const margin = 0.55;
  const rightX = 8.5 - margin;
  const symbol = currencySymbolFromCode(business?.currency);
  const totalTax = (stub.taxes || []).reduce((s, t) => s + Number(t.v || 0), 0);
  const totalDed = (stub.deductions || []).reduce((s, t) => s + Number(t.v || 0), 0);
  const net = Number(stub.gross || 0) - totalTax - totalDed;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PAY STATEMENT", margin, y);
  doc.setFontSize(10);
  doc.text(`Stub ${String(stub.id || "").toUpperCase()}`, rightX, y, { align: "right" });
  y += 0.24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Issued ${fmtDate(stub.issued)}`, rightX, y, { align: "right" });
  y += 0.2;
  doc.line(margin, y, rightX, y);
  y += 0.16;

  doc.setFont("helvetica", "bold");
  doc.text("Employer", margin, y);
  doc.text("Paid to", margin + 3.9, y);
  y += 0.14;
  doc.setFont("helvetica", "normal");
  const employerLines = [
    business?.name || "—",
    ...sanitizeLines(business?.address),
    business?.email || "",
  ].filter(Boolean);
  const employeeLines = [
    employee?.name || "—",
    employee?.role || "",
    employee?.since ? `Employee since ${employee.since}` : "",
  ].filter(Boolean);
  const lineCount = Math.max(employerLines.length, employeeLines.length);
  for (let i = 0; i < lineCount; i++) {
    doc.text(employerLines[i] || "", margin, y);
    doc.text(employeeLines[i] || "", margin + 3.9, y);
    y += 0.14;
  }
  y += 0.08;

  doc.text(`Pay period: ${fmtDate(stub.periodStart)} to ${fmtDate(stub.periodEnd)}`, margin, y);
  doc.text(`Net pay: ${fmtMoney(net, symbol)}`, rightX, y, { align: "right" });
  y += 0.18;
  doc.line(margin, y, rightX, y);
  y += 0.14;

  const printRows = (title, rows, totalLabel, totalValue) => {
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 0.13;
    doc.setFont("helvetica", "normal");
    rows.forEach((r) => {
      doc.text(String(r.k || "—"), margin, y);
      doc.text(fmtMoney(Number(r.v || 0), symbol), rightX, y, { align: "right" });
      y += 0.13;
    });
    doc.setFont("helvetica", "bold");
    doc.text(totalLabel, margin, y);
    doc.text(fmtMoney(totalValue, symbol), rightX, y, { align: "right" });
    y += 0.2;
    doc.setFont("helvetica", "normal");
  };

  printRows("Earnings", stub.earnings || [], "Gross pay", Number(stub.gross || 0));
  printRows("Taxes withheld", stub.taxes || [], "Total taxes", totalTax);
  if ((stub.deductions || []).length) {
    printRows("Deductions", stub.deductions, "Total deductions", totalDed);
  }
  printRows("Summary", [
    { k: "Gross", v: Number(stub.gross || 0) },
    { k: "Taxes", v: -totalTax },
    { k: "Deductions", v: -totalDed },
  ], "Net pay", net);

  doc.save(`paystub-${stub.id || Date.now()}.pdf`);
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