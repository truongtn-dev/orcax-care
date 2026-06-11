import { PushSubscription } from "../models/PushSubscription.js";

function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

function serializeSubscription(subscription) {
  if (!subscription) return null;
  return {
    _id: subscription._id.toString(),
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys?.p256dh || "",
      auth: subscription.keys?.auth || "",
    },
    permission: subscription.permission || "default",
    userAgent: subscription.userAgent || "",
    isActive: Boolean(subscription.isActive),
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}

export async function getPushSubscription(userId) {
  const subscription = await PushSubscription.findOne({ userId, isActive: true })
    .sort({ updatedAt: -1 })
    .lean();

  return {
    status: 200,
    body: {
      isSubscribed: Boolean(subscription),
      vapidPublicKey: getVapidPublicKey(),
      subscription: serializeSubscription(subscription),
    },
  };
}

export async function savePushSubscription(userId, payload = {}) {
  const endpoint = String(payload.endpoint || "").trim();
  const permission = ["default", "granted", "denied"].includes(payload.permission)
    ? payload.permission
    : "default";
  const p256dh = String(payload.keys?.p256dh || "").trim();
  const auth = String(payload.keys?.auth || "").trim();
  const userAgent = String(payload.userAgent || "").trim();

  if (!endpoint) {
    return { status: 400, body: { message: "Push endpoint is required" } };
  }

  const existing = await PushSubscription.findOne({ userId, endpoint });
  let subscription;
  let status = 201;

  if (existing) {
    existing.keys = { p256dh, auth };
    existing.permission = permission;
    existing.userAgent = userAgent;
    existing.isActive = permission === "granted";
    subscription = await existing.save();
    status = 200;
  } else {
    subscription = await PushSubscription.create({
      userId,
      endpoint,
      keys: { p256dh, auth },
      permission,
      userAgent,
      isActive: permission === "granted",
    });
  }

  if (subscription.isActive) {
    await PushSubscription.updateMany(
      { userId, _id: { $ne: subscription._id }, isActive: true },
      { isActive: false }
    );
  }

  return {
    status,
    body: {
      isSubscribed: Boolean(subscription.isActive),
      vapidPublicKey: getVapidPublicKey(),
      subscription: serializeSubscription(subscription),
    },
  };
}

export async function deactivatePushSubscription(userId) {
  await PushSubscription.updateMany({ userId, isActive: true }, { isActive: false });
  return {
    status: 200,
    body: {
      isSubscribed: false,
      vapidPublicKey: getVapidPublicKey(),
      subscription: null,
    },
  };
}
