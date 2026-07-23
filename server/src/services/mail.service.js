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

async function deliverMail({ to, subject, text, html, attachments }) {
  const transport = getTransporter();

  if (!transport) {
    console.warn("\n[mail] SMTP chưa cấu hình — email không gửi được. Thêm SMTP_* vào server/.env\n");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text}\n`);
    if (attachments?.length) {
      console.log(`[mail] Attachments: ${attachments.map((item) => item.filename || "file").join(", ")}`);
    }
    return { sent: false, devFallback: true };
  }

  await transport.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
    attachments: attachments || undefined,
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

export async function sendAppointmentReminderEmail(user, { doctorName, visitLabel }) {
  const link = `${CLIENT_ORIGIN}/patient/appointments`;
  const subject = `[${APP_NAME}] Appointment reminder`;
  const text = `Hello ${user.fullName},\n\nThis is a reminder that your visit with ${doctorName} is scheduled for ${visitLabel}.\n\nPlease arrive a few minutes early.\n\nView appointments: ${link}\n\n— ${APP_NAME}`;
  const html = emailLayout({
    title: "Appointment reminder",
    bodyHtml: `<p style="margin:0 0 12px;color:#475569;line-height:1.6;">Hello <strong>${user.fullName}</strong>,</p>
      <p style="margin:0;color:#475569;line-height:1.6;">Reminder: your visit with <strong>${doctorName}</strong> is scheduled for <strong>${visitLabel}</strong>. Please arrive a few minutes early.</p>`,
    actionUrl: link,
    actionLabel: "View appointments",
  });

  return deliverMail({ to: user.email, subject, text, html });
}

export async function sendBookingConfirmationEmail(user, { doctorName, visitLabel, reference, qrPayload }) {
  const QRCode = (await import("qrcode")).default;
  const link = `${CLIENT_ORIGIN}/patient/appointments`;
  const subject = `[${APP_NAME}] Booking confirmed — ${reference}`;
  const text = `Hello ${user.fullName},\n\nYour appointment with ${doctorName} is confirmed for ${visitLabel}.\n\nBooking reference: ${reference}\nCheck-in QR payload: ${qrPayload}\n\nView appointments: ${link}\n\n— ${APP_NAME}`;

  let attachments = [];
  let qrBlock = `<p style="margin:16px 0 0;color:#475569;line-height:1.6;">Reference: <strong>${reference}</strong></p>`;
  try {
    const qrBuffer = await QRCode.toBuffer(qrPayload, { type: "png", width: 220, margin: 1 });
    attachments = [
      {
        filename: "checkin-qr.png",
        content: qrBuffer,
        cid: "booking-qr",
        contentType: "image/png",
      },
    ];
    qrBlock += `<p style="margin:16px 0 8px;color:#475569;line-height:1.6;">Show this QR at check-in:</p>
      <p style="margin:0;text-align:center;"><img src="cid:booking-qr" alt="Check-in QR" width="180" height="180" style="border:1px solid #e2e8f0;border-radius:8px;" /></p>`;
  } catch (err) {
    console.error("[mail] QR generation failed:", err?.message || err);
    qrBlock += `<p style="margin:12px 0 0;color:#64748b;font-size:12px;">QR payload: ${qrPayload}</p>`;
  }

  const html = emailLayout({
    title: "Booking confirmed",
    bodyHtml: `<p style="margin:0 0 12px;color:#475569;line-height:1.6;">Hello <strong>${user.fullName}</strong>,</p>
      <p style="margin:0;color:#475569;line-height:1.6;">Your visit with <strong>${doctorName}</strong> is confirmed for <strong>${visitLabel}</strong>.</p>
      ${qrBlock}`,
    actionUrl: link,
    actionLabel: "View appointments",
  });

  return deliverMail({ to: user.email, subject, text, html, attachments });
}

export async function sendQueueCalledEmail(user, { ticketNumber, roomLabel }) {
  const link = `${CLIENT_ORIGIN}/patient/queue`;
  const subject = `[${APP_NAME}] Your queue number ${ticketNumber} is called`;
  const text = `Hello ${user.fullName},\n\nYour queue ticket #${ticketNumber} has been called${roomLabel ? ` at ${roomLabel}` : ""}.\nPlease proceed to the clinic room now.\n\nQueue status: ${link}\n\n— ${APP_NAME}`;
  const html = emailLayout({
    title: "You are being called",
    bodyHtml: `<p style="margin:0 0 12px;color:#475569;line-height:1.6;">Hello <strong>${user.fullName}</strong>,</p>
      <p style="margin:0;color:#475569;line-height:1.6;">Your queue ticket <strong>#${ticketNumber}</strong> has been called${roomLabel ? ` at <strong>${roomLabel}</strong>` : ""}. Please proceed to the clinic room now.</p>`,
    actionUrl: link,
    actionLabel: "Open queue status",
  });

  return deliverMail({ to: user.email, subject, text, html });
}

export async function sendResultsReadyEmail(user, { title, message, detailUrl }) {
  const link = detailUrl?.startsWith("http") ? detailUrl : `${CLIENT_ORIGIN}${detailUrl || "/patient/emr"}`;
  const subject = `[${APP_NAME}] ${title || "Results ready"}`;
  const text = `Hello ${user.fullName},\n\n${message}\n\nView details: ${link}\n\n— ${APP_NAME}`;
  const html = emailLayout({
    title: title || "Results ready",
    bodyHtml: `<p style="margin:0 0 12px;color:#475569;line-height:1.6;">Hello <strong>${user.fullName}</strong>,</p>
      <p style="margin:0;color:#475569;line-height:1.6;">${message}</p>`,
    actionUrl: link,
    actionLabel: "View details",
  });

  return deliverMail({ to: user.email, subject, text, html });
}

export { isSmtpConfigured };
