import { env } from "../../config/env";

// Email templates for auth links. Email apps only support simple HTML, so this uses tables,
// inline styles and emoji (no <style> tags, no SVG). Rounded "hills" show as plain blocks in Outlook.

interface EmailContent {
  subject: string;
  html: string;
  text: string; // plain-text version for email apps that don't show HTML
}

interface LayoutOptions {
  preheader: string; // short preview line shown next to the subject in the inbox
  badge: string; // emoji in the circle above the title
  title: string;
  message: string; // may contain HTML (already escaped)
  buttonLabel: string;
  link: string;
  note: string;
  footnote: string;
}

// The user's name and email are user input, so they are escaped before going into HTML.
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const COLORS = {
  page: "#f4f1fb",
  frame: "#ede7fb",
  purple: "#7c3aed",
  purpleDark: "#5b21b6",
  hillBack: "#c4b5fd",
  hillFront: "#a78bfa",
  text: "#1f2937",
  muted: "#6b7280",
};

const FONT = "font-family:'Segoe UI',Arial,Helvetica,sans-serif;";

// Footer links: open the app, or ask for help (Contact Support is inside the app)
function footerLinks() {
  const item = (emoji: string, title: string, linkText: string, href: string) => `
    <td align="center" valign="top" width="33%" style="padding:0 6px;${FONT}color:#ffffff;font-size:13px;line-height:1.5;">
      <div style="display:inline-block;width:36px;height:36px;line-height:36px;border-radius:18px;background:${COLORS.purpleDark};font-size:18px;">${emoji}</div>
      <div style="margin-top:6px;">${title}</div>
      <a href="${href}" style="color:#ffffff;font-weight:bold;text-decoration:underline;">${linkText}</a>
    </td>`;

  return `
    <tr>
      ${item("🎓", "Ready to start?", "Sign in", `${env.CLIENT_URL}/login`)}
      ${item("💬", "Questions?", "We're here to help", env.CLIENT_URL)}
      ${item("🛡️", "Your records", "Stay private", env.CLIENT_URL)}
    </tr>`;
}

