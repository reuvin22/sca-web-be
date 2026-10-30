// Email templates for auth links. Inline styles only, because most email apps ignore <style> tags.

// The user's name is user input, so it is escaped before going into HTML.
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

interface EmailContent {
  subject: string;
  html: string;
  text: string; // plain-text version for email apps that don't show HTML
}

interface LayoutOptions {
  title: string;
  greeting: string;
  message: string;
  buttonLabel: string;
  link: string;
  footnote: string;
}

const APP_NAME = "School Counselor Associate System";

// Shared card layout: header, message, one button, fallback link and footer
function emailLayout({ title, greeting, message, buttonLabel, link, footnote }: LayoutOptions) {
  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial, Helvetica, sans-serif; color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="background:#111827; padding:20px 32px; color:#ffffff; font-size:16px; font-weight:bold;">${APP_NAME}</td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px; font-size:22px;">${title}</h1>
                <p style="margin:0 0 12px; font-size:15px; line-height:1.6;">${greeting}</p>
                <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#374151;">${message}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                  <tr>
                    <td style="background:#111827; border-radius:8px;">
                      <a href="${link}" style="display:inline-block; padding:14px 28px; color:#ffffff; font-size:15px; font-weight:bold; text-decoration:none;">${buttonLabel}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px; font-size:13px; color:#6b7280; line-height:1.6;">${footnote}</p>
                <p style="margin:0; font-size:13px; color:#6b7280; line-height:1.6;">
                  If the button doesn't work, copy this link into your browser:<br>
                  <a href="${link}" style="color:#2563eb; word-break:break-all;">${link}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px; background:#f9fafb; font-size:12px; color:#9ca3af; text-align:center;">
                This link is private. Don't forward this email to anyone.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function confirmationEmail(name: string, link: string): EmailContent {
  const greeting = `Hi ${escapeHtml(name)},`;
  const message = `Thanks for registering. Click the button below to confirm your email address. You'll be signed in right away.`;
  const footnote = "This link expires in 24 hours. If you didn't create an account, you can ignore this email.";

  return {
    subject: "Confirm your email",
    html: emailLayout({ title: "Confirm your email", greeting, message, buttonLabel: "Confirm my email", link, footnote }),
    text: `Hi ${name},\n\n${message}\n\nConfirm your email: ${link}\n\n${footnote}`,
  };
}

export function resetPasswordEmail(name: string, link: string): EmailContent {
  const greeting = `Hi ${escapeHtml(name)},`;
  const message = "We received a request to reset your password. Click the button below to choose a new one.";
  const footnote = "This link expires in 1 hour. If you didn't ask to reset your password, you can ignore this email.";

  return {
    subject: "Reset your password",
    html: emailLayout({ title: "Reset your password", greeting, message, buttonLabel: "Reset password", link, footnote }),
    text: `Hi ${name},\n\n${message}\n\nReset your password: ${link}\n\n${footnote}`,
  };
}
