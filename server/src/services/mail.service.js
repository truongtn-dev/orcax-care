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
<html lang="vi">
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
          <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">Hoặc copy link: ${actionUrl}</p>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#64748b;">Email tự động từ ${APP_NAME}. Nếu bạn không yêu cầu, hãy bỏ qua.</p>
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
  const subject = `[${APP_NAME}] Xác nhận email đăng ký`;
  const text = `Xin chào ${user.fullName},\n\nVui lòng xác nhận email bằng link sau (hết hạn sau 24 giờ):\n${link}\n\n— ${APP_NAME}`;
  const html = emailLayout({
    title: "Xác nhận email của bạn",
    bodyHtml: `<p style="margin:0 0 12px;color:#475569;line-height:1.6;">Xin chào <strong>${user.fullName}</strong>,</p>
      <p style="margin:0;color:#475569;line-height:1.6;">Cảm ơn bạn đã đăng ký tài khoản patient trên ${APP_NAME}. Nhấn nút bên dưới để kích hoạt tài khoản. Link có hiệu lực <strong>24 giờ</strong>.</p>`,
    actionUrl: link,
    actionLabel: "Xác nhận email",
  });

  return deliverMail({ to: user.email, subject, text, html });
}

export async function sendResetPasswordEmail(user, token) {
  const link = `${CLIENT_ORIGIN}/reset-password?token=${token}`;
  const subject = `[${APP_NAME}] Đặt lại mật khẩu`;
  const text = `Xin chào ${user.fullName},\n\nBạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Link (hết hạn sau 30 phút):\n${link}\n\nNếu không phải bạn, bỏ qua email này.\n\n— ${APP_NAME}`;
  const html = emailLayout({
    title: "Đặt lại mật khẩu",
    bodyHtml: `<p style="margin:0 0 12px;color:#475569;line-height:1.6;">Xin chào <strong>${user.fullName}</strong>,</p>
      <p style="margin:0;color:#475569;line-height:1.6;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới để tạo mật khẩu mới. Link có hiệu lực <strong>30 phút</strong>.</p>
      <p style="margin:12px 0 0;color:#475569;line-height:1.6;">Nếu bạn không yêu cầu, có thể bỏ qua email này.</p>`,
    actionUrl: link,
    actionLabel: "Đặt lại mật khẩu",
  });

  return deliverMail({ to: user.email, subject, text, html });
}

export { isSmtpConfigured };
