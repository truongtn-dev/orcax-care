import { useCallback, useEffect, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { QueueApiClient } from "../services/queueApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./StaffQueueCheckinPage.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function ticketPatientLabel(ticket) {
  const name = ticket?.patientName || "Patient";
  return ticket?.birthYear ? `${name} · ${ticket.birthYear}` : name;
}

export default function StaffQueueCheckinPage() {
  const [keyword, setKeyword] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [checkedIn, setCheckedIn] = useState([]);
  const [summary, setSummary] = useState({ pendingCount: 0, checkedInCount: 0 });
  const [selectedId, setSelectedId] = useState("");
  const [ticketPreview, setTicketPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [roomSessionOpen, setRoomSessionOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);
  const [confirmIssueAll, setConfirmIssueAll] = useState(false);

  const loadOverview = useCallback(async (query = "") => {
    const trimmed = query.trim();
    const { data } = await QueueApiClient.getTodayCheckinOverview(trimmed || undefined);
    const pending = data.pending || [];
    setAppointments(pending);
    setCheckedIn(data.checkedIn || []);
    setSummary(data.summary || { pendingCount: pending.length, checkedInCount: 0 });
    setSelectedId((current) => {
      if (current && pending.some((item) => item._id === current)) return current;
      return pending.length === 1 ? pending[0]._id : pending[0]?._id || "";
    });
    return data;
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadOverview();
      } catch (err) {
        if (active) setError(getApiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadOverview]);

  useEffect(() => {
    const resolvedRoomId =
      appointments.find((item) => item._id === selectedId)?.slot?.roomId
      || appointments[0]?.slot?.roomId;

    if (!resolvedRoomId) {
      setRoomSessionOpen(appointments.length === 0 && checkedIn.length > 0);
      return undefined;
    }

    let active = true;
    setCheckingSession(true);

    (async () => {
      try {
        const { data } = await QueueApiClient.getQueueBoard(resolvedRoomId);
        if (active) {
          setRoomSessionOpen(data.session?.status === "open");
        }
      } catch {
        if (active) setRoomSessionOpen(false);
      } finally {
        if (active) setCheckingSession(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedId, appointments, checkedIn]);

  const onSearch = async (event) => {
    event.preventDefault();
    setSearching(true);
    setError("");
    setMessage("");
    setTicketPreview(null);
    setHasSearched(Boolean(keyword.trim()));

    try {
      await loadOverview(keyword);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const selected = appointments.find((item) => item._id === selectedId);

  const onIssueTicket = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const { data } = await QueueApiClient.issueTicket(selectedId);
      setTicketPreview(data);
      setMessage(`Ticket #${data.ticket.number} issued for ${data.appointment?.patientName}.`);
      setKeyword("");
      setHasSearched(false);
      await loadOverview();
    } catch (err) {
      handleIssueError(err, selected);
    } finally {
      setSubmitting(false);
    }
  };

  const onIssueAll = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const { data } = await QueueApiClient.issueAllTickets();
      const lastTicket = data.tickets?.[data.tickets.length - 1];
      if (lastTicket) setTicketPreview(lastTicket);
      setMessage(data.message || `Issued ${data.issuedCount} ticket(s).`);
      setConfirmIssueAll(false);
      await loadOverview();
    } catch (err) {
      handleIssueError(err, appointments[0]);
      setConfirmIssueAll(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueError = (err, contextItem) => {
    const apiMessage = getApiErrorMessage(err);
    if (apiMessage.includes("Queue session is not active")) {
      setError(
        `Doctor has not opened the queue session for ${contextItem?.slot?.roomName || "this room"} yet. Ask the doctor to open session first.`
      );
      setRoomSessionOpen(false);
    } else {
      setError(apiMessage);
    }
  };

  return (
    <PageLayout dashboard>
      <StaffLayout
        title="Queue check-in"
        description="Select a patient from today's list, or check in all waiting patients at once after the doctor opens the session."
      >
        <div className="dash-page-stack staff-checkin-page">
          {!loading && (
            <section className="card staff-checkin-summary">
              <div>
                <strong>{summary.checkedInCount}</strong>
                <span>Checked in</span>
              </div>
              <div>
                <strong>{summary.pendingCount}</strong>
                <span>Waiting to check in</span>
              </div>
            </section>
          )}

          <form className="card filters-card" onSubmit={onSearch}>
            <div className="filters-toolbar">
              <FilterSearchField
                label="Patient name, phone, or booking code"
                name="checkinSearch"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="e.g. Nguyen Van A, 0901…, APT-ABC123"
                disabled={searching}
              />
              <div className="filter-field filter-field-action">
                <span className="filter-field-label" aria-hidden="true">&nbsp;</span>
                <button type="submit" className="btn btn-primary" disabled={searching || loading}>
                  {searching ? "Searching…" : keyword.trim() ? "Search" : "Show all"}
                </button>
              </div>
            </div>
          </form>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {loading && <p className="staff-checkin-loading">Loading today's appointments…</p>}

          {!loading && appointments.length > 0 && (
            <section className="card staff-checkin-results">
              <header className="staff-checkin-panel-head">
                <h2>Waiting to check in ({appointments.length})</h2>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting || checkingSession || !roomSessionOpen}
                  onClick={() => setConfirmIssueAll(true)}
                >
                  Check in all ({appointments.length})
                </button>
              </header>

              {!checkingSession && !roomSessionOpen && (
                <p className="staff-checkin-session-hint" role="status">
                  Doctor must open the queue session before issuing tickets.
                </p>
              )}

              <ul className="staff-checkin-list">
                {appointments.map((item) => (
                  <li key={item._id}>
                    <button
                      type="button"
                      className={`staff-checkin-card${selectedId === item._id ? " is-selected" : ""}`}
                      onClick={() => setSelectedId(item._id)}
                    >
                      <div>
                        <strong>{item.patientName}</strong>
                        <span>{item.referenceCode}</span>
                      </div>
                      <div>
                        <span>{item.slot?.startTime} – {item.slot?.endTime}</span>
                        <span>{item.slot?.roomName || "Room TBD"}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {selected && (
                <div className="staff-checkin-detail">
                  <dl className="detail-list">
                    <div><dt>Patient</dt><dd>{selected.patientName}</dd></div>
                    <div><dt>Phone</dt><dd>{selected.patientPhone || "—"}</dd></div>
                    <div><dt>Booking</dt><dd>{selected.referenceCode}</dd></div>
                    <div><dt>Room</dt><dd>{selected.slot?.roomName || "—"}</dd></div>
                    <div><dt>Fee</dt><dd>{formatCurrency(selected.fee)}</dd></div>
                  </dl>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={submitting || checkingSession || !roomSessionOpen}
                    onClick={onIssueTicket}
                  >
                    {submitting ? "Issuing…" : `Check in ${selected.patientName}`}
                  </button>
                </div>
              )}
            </section>
          )}

          {!loading && appointments.length === 0 && (
            <section className="card staff-checkin-results">
              <h2>Waiting to check in</h2>
              <p className="staff-checkin-empty">
                {summary.checkedInCount > 0
                  ? `All ${summary.checkedInCount} patient(s) have been checked in for today.`
                  : hasSearched
                    ? "No confirmed appointment matches your search for today."
                    : "No confirmed appointments scheduled for today."}
              </p>
            </section>
          )}

          {!loading && checkedIn.length > 0 && (
            <section className="card staff-checkin-checked">
              <h2>Checked in today ({checkedIn.length})</h2>
              <ul className="staff-checkin-checked-list">
                {checkedIn.map((ticket) => (
                  <li key={ticket._id}>
                    <strong>#{ticket.number}</strong>
                    <span>{ticketPatientLabel(ticket)}</span>
                    <span>{ticket.roomName || "—"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {ticketPreview && (
            <section className="card staff-checkin-ticket">
              <p className="staff-checkin-ticket-label">Latest ticket issued</p>
              <p className="staff-checkin-ticket-number">#{ticketPreview.ticket?.number}</p>
              <p>
                {ticketPreview.appointment?.patientName || ticketPatientLabel(ticketPreview.ticket)}
                {" · "}
                {ticketPreview.session?.room?.name || ticketPreview.ticket?.roomName || "Clinic room"}
              </p>
            </section>
          )}
        </div>
      </StaffLayout>

      <ConfirmDialog
        open={confirmIssueAll}
        title={`Check in all ${appointments.length} patients?`}
        description="Each confirmed appointment will receive a queue ticket in order. Use this for faster demo setup, or check in one-by-one when verifying each patient at reception."
        confirmText={`Check in all (${appointments.length})`}
        loading={submitting}
        onConfirm={onIssueAll}
        onCancel={() => !submitting && setConfirmIssueAll(false)}
      />
    </PageLayout>
  );
}
