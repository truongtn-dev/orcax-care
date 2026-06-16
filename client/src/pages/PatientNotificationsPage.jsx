import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { NotificationApiClient } from "../services/notificationApi.js";
import "./PatientNotificationsPage.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
];

const POLL_MS = 25000;

const PUSH_UNSUPPORTED = "unsupported";
const PUSH_DISABLED = "disabled";
const PUSH_ENABLED = "enabled";
const PUSH_BLOCKED = "blocked";

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTypeLabel(type) {
  const labels = {
    appointment: "Appointment",
    prescription: "Prescription",
    queue: "Queue",
    payment: "Payment",
    system: "System",
  };
  return labels[type] || "Notice";
}

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const BellIcon = AlertIcon;

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function browserSupportsPush() {
  return "Notification" in window && "serviceWorker" in navigator;
}

function createLocalPermissionPayload(permission) {
  return {
    endpoint: `local-permission://${window.location.host}/patient-notifications`,
    keys: { p256dh: "", auth: "" },
    permission,
    userAgent: navigator.userAgent || "",
  };
}

function serializeBrowserSubscription(subscription, permission) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys?.p256dh || "",
      auth: json.keys?.auth || "",
    },
    permission,
    userAgent: navigator.userAgent || "",
  };
}

function dispatchNotificationsUpdated(unreadCount) {
  window.dispatchEvent(
    new CustomEvent("orcax:notifications-updated", { detail: { unreadCount } })
  );
}

