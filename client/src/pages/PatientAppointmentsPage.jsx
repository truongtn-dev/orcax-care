import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import AppPagination from "../components/AppPagination.jsx";
import DoctorAvailabilityPanel from "../components/DoctorAvailabilityPanel.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { formatWalletCurrency } from "../utils/walletUtils.js";
import "../styles/patient.shared.css";
import "./PatientAppointmentsPage.css";

const PAGE_SIZE = 10;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TABS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "reviews", label: "To review" },
  { id: "cancelled", label: "Cancelled" },
];

const EMPTY_TAB_COUNTS = { all: 0, upcoming: 0, past: 0, reviews: 0, cancelled: 0 };

function isAppointmentPast(item) {
  const slot = item.slot;
  if (!slot?.date) return false;
  const timePart = slot.endTime || slot.startTime || "00:00";
  const slotEnd = new Date(`${slot.date}T${timePart}:00`);
  return slotEnd <= new Date();
}

function canRateAppointment(item) {
  return item.rating == null && item.status !== "cancelled" && isAppointmentPast(item);
}

function getRefundEstimate(fee, slot) {
  if (!slot?.date) return 0;
  const slotDate = new Date(`${slot.date}T${slot.startTime || "00:00"}:00`);
  const diffHours = (slotDate.getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours >= 24) return fee;
  if (diffHours >= 12) return Math.floor(fee * 0.5);
  return 0;
}

