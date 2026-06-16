import webpush from "web-push";
import { Notification } from "../models/Notification.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { formatDateOnly } from "../utils/shiftTime.js";

let webPushReady = false;

function initWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@orcaxcare.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  webPushReady = true;
  return true;
}

initWebPush();

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || "";
}

export function formatWalletAmount(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export async function notifyPatient(userId, { title, message, type = "system", link = "" }) {
  const notification = await Notification.create({
    userId,
    title: String(title || "OrcaXCare").trim().slice(0, 200),
    message: String(message || "").trim().slice(0, 2000),
    type: String(type || "system").trim().slice(0, 40),
    link: String(link || "").trim().slice(0, 500),
  });

  deliverPush(userId, {
    title: notification.title,
    message: notification.message,
    link: notification.link,
  }).catch((err) => {
    console.error("Push delivery failed:", err?.message || err);
  });

  return notification;
}

export function notifyPatientSafe(userId, payload) {
  return notifyPatient(userId, payload).catch((err) => {
    console.error("Notification create failed:", err?.message || err);
    return null;
  });
}

async function deliverPush(userId, { title, message, link }) {
  if (!webPushReady) return;

  const subscription = await PushSubscription.findOne({ userId, isActive: true })
    .sort({ updatedAt: -1 })
    .lean();

  if (!subscription?.endpoint || subscription.endpoint.startsWith("local-permission://")) {
    return;
  }

  if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
    return;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify({ title, message, link }),
      { TTL: 3600 }
    );
  } catch (err) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await PushSubscription.updateMany({ userId, endpoint: subscription.endpoint }, { isActive: false });
    }
    throw err;
  }
}

export function buildAppointmentVisitLabel(slot) {
  if (!slot?.date) return "your upcoming visit";
  const dateKey = typeof slot.date === "string" ? slot.date : formatDateOnly(slot.date);
  const time =
    slot.startTime && slot.endTime ? `${slot.startTime}–${slot.endTime}` : slot.startTime || "";
  return time ? `${dateKey} · ${time}` : dateKey;
}
