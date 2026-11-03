/** Pure helpers for the branded sign-in email. The Cloud Function in index.ts wires them up. */

export const SITE = "https://quarterscore.com";
const ALLOWED_ORIGINS = [SITE, "https://squares-4e4f7.web.app", "http://localhost:4200", "http://localhost:4300"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && email.length <= 254 && EMAIL.test(email);
}

/** Where the link lands. Unknown origins fall back to the live site; the path is always ours. */
export function continueUrl(origin: unknown): string {
  const base = typeof origin === "string" && ALLOWED_ORIGINS.includes(origin) ? origin : SITE;
  return `${base}/auth/email-link`;
}

/**
 * Firebase's generated link goes through firebaseapp.com first. Point it straight at our page instead:
 * the client SDK only needs mode, oobCode and apiKey in the URL to finish sign-in.
 */
export function directLink(generated: string, landing: string): string {
  const params = new URL(generated).searchParams;
  const out = new URL(landing);
  for (const key of ["apiKey", "oobCode", "mode", "lang"]) {
    const value = params.get(key);
    if (value) out.searchParams.set(key, value);
  }
  return out.toString();
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmail(link: string, email: string): { subject: string; html: string; text: string } {
  const safeLink = escapeHtml(link);
  const safeEmail = escapeHtml(email);
  const subject = "Your QuarterScore sign-in link";
  const text = [
    "Sign in to QuarterScore",
    "",
    "Open this link to sign in. It works once and expires in about an hour:",
    link,
    "",
    `This was requested for ${email}. If it wasn't you, ignore this email and nothing happens.`,
    "",
    "QuarterScore · quarterscore.com",
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f6f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffefc;border:1px solid #e4dfd6;border-radius:10px;">
        <tr><td style="border-bottom:1px solid #e4dfd6;padding:20px 28px;">
          <img src="${SITE}/icon-192.png" width="28" height="28" alt="" style="vertical-align:middle;border:0;">
          <span style="vertical-align:middle;margin-left:8px;font-size:18px;font-weight:700;color:#0f172a;">QuarterScore</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">Sign in to QuarterScore</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#5b6070;">Tap the button to sign in. No password needed. The link works once and expires in about an hour.</p>
          <a href="${safeLink}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:6px;">Sign in</a>
          <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#5b6070;">This was requested for ${safeEmail}. If it wasn't you, ignore this email and nothing happens.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#5b6070;">QuarterScore · <a href="${SITE}" style="color:#5b6070;">quarterscore.com</a></p>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html, text };
}
