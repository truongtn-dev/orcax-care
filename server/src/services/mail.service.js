import nodemailer from "nodemailer";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const MAIL_FROM = process.env.MAIL_FROM || "OrcaXCare <noreply@orcaxcare.com>";
const APP_NAME = process.env.APP_NAME || "OrcaXCare";

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function emailLayout({ title, bodyHtml, actionUrl, actionLabel }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:24px 28px;">
          <h1 style="margin:0;color:#fff;font-size:20px;">${APP_NAME}</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">${title}</h2>
          ${bodyHtml}
          ${
            actionUrl
              ? `<p style="margin:24px 0 0;text-align:center;">
            <a href="${actionUrl}" style="display:inline-block;background:#0891b2;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600;">${actionLabel}</a>
          </p>
          <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">Or copy this link: ${actionUrl}</p>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#64748b;">Automated email from ${APP_NAME}. If you did not request this, you can ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function deliverMail({ to, subject, text, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.warn("\n[mail] SMTP chưa cấu hình — email không gửi được. Thêm SMTP_* vào server/.env\n");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text}\n`);
    return { sent: false, devFallback: true };
  }

  await transport.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  console.log(`[mail] Sent "${subject}" → ${to}`);
  return { sent: true };
}

export async function verifyMailConnection() {
  const transport = getTransporter();
  if (!transport) {
    console.warn("[mail] SMTP chưa cấu hình — verify/reset email sẽ chỉ in ra console.");
    return false;
  }
  try {
    await transport.verify();
    console.log("[mail] SMTP connection OK");
    return true;
  } catch (err) {
    console.error("[mail] SMTP connection failed:", err.message);
    return false;
  }
}

export async function sendVerificationEmail(user, token) {
  const link = `${CLIENT_ORIGIN}/verify-email?token=${token}`;
  const subject = `[${APP_NAME}] Verify your email`;
  const text = `Hello ${user.fullName},\n\nPlease verify your email using the link below (expires in 24 hours):\n${link}\n\n— ${APP_NAME}`;
  const html = emailLayout({
    title: "Verify your email",
    bodyHtml: `<p style="margin:0 0 12px;color:#475569;line-height:1.6;">Hello <strong>${user.fullName}</strong>,</p>
      <p style="margin:0;color:#475569;line-height:1.6;">Thank you for registering a patient account on ${APP_NAME}. Click the button below to activate your account. This link is valid for <strong>24 hours</strong>.</p>`,
    actionUrl: link,
    actionLabel: "Verify email",
  });

  return deliverMail({ to: user.email, subject, text, html });
}

export async function sendResetPasswordEmail(user, token) {
  const link = `${CLIENT_ORIGIN}/reset-password?token=${token}`;
  const subject = `[${APP_NAME}] Reset your password`;
  const text = `Hello ${user.fullName},\n\nYou (or someone else) requested a password reset. Link (expires in 30 minutes):\n${link}\n\nIf this was not you, ignore this email.\n\n— ${APP_NAME}`;
  const html = emailLayout({
    title: "Reset your password",
    bodyHtml: `<p style="margin:0 0 12px;color:#475569;line-height:1.6;">Hello <strong>${user.fullName}</strong>,</p>
      <p style="margin:0;color:#475569;line-height:1.6;">We received a password reset request. Click the button below to set a new password. This link is valid for <strong>30 minutes</strong>.</p>
      <p style="margin:12px 0 0;color:#475569;line-height:1.6;">If you did not request this, you can ignore this email.</p>`,
    actionUrl: link,
    actionLabel: "Reset password",
  });

  return deliverMail({ to: user.email, subject, text, html });
}

export { isSmtpConfigured };
