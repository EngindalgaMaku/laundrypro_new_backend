import nodemailer, { type Transporter } from "nodemailer";

// SMTP settings come from the environment (see docs/EMAIL.md):
// SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true" for port 465),
// SMTP_USER, SMTP_PASS, SMTP_FROM ("LaundryPro <no-reply@example.com>")

interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

/**
 * Sends an email over SMTP. Without SMTP settings, development builds print the
 * message to the server log instead so flows can be tested locally.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured (SMTP_HOST, SMTP_FROM)");
    }
    console.info(
      `[MAIL:dev] SMTP not configured; message not sent.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`
    );
    return;
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
