import { useCallback, useEffect, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { QueueApiClient } from "../services/queueApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { getQueueSocket, joinQueueSession } from "../services/queueSocket.js";
import "./DoctorQueueSessionPage.css";

const UPCOMING_PREVIEW_LIMIT = 5;

function sessionStatusLabel(status) {
  if (status === "open") return "Open";
  if (status === "paused") return "Paused";
  if (status === "closed") return "Closed";
  return status;
}

function ticketPatientLabel(ticket) {
  if (!ticket) return "";
  const name = ticket.patientName || "Patient";
  return ticket.birthYear ? `${name} · ${ticket.birthYear}` : name;
}

export default function DoctorQueueSessionPage() {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadRooms = useCallback(async () => {
    const { data } = await QueueApiClient.listDoctorRooms();
    setRooms(data.rooms || []);
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await QueueApiClient.getDoctorActiveSession();
      setSession(data.session);
    } catch (err) {
      if (err?.response?.status === 404) {
        setSession(null);
      } else {
        setError(getApiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms().catch((err) => setError(getApiErrorMessage(err)));
    loadSession();
  }, [loadRooms, loadSession]);

  useEffect(() => {
    if (!session?._id) return undefined;

    joinQueueSession(session._id);
    const socket = getQueueSocket();
    const onUpdate = (payload) => {
      if (payload.status === "closed") {
        setSession(null);
        return;
      }
      setSession(payload);
    };

    socket.on("queue:update", onUpdate);
    return () => {
      socket.off("queue:update", onUpdate);
    };
  }, [session?._id]);

  const runAction = async (action) => {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const { data } = await action();
      if (data.session?.status === "closed") {
        setSession(null);
        setMessage(data.message || "Queue session closed. You can open a new session when ready.");
      } else if (data.session) {
        setSession(data.session);
      }
      if (data.message && data.session?.status !== "closed") {
        setMessage(data.message);
      }
    } catch (err) {
      const apiMessage = getApiErrorMessage(err);
      if (apiMessage.includes("No skipped patient to recall")) {
        setMessage(apiMessage);
      } else {
        setError(apiMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenSession = async (event) => {
    event.preventDefault();
    if (!roomId) return;
    await runAction(() => QueueApiClient.openSession({ roomId }));
    setMessage("Queue session opened. Patients can check in at reception.");
  };

  const handleConfirmDialog = async () => {
    if (!confirmDialog || !session) return;

    if (confirmDialog.type === "skip") {
      await runAction(() =>
        QueueApiClient.markSkipped(session._id, confirmDialog.ticketId)
      );
    } else if (confirmDialog.type === "close") {
      await runAction(() => QueueApiClient.closeSession(session._id));
    }

    setConfirmDialog(null);
  };

  const nowServing = session?.currentNumber || 0;
  const waitingTickets = session?.waitingTickets || [];
  const skippedTickets = session?.skippedTickets || [];
  const upcomingTickets = waitingTickets.slice(0, UPCOMING_PREVIEW_LIMIT);
  const hiddenWaitingCount = Math.max(waitingTickets.length - UPCOMING_PREVIEW_LIMIT, 0);
  const canRecallSkipped = skippedTickets.length > 0 && session?.status === "open";
  const mustSkipBeforeNext = Boolean(session?.calledTicket) && session?.status === "open";

  return (
    <PageLayout dashboard>
      <DoctorLayout
        title="Queue session"
        description="Open a clinic room session, call patients in order, and close when the shift ends."
      >
        <div className="dash-page-stack doctor-queue-page">
          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {!session && !loading && (
            <form className="card filters-card doctor-queue-open" onSubmit={onOpenSession}>
              <div className="doctor-queue-open-head">
                <h2>Open queue session</h2>
                <p>Select your clinic room to start issuing tickets for today.</p>
              </div>
              <div className="filters-toolbar">
                <CustomSelect
                  label="Clinic room"
                  value={roomId}
                  onChange={setRoomId}
                  placeholder="Choose room"
                  options={rooms.map((room) => ({
                    value: room._id,
                    label: `${room.roomNumber || room.roomCode} — ${room.name}`,
                  }))}
                />
                <div className="filter-field filter-field-action">
                  <span className="filter-field-label" aria-hidden="true">&nbsp;</span>
                  <button type="submit" className="btn btn-primary" disabled={submitting || !roomId}>
                    {submitting ? "Opening…" : "Open session"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {loading && <p className="doctor-queue-loading">Loading queue session…</p>}

          {session && (
            <>
              <section className="card doctor-queue-hero">
                <div className="doctor-queue-hero-meta">
                  <div>
                    <p className="doctor-queue-kicker">Now serving</p>
                    <p className="doctor-queue-current">{nowServing > 0 ? nowServing : "—"}</p>
                    {session.calledTicket && (
                      <p className="doctor-queue-patient">{ticketPatientLabel(session.calledTicket)}</p>
                    )}
                  </div>
                  <div className="doctor-queue-room-block">
                    <span className={`status-pill status-${session.status === "open" ? "active" : session.status === "paused" ? "pending" : "cancelled"}`}>
                      {sessionStatusLabel(session.status)}
                    </span>
                    <p>{session.room?.name}</p>
                    <p className="doctor-queue-room-code">{session.room?.roomCode || session.room?.roomNumber}</p>
                  </div>
                </div>
                <div className="doctor-queue-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={submitting || session.status !== "open" || mustSkipBeforeNext}
                    title={
                      mustSkipBeforeNext
                        ? "Skip or finish with the current patient before calling the next one"
                        : "Call the next waiting patient"
                    }
                    onClick={() => runAction(() => QueueApiClient.callNext(session._id))}
                  >
                    Call next
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={submitting || session.status !== "open" || !canRecallSkipped}
                    title={
                      canRecallSkipped
                        ? "Call back the most recently skipped patient"
                        : "Skip a patient first before using recall"
                    }
                    onClick={() => runAction(() => QueueApiClient.recallTicket(session._id))}
                  >
                    Recall skipped
                  </button>
                  {session.status === "paused" ? (
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={submitting}
                      onClick={() => runAction(() => QueueApiClient.resumeSession(session._id))}
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={submitting || session.status === "closed"}
                      onClick={() => runAction(() => QueueApiClient.pauseSession(session._id))}
                    >
                      Pause
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={submitting || session.status === "closed"}
                    onClick={() => setConfirmDialog({ type: "close" })}
                  >
                    Close session
                  </button>
                </div>
              </section>

              {session.calledTicket && session.status === "open" && (
                <section className="card doctor-queue-called">
                  <header className="doctor-queue-panel-head">
                    <h2>Currently called</h2>
                    <span>Skip if patient is absent</span>
                  </header>
                  <div className="doctor-queue-called-row">
                    <div>
                      <strong>#{session.calledTicket.number}</strong>
                      <div className="doctor-queue-called-meta">
                        <span className="doctor-queue-patient">{ticketPatientLabel(session.calledTicket)}</span>
                        <span className="status-pill status-active">Called</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={submitting}
                      onClick={() =>
                        setConfirmDialog({
                          type: "skip",
                          ticketId: session.calledTicket._id,
                          ticketNumber: session.calledTicket.number,
                          patientLabel: ticketPatientLabel(session.calledTicket),
                        })
                      }
                    >
                      Skip patient
                    </button>
                  </div>
                </section>
              )}

              {skippedTickets.length > 0 && (
                <section className="card doctor-queue-skipped">
                  <header className="doctor-queue-panel-head">
                    <h2>Skipped patients</h2>
                    <span>{skippedTickets.length} can be recalled</span>
                  </header>
                  <ul className="doctor-queue-ticket-list">
                    {skippedTickets.map((ticket) => (
                      <li key={ticket._id}>
                        <div className="doctor-queue-ticket-main">
                          <div>
                            <strong>#{ticket.number}</strong>
                            <span className="doctor-queue-patient">{ticketPatientLabel(ticket)}</span>
                          </div>
                        </div>
                        <span className="status-pill status-cancelled">Skipped</span>
                      </li>
                    ))}
                  </ul>
                  <p className="doctor-queue-recall-hint">
                    Use <strong>Recall skipped</strong> to call the most recent skipped patient back.
                  </p>
                </section>
              )}

              <section className="card doctor-queue-waiting">
                <header className="doctor-queue-panel-head">
                  <h2>Up next</h2>
                  <span>
                    Showing {upcomingTickets.length} of {waitingTickets.length} waiting
                  </span>
                </header>
                {upcomingTickets.length ? (
                  <>
                    <ul className="doctor-queue-ticket-list">
                      {upcomingTickets.map((ticket, index) => (
                        <li
                          key={ticket._id}
                          className={index === 0 ? "is-next-up" : ""}
                        >
                          <div className="doctor-queue-ticket-main">
                            <span className="doctor-queue-position">{index + 1}</span>
                            <div>
                              <strong>#{ticket.number}</strong>
                              <span className="doctor-queue-patient">{ticketPatientLabel(ticket)}</span>
                            </div>
                          </div>
                          <span className={`status-pill ${index === 0 ? "status-active" : "status-pending"}`}>
                            {index === 0 ? "Next up" : "Waiting"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {hiddenWaitingCount > 0 && (
                      <p className="doctor-queue-more">+ {hiddenWaitingCount} more patient(s) in queue</p>
                    )}
                  </>
                ) : (
                  <p className="doctor-queue-empty">No patients waiting.</p>
                )}
              </section>

              {session.room?._id && (
                <p className="doctor-queue-board-link">
                  Waiting room display:{" "}
                  <a href={`/queue-board/${session.room._id}`} target="_blank" rel="noreferrer">
                    Open board for {session.room.name}
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </DoctorLayout>

      <ConfirmDialog
        open={confirmDialog?.type === "skip"}
        title="Skip this patient?"
        description={
          confirmDialog?.type === "skip"
            ? `Ticket #${confirmDialog.ticketNumber} · ${confirmDialog.patientLabel} will be marked absent. You can recall them later from the queue session.`
            : ""
        }
        confirmText="Skip patient"
        variant="danger"
        loading={submitting}
        onConfirm={handleConfirmDialog}
        onCancel={() => !submitting && setConfirmDialog(null)}
      />

      <ConfirmDialog
        open={confirmDialog?.type === "close"}
        title="Close queue session?"
        description="No new tickets will be issued after closing. Patients already in the queue will stop receiving updates on the waiting room board."
        confirmText="Close session"
        variant="danger"
        loading={submitting}
        onConfirm={handleConfirmDialog}
        onCancel={() => !submitting && setConfirmDialog(null)}
      />
    </PageLayout>
  );
}
