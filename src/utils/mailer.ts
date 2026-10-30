import { env } from "../config/env";
import { ApiError } from "./apiError";

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string; // plain-text version for email apps that don't show HTML
}

// Sends an email with Brevo's transactional email API.
// https://developers.brevo.com/reference/sendtransacemail
export async function sendEmail({ to, subject, html, text }: Email) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    // Log Brevo's reason for us, but never the API key or the email content.
    console.error(`Brevo email failed (${response.status}):`, await response.text());
    throw new ApiError(502, "We couldn't send the email. Please try again later.");
  }
}