function formatAppointmentDate(dateKey) {
  if (!dateKey) return "—";
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${DAY_LABELS[date.getDay()]}, ${MONTH_LABELS[month - 1]} ${day}, ${year}`;
}

function formatVisitCompact(item) {
  const slot = item.slot;
  if (!slot?.date) return "Time not assigned";
  const [year, month, day] = slot.date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayLabel = DAY_LABELS[date.getDay()];
  const monthLabel = MONTH_LABELS[month - 1];
  const time = slot.startTime && slot.endTime ? `${slot.startTime}–${slot.endTime}` : slot.startTime || "";
  return `${dayLabel}, ${monthLabel} ${day}${time ? ` · ${time}` : ""}`;
}

function statusTone(status) {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  return "confirmed";
}

function formatRefundCell(item) {
  if (item.status !== "cancelled") return "—";
  const amount = item.refundAmount || 0;
  if (amount <= 0) return "No refund";
  return formatWalletCurrency(amount);
}

export default function PatientAppointmentsPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [rescheduleSlots, setRescheduleSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tabCounts, setTabCounts] = useState(EMPTY_TAB_COUNTS);
  const [stats, setStats] = useState({ upcoming: 0, past: 0, pendingReviews: 0 });
  const [expandedId, setExpandedId] = useState("");
  const [reschedulingId, setReschedulingId] = useState("");
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [selectedAppointmentForRate, setSelectedAppointmentForRate] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("Change of plans");
  const [cancelRefundEstimate, setCancelRefundEstimate] = useState(0);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const bookedNotice = searchParams.get("booked");

  const hasAnyAppointments = tabCounts.all > 0;

  const loadAppointments = useCallback(async (tab, nextPage) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.listAppointments({
        tab,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setItems(data.items || []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setPage(data.page ?? nextPage);
      setTabCounts(data.tabCounts || EMPTY_TAB_COUNTS);
      setStats(
        data.stats || {
          upcoming: data.tabCounts?.upcoming ?? 0,
          past: data.tabCounts?.past ?? 0,
          pendingReviews: data.tabCounts?.reviews ?? 0,
        }
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setTabCounts(EMPTY_TAB_COUNTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments(activeTab, page);
  }, [activeTab, page, loadAppointments]);

  const reloadCurrentView = () => loadAppointments(activeTab, page);

  const handleTabChange = (tabId) => {
    setExpandedId("");
    setActiveTab(tabId);
    setPage(1);
  };

  const toggleReschedule = (item) => {
    setExpandedId((current) => {
      if (current === item._id) return "";
      setRescheduleSlots((slots) => ({ ...slots, [item._id]: null }));
      return item._id;
    });
    setMessage("");
    setError("");
  };

  const selectRescheduleSlot = (appointmentId, slot) => {
    setRescheduleSlots((current) => ({ ...current, [appointmentId]: slot }));
    setMessage("");
    setError("");
  };

  const handleReschedule = async (item) => {
    const slot = rescheduleSlots[item._id];
    if (!slot?._id) {
      setError("Select a new time slot before rescheduling.");
      return;
    }

    if (slot._id === item.slot?._id) {
      setError("Pick a different slot from your current appointment.");
      return;
    }

    setReschedulingId(item._id);
    setMessage("");
    setError("");

    try {
      await PatientApiClient.rescheduleAppointment(item._id, { slotId: slot._id });
      setRescheduleSlots((current) => ({ ...current, [item._id]: null }));
      setExpandedId("");
      setMessage("Appointment rescheduled successfully.");
      await reloadCurrentView();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setReschedulingId("");
    }
  };

  const openRateModal = (item) => {
    setSelectedAppointmentForRate(item);
    setRatingValue(5);
    setRateComment("");
    setModalError("");
    setRateModalOpen(true);
  };

  const openCancelModal = (item) => {
    setSelectedAppointmentForCancel(item);
    setCancelReason("Change of plans");
    setCancelRefundEstimate(getRefundEstimate(item.fee, item.slot));
    setModalError("");
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedAppointmentForCancel) return;

    setModalSubmitting(true);
    setModalError("");

    try {
      await PatientApiClient.cancelAppointment(selectedAppointmentForCancel._id, {
        reason: cancelReason,
      });
      setCancelModalOpen(false);
      setMessage("Appointment cancelled successfully.");
      await reloadCurrentView();
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleRateSubmit = async () => {
    if (!selectedAppointmentForRate) return;

    setModalSubmitting(true);
    setModalError("");

    try {
      await PatientApiClient.rateAppointment(selectedAppointmentForRate._id, {
        rating: ratingValue,
        comment: rateComment,
      });
      setRateModalOpen(false);
      setMessage("Thank you for rating your doctor.");
      await reloadCurrentView();
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const canManage = (item) => item.status === "confirmed" && !isAppointmentPast(item);

  return (
    <PageLayout>
      <div className="patient-appointments-fullpage">
        <div className="patient-appointments-toolbar">
          <Link to="/patient" className="patient-appointments-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            My dashboard
          </Link>
          <Link to="/search-doctors" className="btn btn-primary btn-sm">
            Book appointment
          </Link>
        </div>

        <section className="patient-appointments-hero">
          <span className="patient-appointments-hero-orb patient-appointments-hero-orb--1" aria-hidden="true" />
          <span className="patient-appointments-hero-orb patient-appointments-hero-orb--2" aria-hidden="true" />

          <div className="patient-appointments-hero-inner">
            <div className="patient-appointments-hero-main">
              <div className="patient-appointments-hero-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M8 12h8" />
                  <path d="M8 16h5" />
                </svg>
              </div>
              <div>
                <p className="patient-appointments-eyebrow">Care</p>
                <h1>My appointments</h1>
                <p className="patient-appointments-hero-lead">
                  Upcoming and past bookings made through OrcaXCare.
                </p>
              </div>
            </div>

            <div className="patient-appointments-hero-stats">
              <div className="patient-appointments-hero-stat">
                <strong>{loading ? "…" : stats.upcoming}</strong>
                <span>Upcoming</span>
              </div>
              <div className="patient-appointments-hero-stat">
                <strong>{loading ? "…" : stats.past}</strong>
                <span>Past</span>
              </div>
              <div className="patient-appointments-hero-stat patient-appointments-hero-stat--highlight">
                <strong>{loading ? "…" : stats.pendingReviews}</strong>
                <span>To review</span>
              </div>
            </div>
          </div>
        </section>

        <div className="patient-appointments-page-body">
          {bookedNotice && (
            <div className="alert alert-success">Your appointment has been confirmed.</div>
          )}

          {message && <div className="alert alert-success">{message}</div>}

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="patient-appt-panel patient-appointments-loading">
              <div className="loading-spinner" />
              <p>Loading appointments…</p>
            </div>
          ) : !hasAnyAppointments ? (
            <div className="patient-appt-panel patient-appointments-empty">
              <h2>No appointments yet</h2>
              <p>Find a doctor, pick an available slot, and book using your wallet balance.</p>
              <div className="form-actions">
                <Link to="/search-doctors" className="btn btn-primary">
                  Find a doctor
                </Link>
                <Link to="/patient/wallet" className="btn btn-secondary">
                  Open wallet
                </Link>
              </div>
            </div>
          ) : (
            <div className="patient-appt-panel">
              <div className="patient-appt-tabs" role="tablist" aria-label="Filter appointments">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`patient-appt-tab ${activeTab === tab.id ? "is-active" : ""} ${
                      tab.id === "reviews" && tabCounts.reviews > 0 ? "has-badge" : ""
                    }`}
                    onClick={() => handleTabChange(tab.id)}
                  >
                    {tab.label}
                    <span className="patient-appt-tab-count">{tabCounts[tab.id]}</span>
                  </button>
                ))}
              </div>

              {items.length === 0 ? (
                <div className="patient-appt-empty-tab">
                  <p>No appointments in this tab.</p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleTabChange("all")}>
                    Show all
                  </button>
                </div>
              ) : (
                <>
                  <div className="patient-appt-table-wrap">
                    <div className="patient-appt-table-head" aria-hidden="true">
                      <span>Doctor</span>
                      <span>Visit</span>
                      <span>Status</span>
                      <span>Fee</span>
                      <span>Refund</span>
                      <span>Actions</span>
                    </div>

                    <ul className="patient-appt-table-body">
                      {items.map((item) => (
                        <li
                          key={item._id}
                          className={`patient-appt-item patient-appt-item--${statusTone(item.status)} ${
                            expandedId === item._id ? "is-expanded" : ""
                          }`}
                        >
                          <div className="patient-appt-row">
                            <div className="patient-appt-cell patient-appt-cell--doctor">
                              <strong>{item.doctor.fullName}</strong>
                              <span>{item.doctor.specialty}</span>
                            </div>

                            <div className="patient-appt-cell patient-appt-cell--visit">
                              <strong>{formatVisitCompact(item)}</strong>
                              {item.slot?.roomName && (
                                <span className="patient-appt-room">{item.slot.roomName}</span>
                              )}
                            </div>

                            <div className="patient-appt-cell patient-appt-cell--status">
                              <span className={`patient-appointment-status patient-appointment-status--${statusTone(item.status)}`}>
                                {item.status}
                              </span>
                              {item.rating != null && (
                                <span className="patient-appt-rating-inline" title={`${item.rating}/5`}>
                                  {"★".repeat(item.rating)}
                                  <span className="sr-only">{item.rating} out of 5 stars</span>
                                </span>
                              )}
                            </div>

                            <div className="patient-appt-cell patient-appt-cell--fee">
                              {formatWalletCurrency(item.fee)}
                            </div>

                            <div
                              className={`patient-appt-cell patient-appt-cell--refund ${
                                item.status === "cancelled" && (item.refundAmount || 0) > 0
                                  ? "patient-appt-cell--refund-yes"
                                  : ""
                              }`}
                            >
                              {formatRefundCell(item)}
                            </div>

                            <div className="patient-appt-cell patient-appt-cell--actions">
                              <Link to={`/doctor/${item.doctor._id}`} className="patient-appt-action-link">
                                View
                              </Link>
                              {canRateAppointment(item) && (
                                <button
                                  type="button"
                                  className="patient-appt-action-btn patient-appt-action-btn--primary"
                                  onClick={() => openRateModal(item)}
                                >
                                  Rate
                                </button>
                              )}
                              {canManage(item) && (
                                <>
                                  <button
                                    type="button"
                                    className="patient-appt-action-btn"
                                    onClick={() => openCancelModal(item)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className={`patient-appt-action-btn ${expandedId === item._id ? "is-active" : ""}`}
                                    onClick={() => toggleReschedule(item)}
                                    aria-expanded={expandedId === item._id}
                                  >
                                    Reschedule
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {expandedId === item._id && canManage(item) && (
                            <div className="patient-appt-expand patient-appt-expand--reschedule">
                              <div className="patient-appt-reschedule-context">
                                <p className="patient-section-label">Current appointment</p>
                                <div className="patient-appt-reschedule-current">
                                  <strong>{item.doctor.fullName}</strong>
                                  <span>{formatVisitCompact(item)}</span>
                                  {item.slot?.roomName && (
                                    <span className="patient-appt-room">{item.slot.roomName}</span>
                                  )}
                                </div>
                              </div>

                              <p className="patient-section-label">Pick a new slot</p>
                              <DoctorAvailabilityPanel
                                doctorId={item.doctor._id}
                                consultationFee={item.fee}
                                variant="reschedule"
                                embedded
                                showBookLink={false}
                                isAuthenticated
                                selectedSlotId={rescheduleSlots[item._id]?._id || ""}
                                onSelectSlot={(slot) => selectRescheduleSlot(item._id, slot)}
                              />

                              {rescheduleSlots[item._id] && (
                                <div className="patient-appt-reschedule-selected">
                                  <span>New time</span>
                                  <strong>
                                    {formatAppointmentDate(rescheduleSlots[item._id].date)} ·{" "}
                                    {rescheduleSlots[item._id].startTime} – {rescheduleSlots[item._id].endTime}
                                  </strong>
                                </div>
                              )}

                              <div className="patient-appt-reschedule-actions">
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  disabled={reschedulingId === item._id}
                                  onClick={() => setExpandedId("")}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={reschedulingId === item._id || !rescheduleSlots[item._id]}
                                  onClick={() => handleReschedule(item)}
                                >
                                  {reschedulingId === item._id ? "Rescheduling…" : "Confirm reschedule"}
                                </button>
                              </div>
                              <p className="patient-appt-expand-hint">
                                Your current slot is released only after the new slot is confirmed.
                              </p>
                            </div>
                          )}

                          {item.reviewComment && (
                            <p className="patient-appt-review-comment">&ldquo;{item.reviewComment}&rdquo;</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {total > 0 && (
                    <div className="patient-appt-pagination">
                      <AppPagination
                        page={page}
                        totalPages={totalPages}
                        total={total}
                        onPageChange={setPage}
                        ariaLabel="Appointment pages"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {cancelModalOpen && selectedAppointmentForCancel && (
        <div className="patient-modal-overlay">
          <div className="patient-modal-card">
            <h3>Cancel appointment</h3>
            <p className="patient-modal-desc">
              Review the refund policy before confirming cancellation.
            </p>

            <div className="patient-modal-policy-box">
              <h4>Refund policy</h4>
              <ul>
                <li>More than 24h before: 100% refund</li>
                <li>12h to 24h before: 50% refund</li>
                <li>Less than 12h before: no refund</li>
              </ul>
              <div className="patient-modal-refund-estimate">
                <span>Estimated refund</span>
                <strong>{formatWalletCurrency(cancelRefundEstimate)}</strong>
              </div>
            </div>

            <div className="patient-modal-field">
              <label htmlFor="cancel-reason">Reason for cancellation</label>
              <select
                id="cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              >
                <option value="Change of plans">Change of plans</option>
                <option value="Schedule conflict">Schedule conflict</option>
                <option value="Illness">Illness</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {modalError && <div className="alert alert-error">{modalError}</div>}

            <div className="patient-modal-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={modalSubmitting}
                onClick={() => setCancelModalOpen(false)}
              >
                Keep appointment
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm btn-danger"
                disabled={modalSubmitting}
                onClick={handleCancelConfirm}
              >
                {modalSubmitting ? "Cancelling…" : "Confirm cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rateModalOpen && selectedAppointmentForRate && (
        <div className="patient-modal-overlay">
          <div className="patient-modal-card">
            <h3>Rate doctor</h3>
            <p className="patient-modal-desc">
              Rate your visit with <strong>{selectedAppointmentForRate.doctor.fullName}</strong> on{" "}
              {formatAppointmentDate(selectedAppointmentForRate.slot?.date)}.
            </p>

            <div className="patient-modal-rating-picker">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-select-btn ${star <= ratingValue ? "is-selected" : ""}`}
                  onClick={() => setRatingValue(star)}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="patient-modal-field">
              <label htmlFor="rate-comment">Share your experience (optional)</label>
              <textarea
                id="rate-comment"
                rows="4"
                placeholder="Write your review comments here..."
                value={rateComment}
                onChange={(event) => setRateComment(event.target.value)}
              />
            </div>

            {modalError && <div className="alert alert-error">{modalError}</div>}

            <div className="patient-modal-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={modalSubmitting}
                onClick={() => setRateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={modalSubmitting}
                onClick={handleRateSubmit}
              >
                {modalSubmitting ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
