import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "../styles/patient.shared.css";
import "./PatientEmrTimelinePage.css";

function formatDateLabel(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatVisitTime(appointment) {
  if (!appointment?.startTime) return "Time not assigned";
  return appointment.endTime ? `${appointment.startTime} - ${appointment.endTime}` : appointment.startTime;
}

export default function PatientEmrTimelinePage() {
  const [items, setItems] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await PatientApiClient.listEmrTimeline(params);
      setItems(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const clearFilters = () => {
    setFrom("");
    setTo("");
  };

  return (
    <PageLayout>
      <div className="patient-emr-page">
        <div className="patient-emr-toolbar">
          <Link to="/patient" className="patient-emr-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            My dashboard
          </Link>
          <Link to="/patient/appointments" className="btn btn-secondary btn-sm">
            Appointments
          </Link>
        </div>

        <header className="patient-emr-header">
          <div>
            <p className="patient-section-label">Electronic medical record</p>
            <h1>Patient EMR Timeline</h1>
            <p>Chronological encounter history from completed clinical visits.</p>
          </div>
          <div className="patient-emr-count">
            <strong>{loading ? "..." : items.length}</strong>
            <span>encounters</span>
          </div>
        </header>

        <section className="patient-panel patient-emr-filter-panel">
          <div className="patient-panel-body patient-emr-filters">
            <label>
              <span>From</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
            <button type="button" className="btn btn-primary btn-sm" onClick={loadTimeline}>
              Filter
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </section>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <section className="patient-panel patient-emr-state">
            <div className="loading-spinner" />
            <p>Loading EMR timeline...</p>
          </section>
        ) : items.length === 0 ? (
          <section className="patient-panel patient-emr-state">
            <h2>No encounters found</h2>
            <p>Your signed clinical visits will appear here after consultation.</p>
          </section>
        ) : (
          <ol className="patient-emr-timeline">
            {items.map((item) => (
              <li key={item._id} className="patient-panel patient-emr-card">
                <div className="patient-emr-date">
                  <strong>{formatDateLabel(item.visitDate)}</strong>
                  <span>{formatVisitTime(item.appointment)}</span>
                </div>

                <div className="patient-emr-card-body">
                  <div className="patient-emr-card-head">
                    <div>
                      <h2>{item.chiefComplaint || "Clinical encounter"}</h2>
                      <p>
                        {item.doctor?.fullName || "Doctor"} · {item.appointment?.roomName || "Room not assigned"}
                      </p>
                    </div>
                    <span className={`patient-emr-status patient-emr-status--${item.status}`}>
                      {item.status}
                    </span>
                  </div>

                  <dl className="patient-emr-vitals">
                    <div>
                      <dt>Temperature</dt>
                      <dd>{item.vitals?.temperatureC ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Blood pressure</dt>
                      <dd>{item.vitals?.bloodPressure || "-"}</dd>
                    </div>
                  </dl>

                  {item.clinicalNotes && <p className="patient-emr-notes">{item.clinicalNotes}</p>}

                  {item.diagnoses?.length > 0 && (
                    <div className="patient-emr-diagnoses">
                      <p className="patient-section-label">Diagnoses</p>
                      <ul>
                        {item.diagnoses.map((diagnosis) => (
                          <li key={`${item._id}-${diagnosis.code}-${diagnosis.text}`}>
                            <strong>{diagnosis.code || "N/A"}</strong>
                            <span>{diagnosis.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </PageLayout>
  );
}