export default function PatientNotificationsPage() {
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState("");
  const [pushStatus, setPushStatus] = useState(PUSH_DISABLED);
  const [pushBusy, setPushBusy] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError("");

      try {
        const { data } = await NotificationApiClient.listNotifications(
          filter === "unread" ? { status: "unread" } : undefined
        );
        setNotifications(data.items || []);
        const nextUnread = data.unreadCount || 0;
        setUnreadCount(nextUnread);
        setLastSyncedAt(new Date());
        dispatchNotificationsUpdated(nextUnread);
      } catch (err) {
        setError(getApiErrorMessage(err));
        if (!silent) setNotifications([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications({ silent: true });
      }
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadNotifications({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadNotifications]);

  useEffect(() => {
    let active = true;

    if (!browserSupportsPush()) {
      setPushStatus(PUSH_UNSUPPORTED);
      return () => {
        active = false;
      };
    }

    NotificationApiClient.getPushSubscription()
      .then(({ data }) => {
        if (!active) return;
        setVapidPublicKey(data.vapidPublicKey || "");
        if (Notification.permission === "denied") {
          setPushStatus(PUSH_BLOCKED);
        } else {
          setPushStatus(data.isSubscribed ? PUSH_ENABLED : PUSH_DISABLED);
        }
      })
      .catch(() => {
        if (active) setPushStatus(PUSH_DISABLED);
      });

    return () => {
      active = false;
    };
  }, []);

  const syncLabel = useMemo(() => {
    if (!lastSyncedAt || loading) return "";
    if (refreshing) return "Updating…";
    return `Last updated ${formatDateTime(lastSyncedAt)}`;
  }, [lastSyncedAt, loading, refreshing]);

  async function handleMarkRead(notification) {
    if (notification.isRead || markingId) return;
    setMarkingId(notification._id);
    setError("");

    try {
      const { data } = await NotificationApiClient.markNotificationRead(notification._id);
      setNotifications((current) => {
        if (filter === "unread") {
          return current.filter((item) => item._id !== notification._id);
        }
        return current.map((item) => (item._id === notification._id ? data : item));
      });
      setUnreadCount((count) => {
        const next = Math.max(0, count - 1);
        dispatchNotificationsUpdated(next);
        return next;
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setMarkingId("");
    }
  }

  async function handleEnablePush() {
    if (!browserSupportsPush() || pushBusy) return;
    setPushBusy(true);
    setError("");

    try {
      const permission = await window.Notification.requestPermission();
      if (permission === "denied") {
        setPushStatus(PUSH_BLOCKED);
        await NotificationApiClient.savePushSubscription(createLocalPermissionPayload(permission));
        return;
      }
      if (permission !== "granted") {
        setPushStatus(PUSH_DISABLED);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager?.getSubscription();

      if (!subscription && registration.pushManager && vapidPublicKey) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const payload = subscription
        ? serializeBrowserSubscription(subscription, permission)
        : createLocalPermissionPayload(permission);

      await NotificationApiClient.savePushSubscription(payload);
      setPushStatus(PUSH_ENABLED);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDisablePush() {
    if (pushBusy) return;
    setPushBusy(true);
    setError("");

    try {
      if (browserSupportsPush()) {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        const subscription = await registration?.pushManager?.getSubscription();
        await subscription?.unsubscribe();
      }
      await NotificationApiClient.deactivatePushSubscription();
      setPushStatus(Notification.permission === "denied" ? PUSH_BLOCKED : PUSH_DISABLED);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPushBusy(false);
    }
  }

  const showPopUpAlerts = browserSupportsPush() && Boolean(vapidPublicKey);

  const pushHeadline = {
    [PUSH_UNSUPPORTED]: "Not available in this browser",
    [PUSH_DISABLED]: "Pop-up alerts are off",
    [PUSH_ENABLED]: "Pop-up alerts are on",
    [PUSH_BLOCKED]: "Pop-up alerts are blocked",
  }[pushStatus];

  const pushDescription = {
    [PUSH_UNSUPPORTED]: "",
    [PUSH_DISABLED]:
      "Turn on to get instant reminders when you book, cancel, or pay — even when OrcaXCare is in another tab.",
    [PUSH_ENABLED]: "This device will show pop-up reminders for appointments, payments, and other updates.",
    [PUSH_BLOCKED]:
      "Allow notifications for OrcaXCare in your browser settings, then turn alerts on again here.",
  }[pushStatus];

  return (
    <PageLayout>
      <div className="patient-notifications-fullpage">
        <div className="patient-notifications-toolbar">
          <Link to="/patient" className="patient-notifications-back">
            <BackIcon />
            My dashboard
          </Link>
          <button
            type="button"
            className={`patient-notifications-refresh${refreshing ? " is-spinning" : ""}`}
            disabled={loading || refreshing}
            onClick={() => loadNotifications({ silent: true })}
            aria-label="Refresh notifications"
          >
            <RefreshIcon />
          </button>
        </div>

        <section className="patient-notifications-hero">
          <span className="patient-notifications-hero-orb patient-notifications-hero-orb--1" aria-hidden="true" />
          <span className="patient-notifications-hero-orb patient-notifications-hero-orb--2" aria-hidden="true" />

          <div className="patient-notifications-hero-inner">
            <div className="patient-notifications-hero-icon" aria-hidden="true">
              <BellIcon />
            </div>
            <div className="patient-notifications-hero-copy">
              <h1>Notifications</h1>
              <p className="patient-notifications-hero-lead">
                Appointments, payments, and account updates in one place.
              </p>
            </div>
            {!loading && unreadCount > 0 && (
              <div className="patient-notifications-unread-badge" aria-live="polite">
                <strong>{unreadCount}</strong>
                unread
              </div>
            )}
          </div>
        </section>

        <div className="patient-notifications-page-body">
          <section className="patient-notifications-panel">
            {showPopUpAlerts && (
              <div
                className={`patient-notifications-alert-strip${
                  pushStatus === PUSH_ENABLED ? " is-on" : ""
                }`}
              >
                <div className="patient-notifications-alert-main">
                  <div className="patient-notifications-alert-icon" aria-hidden="true">
                    <AlertIcon />
                  </div>
                  <div className="patient-notifications-alert-copy">
                    <h2>{pushHeadline}</h2>
                    {pushDescription && <p>{pushDescription}</p>}
                  </div>
                </div>
                {pushStatus === PUSH_ENABLED ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleDisablePush}
                    disabled={pushBusy}
                  >
                    {pushBusy ? "Saving…" : "Turn off"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleEnablePush}
                    disabled={pushBusy || pushStatus === PUSH_BLOCKED}
                  >
                    {pushBusy ? "Saving…" : "Turn on"}
                  </button>
                )}
              </div>
            )}

            <div className="patient-notifications-list-head">
              <div className="patient-notifications-tabs" aria-label="Notification filter">
                {FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={filter === item.id ? "is-active" : ""}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {syncLabel && <span className="patient-notifications-sync">{syncLabel}</span>}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {loading ? (
              <div className="patient-notifications-loading">
                <div className="loading-spinner" />
                <p>Loading notifications…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="patient-notifications-empty">
                <div className="patient-notifications-empty-icon" aria-hidden="true">
                  <BellIcon />
                </div>
                <h2>{filter === "unread" ? "No unread messages" : "You're all caught up"}</h2>
                <p>
                  {filter === "unread"
                    ? "Switch to All to see your full history."
                    : "When you book, pay, or reschedule, updates will appear here."}
                </p>
                {filter !== "unread" && (
                  <div className="patient-notifications-empty-actions">
                    <Link to="/patient/book" className="btn btn-primary">
                      Book appointment
                    </Link>
                    <Link to="/patient/wallet" className="btn btn-secondary">
                      Top up wallet
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="patient-notifications-list" aria-live="polite">
                {notifications.map((notification) => (
                  <article
                    key={notification._id}
                    className={`patient-notification-item ${notification.isRead ? "is-read" : "is-unread"}`}
                  >
                    <div className="patient-notification-main">
                      <div className="patient-notification-meta">
                        <span className="patient-notification-type">{getTypeLabel(notification.type)}</span>
                        <time>{formatDateTime(notification.createdAt)}</time>
                      </div>
                      <h2>{notification.title}</h2>
                      <p>{notification.message}</p>
                      {notification.link && (
                        <Link to={notification.link} className="patient-notification-link">
                          View details
                        </Link>
                      )}
                    </div>

                    <button
                      type="button"
                      className="patient-notification-read-button"
                      disabled={notification.isRead || markingId === notification._id}
                      onClick={() => handleMarkRead(notification)}
                      title={notification.isRead ? "Already read" : "Mark as read"}
                    >
                      <CheckIcon />
                      <span>
                        {notification.isRead ? "Read" : markingId === notification._id ? "Saving" : "Mark read"}
                      </span>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
