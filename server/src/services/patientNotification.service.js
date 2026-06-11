import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";

function serializeNotification(notification) {
  return {
    _id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type || "system",
    link: notification.link || "",
    readAt: notification.readAt || null,
    isRead: Boolean(notification.readAt),
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

export async function listNotifications(userId, query = {}) {
  const filter = { userId };
  if (query.status === "unread") {
    filter.readAt = null;
  }

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).lean(),
    Notification.countDocuments({ userId, readAt: null }),
  ]);

  return {
    status: 200,
    body: {
      items: notifications.map(serializeNotification),
      total: notifications.length,
      unreadCount,
    },
  };
}

export async function markNotificationRead(userId, notificationId) {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return { status: 400, body: { message: "Invalid notification" } };
  }

  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) {
    return { status: 404, body: { message: "Notification not found" } };
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  return { status: 200, body: serializeNotification(notification) };
}
