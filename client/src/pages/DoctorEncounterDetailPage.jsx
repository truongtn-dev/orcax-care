import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./DoctorEncounterDetailPage.css";

function formatVisitTime(appointment) {
  if (!appointment?.startTime) return "Time not assigned";
  return appointment.endTime ? `${appointment.startTime} - ${appointment.endTime}` : appointment.startTime;
}

function formatSignedAt(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export default function DoctorEncounterDetailPage() {
  const { id } = useParams();
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadEncounter = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await DoctorApiClient.getEncounter(id);
      setEncounter(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setEncounter(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEncounter();
  }, [loadEncounter]);

  const handleSignOff = async () => {
    if (!encounter || submitting) return;
    const confirmed = window.confirm(
      "Sign off this encounter? After sign-off, clinical notes and diagnoses are finalized."
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const { data } = await DoctorApiClient.signOffEncounter(encounter._id);
      setEncounter(data);
      setMessage("Encounter signed off successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteImage = async (image) => {
    if (!encounter || submitting) return;
    const confirmed = window.confirm(`Delete medical image "${image.title}" from this encounter?`);
    if (!confirmed) return;

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await DoctorApiClient.deleteMedicalImage(image._id);
      setEncounter((current) =>
        current
          ? {
              ...current,
              images: (current.images || []).filter((item) => item._id !== image._id),
            }
          : current
      );
      setMessage("Medical image deleted.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout dashboard>
      <DoctorLayout
        title="Encounter detail"
        description="Review clinical notes and finalize the encounter."
      >
        <div className="doctor-encounter-toolbar">
          <Link to="/doctor/today-appointments" className="btn btn-outline btn-sm">
            Today appointments
          </Link>
          {encounter && (
            <div className="doctor-encounter-toolbar-actions">
              {encounter.canSignOff && (
                <Link to={`/doctor/encounters/${encounter._id}/prescriptions/new`} className="btn btn-outline btn-sm">
                  Create prescription
                </Link>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!encounter.canSignOff || submitting}
                onClick={handleSignOff}
              >
                {encounter.status === "signed"
                  ? "Signed off"
                  : submitting
                    ? "Signing off..."
                    : "Sign off encounter"}
              </button>
            </div>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {loading ? (
          <section className="card doctor-encounter-state">
            <p>Loading encounter...</p>
          </section>
        ) : !encounter ? (
          <section className="card doctor-encounter-state">
            <h3>Encounter not found</h3>
            <p>This record may not belong to your doctor profile.</p>
          </section>
        ) : (
          <div className="doctor-encounter-grid">
            <section className="card doctor-encounter-main">
              <div className="doctor-encounter-head">
                <div>
                  <p className="muted">Chief complaint</p>
                  <h2>{encounter.chiefComplaint || "Clinical encounter"}</h2>
                </div>
                <span className={`status-pill ${encounter.status === "signed" ? "status-completed" : "status-active"}`}>
                  {encounter.status}
                </span>
              </div>

              <dl className="doctor-encounter-facts">
                <div>
                  <dt>Patient</dt>
                  <dd>{encounter.patient?.fullName || "Patient"}</dd>
                </div>
                <div>
                  <dt>Visit date</dt>
                  <dd>{encounter.visitDate}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{formatVisitTime(encounter.appointment)}</dd>
                </div>
                <div>
                  <dt>Room</dt>
                  <dd>{encounter.appointment?.roomName || "Not assigned"}</dd>
                </div>
              </dl>

              <section className="doctor-encounter-section">
                <h3>Clinical notes</h3>
                <p>{encounter.clinicalNotes || "No notes recorded."}</p>
              </section>

              <section className="doctor-encounter-section">
                <h3>Diagnoses</h3>
                {encounter.diagnoses?.length ? (
                  <ul className="doctor-encounter-diagnoses">
                    {encounter.diagnoses.map((diagnosis) => (
                      <li key={`${diagnosis.code}-${diagnosis.text}`}>
                        <strong>{diagnosis.code || "N/A"}</strong>
                        <span>{diagnosis.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No diagnosis recorded.</p>
                )}
              </section>

              <section className="doctor-encounter-section">
                <h3>Medical images</h3>
                {encounter.images?.length ? (
                  <div className="doctor-encounter-image-grid">
                    {encounter.images.map((image) => (
                      <article key={image._id} className="doctor-encounter-image-card">
                        <a href={image.url} target="_blank" rel="noreferrer">
                          <img src={image.thumbnailUrl || image.url} alt={image.title} />
                        </a>
                        <div>
                          <strong>{image.title}</strong>
                          <span>{image.type || "image"}</span>
                        </div>
                        {encounter.canSignOff && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={submitting}
                            onClick={() => handleDeleteImage(image)}
                          >
                            Delete
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No medical images attached.</p>
                )}
              </section>
            </section>

            <aside className="card doctor-encounter-side">
              <h3>Sign-off status</h3>
              {encounter.status === "signed" ? (
                <dl className="doctor-encounter-facts doctor-encounter-facts--stacked">
                  <div>
                    <dt>Signed at</dt>
                    <dd>{formatSignedAt(encounter.signedOffAt)}</dd>
                  </div>
                  <div>
                    <dt>Signed by</dt>
                    <dd>{encounter.signedOffBy?.fullName || "Doctor"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="doctor-encounter-warning">
                  This encounter is still editable until the doctor signs it off.
                </p>
              )}

              <h3>Vitals</h3>
              <dl className="doctor-encounter-facts doctor-encounter-facts--stacked">
                <div>
                  <dt>Temperature</dt>
                  <dd>{encounter.vitals?.temperatureC ?? "-"}</dd>
                </div>
                <div>
                  <dt>Blood pressure</dt>
                  <dd>{encounter.vitals?.bloodPressure || "-"}</dd>
                </div>
                <div>
                  <dt>Pulse</dt>
                  <dd>{encounter.vitals?.pulse ?? "-"}</dd>
                </div>
              </dl>
            </aside>
          </div>
        )}
      </DoctorLayout>
    </PageLayout>
  );
}
