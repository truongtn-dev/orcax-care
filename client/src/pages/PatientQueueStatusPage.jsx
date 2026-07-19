import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { QueueApiClient } from "../services/queueApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { getQueueSocket, joinQueuePatient } from "../services/queueSocket.js";
import "./PatientQueueStatusPage.css";

const POLL_MS = 3000;

export default function PatientQueueStatusPage() {
  const [patientUserId, setPatientUserId] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await QueueApiClient.getMyQueueStatus();
      setStatus(data);
      setError("");
    } catch (err) {
      if (err?.response?.status === 404) {
        setStatus(null);
        setError("");
      } else {
        setError(getApiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, POLL_MS);
    return () => clearInterval(timer);
  }, [loadStatus]);

  useEffect(() => {
    AuthApiClient.me()
      .then(({ data }) => setPatientUserId(data.userId || ""))
      .catch(() => setPatientUserId(""));
  }, []);

  useEffect(() => {
    if (!patientUserId) return undefined;

    joinQueuePatient(patientUserId);
    const socket = getQueueSocket();
    const onUpdate = (payload) => {
      setStatus((prev) => ({
        ...(prev || {}),
        ticket: payload.ticket,
        session: payload.session,
        peopleAhead: prev?.peopleAhead ?? 0,
        isCalled: payload.ticket?.status === "called" || payload.ticket?.status === "serving",
        isSkipped: payload.ticket?.status === "skipped",
      }));
      loadStatus();
    };

    socket.on("queue:patient-update", onUpdate);
    return () => {
      socket.off("queue:patient-update", onUpdate);
    };
  }, [patientUserId, loadStatus]);

  const ticketNumber = status?.ticket?.number;
  const peopleAhead = status?.peopleAhead ?? 0;
  const currentServing = status?.session?.currentNumber ?? 0;
  const isCalled = status?.isCalled;
  const isSkipped = status?.isSkipped;
  const roomName = status?.session?.room?.name || "the clinic room";

  return (
    <PageLayout dashboard>
      <div className="patient-queue-page">
        <header className="patient-queue-head">
          <div>
            <p className="patient-queue-kicker">Queue status</p>
            <h1>Your visit today</h1>
            <p className="patient-queue-lead">Live updates refresh every few seconds.</p>
          </div>
          <Link to="/patient" className="btn btn-outline btn-sm">
            Back to dashboard
          </Link>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        {loading && (
          <section className="patient-queue-shell patient-queue-loading-panel" aria-busy="true">
            <div className="patient-queue-pulse" />
            <p>Loading your queue status…</p>
          </section>
        )}

        {!loading && !status && (
          <section className="patient-queue-shell patient-queue-empty">
            <div className="patient-queue-empty-visual" aria-hidden="true">
              <span className="patient-queue-empty-mark">—</span>
            </div>
            <div className="patient-queue-empty-copy">
              <p className="patient-queue-empty-eyebrow">Not in queue yet</p>
              <h2>No active ticket</h2>
              <p>
                After you arrive, reception will check you in and issue a queue number.
                This page will update automatically once your ticket is ready.
              </p>
            </div>
            <ol className="patient-queue-steps">
              <li>
                <span>1</span>
                Confirm your appointment for today
              </li>
              <li>
                <span>2</span>
                Check in at the reception desk
              </li>
              <li>
                <span>3</span>
                Watch your number here in real time
              </li>
            </ol>
            <div className="patient-queue-empty-actions">
              <Link to="/patient/appointments" className="btn btn-primary">
                View appointments
              </Link>
              <Link to="/patient" className="btn btn-outline">
                Go to dashboard
              </Link>
            </div>
          </section>
        )}

        {status && (
          <div
            className={`patient-queue-active${isCalled ? " is-called" : ""}${isSkipped ? " is-skipped" : ""}`}
          >
            <section className="patient-queue-shell patient-queue-ticket-card">
              <p className="patient-queue-label">Your ticket</p>
              <p className="patient-queue-number">{ticketNumber}</p>
              {isSkipped ? (
                <p className="patient-queue-skipped">
                  You were temporarily skipped. Please stay nearby — the clinic may recall you soon.
                </p>
              ) : isCalled ? (
                <p className="patient-queue-called">Please proceed to {roomName} now.</p>
              ) : (
                <p className="patient-queue-waiting">Please wait in the waiting area.</p>
              )}
            </section>

            <section className="patient-queue-shell patient-queue-stats">
              <div>
                <p className="patient-queue-label">Now serving</p>
                <p className="patient-queue-stat-value">
                  {currentServing > 0 ? currentServing : "—"}
                </p>
              </div>
              <div>
                <p className="patient-queue-label">People ahead</p>
                <p className="patient-queue-stat-value">{peopleAhead}</p>
              </div>
              <div>
                <p className="patient-queue-label">Room</p>
                <p className="patient-queue-room">{status.session?.room?.name || "—"}</p>
              </div>
            </section>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