// Playful card: logo, friendly message with one big button, a little school on a hill, footer links
function emailLayout({ preheader, badge, title, message, buttonLabel, link, note, footnote }: LayoutOptions) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0;padding:0;background:${COLORS.page};">
    <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

            <!-- Logo -->
            <tr>
              <td align="center" style="padding:8px 0 20px;${FONT}">
                <span style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:20px;background:${COLORS.purple};font-size:20px;vertical-align:middle;">🎓</span>
                <span style="font-size:24px;font-weight:800;color:${COLORS.purple};vertical-align:middle;letter-spacing:1px;">&nbsp;SCA</span>
                <div style="font-size:12px;color:${COLORS.muted};margin-top:4px;">School Counselor Associate</div>
              </td>
            </tr>

            <!-- Card on a soft colored frame -->
            <tr>
              <td style="background:${COLORS.frame};border-radius:20px 20px 0 0;padding:28px 24px 4px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;">
                  <tr>
                    <td align="center" style="padding:32px 28px 8px;${FONT}color:${COLORS.text};">
                      <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:32px;background:${COLORS.frame};font-size:32px;">${badge}</div>
                      <h1 style="margin:16px 0 12px;font-size:24px;line-height:1.3;">${title}</h1>
                      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#374151;">${message}</p>
                      <a href="${link}" style="display:inline-block;background:${COLORS.purple};color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 36px;border-radius:999px;">${buttonLabel}</a>
                      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${COLORS.muted};">${note}</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:20px 28px 24px;${FONT}font-size:14px;line-height:1.6;color:#374151;">
                      <div style="border-top:1px dashed #ddd6fe;padding-top:20px;">Have a wonderful day! 💜<br><strong>The SCA Team</strong></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Little scene across the full width: clouds, sun, a school between trees on the hill -->
            <tr>
              <td style="background:${COLORS.frame};padding:0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:20px 0 0 28px;font-size:30px;">☁️<span style="font-size:20px;">&nbsp;&nbsp;☁️</span></td>
                    <td align="right" style="padding:12px 32px 0 0;font-size:38px;">☀️</td>
                  </tr>
                  <tr>
                    <td colspan="2" align="center" style="padding-top:2px;">
                      <div style="background:${COLORS.hillBack};border-radius:50% 50% 0 0 / 80px 80px 0 0;padding:18px 0 8px;font-size:32px;line-height:1;">🌳&nbsp;🏫&nbsp;🌳</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:${COLORS.hillFront};height:18px;font-size:0;line-height:0;">&nbsp;</td>
            </tr>

            <!-- Footer links -->
            <tr>
              <td style="background:${COLORS.purple};border-radius:0 0 20px 20px;padding:22px 12px 26px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${footerLinks()}</table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:20px 12px 8px;${FONT}font-size:12px;line-height:1.6;color:${COLORS.muted};">
                ${footnote}<br>This link is private. Please don't forward this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function confirmationEmail(name: string, email: string, link: string): EmailContent {
  const footnote = "This link expires in 24 hours. If you didn't create an SCA account, you can ignore this email.";
  const emailTag = `<strong style="color:#7c3aed;">${escapeHtml(email)}</strong>`;

  return {
    subject: "Confirm your email 🎉",
    html: emailLayout({
      preheader: "One click and you're all set!",
      badge: "✉️",
      title: `Hi ${escapeHtml(name)}! 👋`,
      message: `Welcome aboard! Please confirm that ${emailTag} is your email address. One click and you're signed in and ready to go.`,
      buttonLabel: "Confirm my email",
      link,
      note: "🔒 Student records in SCA are encrypted and only you can see your cases.",
      footnote,
    }),
    text: `Hi ${name}!\n\nWelcome aboard! Please confirm that ${email} is your email address.\n\nConfirm your email: ${link}\n\n${footnote}`,
  };
}

export function resetPasswordEmail(name: string, email: string, link: string): EmailContent {
  const footnote = "This link expires in 1 hour. If you didn't ask to reset your password, you can ignore this email.";

  return {
    subject: "Reset your password 🔑",
    html: emailLayout({
      preheader: "Let's get you back in.",
      badge: "🔑",
      title: `Hi ${escapeHtml(name)}! 👋`,
      message: `Forgot your password? No worries, it happens! Click the button below to choose a new one for <strong style="color:#7c3aed;">${escapeHtml(email)}</strong>.`,
      buttonLabel: "Reset my password",
      link,
      note: "🔒 For your safety, this link works only once.",
      footnote,
    }),
    text: `Hi ${name}!\n\nForgot your password? Click the link below to choose a new one for ${email}.\n\nReset your password: ${link}\n\n${footnote}`,
  };
}

// Developer team invitation. `inviterName` is the developer who sent it.
export function invitationEmail(inviterName: string, email: string, link: string): EmailContent {
  const footnote = "This invitation expires in 72 hours. If you weren't expecting it, you can ignore this email.";

  return {
    subject: "You're invited to the SCA developer team 🚀",
    html: emailLayout({
      preheader: `${inviterName} invited you to join the SCA developer team.`,
      badge: "🛠️",
      title: "You're invited! 🎉",
      message: `<strong>${escapeHtml(inviterName)}</strong> invited <strong style="color:#7c3aed;">${escapeHtml(email)}</strong> to join the SCA developer team. Create your developer account to start handling bug reports and feature requests.`,
      buttonLabel: "Create my developer account",
      link,
      note: "🔒 This link only works for the invited email address.",
      footnote,
    }),
    text: `${inviterName} invited ${email} to join the SCA developer team.\n\nCreate your developer account: ${link}\n\n${footnote}`,
  };
}
