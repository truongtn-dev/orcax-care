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

  return (
    <PageLayout dashboard>
      <div className="patient-queue-page">
        <header className="patient-queue-head">
          <div>
            <p className="patient-queue-kicker">Queue status</p>
            <h1>Your visit today</h1>
            <p className="patient-queue-lead">Live updates refresh every few seconds.</p>
          </div>
          <Link to="/patient" className="btn btn-outline btn-sm">Back to dashboard</Link>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        {loading && <p className="patient-queue-loading">Loading your queue status…</p>}

        {!loading && !status && (
          <section className="card patient-queue-empty">
            <h2>No active ticket</h2>
            <p>Check in at reception after you arrive for your appointment.</p>
            <Link to="/patient/appointments" className="btn btn-primary btn-sm">View appointments</Link>
          </section>
        )}

        {status && (
          <div className={`patient-queue-grid${isCalled ? " is-called" : ""}`}>
            <section className="card patient-queue-ticket-card">
              <p className="patient-queue-label">Your ticket</p>
              <p className="patient-queue-number">{ticketNumber}</p>
              {isCalled ? (
                <p className="patient-queue-called">Please proceed to {status.session?.room?.name || "the clinic room"} now.</p>
              ) : (
                <p className="patient-queue-waiting">Please wait in the waiting area.</p>
              )}
            </section>

            <section className="card patient-queue-stats">
              <div>
                <p className="patient-queue-label">Now serving</p>
                <p className="patient-queue-stat-value">{currentServing > 0 ? currentServing : "—"}</p>
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
