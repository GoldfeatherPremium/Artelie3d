/**
 * Email adapter (see docs/CONTRACTS.md §7).
 *
 * Two providers:
 * - "console"  → default; logs the payload to the server console.
 * - "resend"   → used when `EMAIL_PROVIDER_API_KEY` is set; sends via the
 *                Resend REST API.
 */

/** Available email template names used across the platform. */
export const EMAIL_TEMPLATES = [
  "welcome",
  "verify",
  "reset",
  "order_confirmation",
  "payment_confirmation",
  "shipping",
  "delivery",
  "refund",
  "seller_approval",
  "product_approval",
] as const;

export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  template?: string;
};

/** Base error for email adapter failures (CommerceError-compatible). */
export class EmailError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "EmailError";
    this.code = code;
  }
}

/**
 * Send an email. Uses the Resend provider when `EMAIL_PROVIDER_API_KEY` is
 * set; otherwise falls back to the "console" provider, which logs the message
 * to the server console (safe development default). Never logs secrets.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; provider: string }> {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  if (apiKey) {
    return sendViaResend(payload, apiKey);
  }
  console.log(
    "[email:console]",
    JSON.stringify({
      to: payload.to,
      subject: payload.subject,
      template: payload.template ?? null,
      text: payload.text,
    }),
  );
  return { ok: true, provider: "console" };
}

async function sendViaResend(
  payload: EmailPayload,
  apiKey: string,
): Promise<{ ok: boolean; provider: string }> {
  const fromName = process.env.EMAIL_FROM_NAME ?? "ATELIER 3D";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? "hello@atelier3d.example";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      ...(payload.html ? { html: payload.html } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new EmailError("RESEND_REQUEST_FAILED", `Resend API error ${response.status}: ${detail}`);
  }

  return { ok: true, provider: "resend" };
}
