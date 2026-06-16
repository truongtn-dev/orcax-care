import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { getApiErrorMessage } from "../services/api.js";
import { NotificationApiClient } from "../services/notificationApi.js";
import "./PatientNotificationsPage.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
];

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

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function PatientNotificationsPage() {
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    NotificationApiClient.listNotifications(filter === "unread" ? { status: "unread" } : undefined)
      .then(({ data }) => {
        if (!active) return;
        setNotifications(data.items || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch((err) => {
        if (!active) return;
        setError(getApiErrorMessage(err));
        setNotifications([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter]);

  const totalLabel = useMemo(() => {
    if (loading) return "Loading";
    if (filter === "unread") return `${notifications.length} unread`;
    return `${notifications.length} total`;
  }, [filter, loading, notifications.length]);

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
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setMarkingId("");
    }
  }

  return (
    <PageLayout>
      <div className="patient-notifications-page">
        <ScrollReveal variant="up">
          <section className="patient-notifications-header">
            <div className="patient-notifications-title">
              <span className="patient-notifications-icon" aria-hidden="true">
                <BellIcon />
              </span>
              <div>
                <p className="patient-notifications-eyebrow">Notifications</p>
                <h1>Notification inbox</h1>
              </div>
            </div>
            <div className="patient-notifications-summary">
              <strong>{unreadCount}</strong>
              <span>Unread</span>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="up" delay={40}>
          <section className="patient-notifications-toolbar">
            <div className="patient-notifications-segmented" aria-label="Notification filter">
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
            <span className="patient-notifications-count">{totalLabel}</span>
          </section>
        </ScrollReveal>

        {error && <div className="patient-notifications-alert">{error}</div>}

        <ScrollReveal variant="up" delay={80}>
          <section className="patient-notifications-list" aria-live="polite">
            {loading ? (
              <div className="patient-notifications-state">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="patient-notifications-state">
                {filter === "unread" ? "No unread notifications." : "No notifications yet."}
              </div>
            ) : (
              notifications.map((notification) => (
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
                        Open related page
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
                    <span>{notification.isRead ? "Read" : markingId === notification._id ? "Saving" : "Mark read"}</span>
                  </button>
                </article>
              ))
            )}
          </section>
        </ScrollReveal>
      </div>
    </PageLayout>
  );
}
