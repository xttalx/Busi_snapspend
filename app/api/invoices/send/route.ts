import { badRequest, getUserFromRequest, unauthorized } from "@/lib/billing/auth";
import { getSiteUrl } from "@/lib/billing/config";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const MAX_PDF_CHARS = 8_000_000;

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return unauthorized();

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Marten Bookkeeping <noreply@martenbooks.com>";
  if (!apiKey) {
    return Response.json(
      {
        fallback: true,
        error: "Server email is not configured. Set RESEND_API_KEY to send invoices from the app.",
      },
      { status: 501 }
    );
  }

  let body: {
    to?: string;
    subject?: string;
    message?: string;
    filename?: string;
    pdfBase64?: string;
    invoiceNumber?: string;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON.");
  }

  const to = String(body.to || "").trim();
  const subject = String(body.subject || "").trim() || "Invoice";
  const message = String(body.message || "").trim();
  const filename = (String(body.filename || "invoice.pdf").replace(/[^\w.\-]+/g, "_") || "invoice.pdf");
  const pdfBase64 = String(body.pdfBase64 || "").replace(/\s/g, "");
  const invoiceNumber = String(body.invoiceNumber || "").trim();

  if (!EMAIL_RE.test(to)) return badRequest("Enter a valid recipient email.");
  if (!pdfBase64 || pdfBase64.length < 80) return badRequest("Invoice PDF is missing.");
  if (pdfBase64.length > MAX_PDF_CHARS) return badRequest("Invoice PDF is too large to email.");

  const site = getSiteUrl();
  const html = `
    <div style="font-family:Arial,sans-serif;color:#171614;line-height:1.5;max-width:560px">
      <p style="white-space:pre-wrap">${escapeHtml(message || `Please find invoice ${invoiceNumber || ""} attached.`)}</p>
      <p style="color:#6b6560;font-size:13px">Sent with <a href="${site}">Marten Bookkeeping</a>.</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text: message || `Please find invoice ${invoiceNumber || ""} attached.`,
      attachments: [{ filename, content: pdfBase64 }],
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return Response.json(
      { error: json?.message || json?.error || "Could not send email." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true, id: json.id || null });
}
