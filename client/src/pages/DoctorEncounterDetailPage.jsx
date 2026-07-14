import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { UploadApiClient } from "../services/uploadApi.js";
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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    chiefComplaint: "",
    clinicalNotes: "",
    temperatureC: "",
    bloodPressure: "",
    pulse: "",
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", type: "X-Ray", file: null });
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleEditClick = () => {
    setEditForm({
      chiefComplaint: encounter.chiefComplaint || "",
      clinicalNotes: encounter.clinicalNotes || "",
      temperatureC: encounter.vitals?.temperatureC || "",
      bloodPressure: encounter.vitals?.bloodPressure || "",
      pulse: encounter.vitals?.pulse || "",
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!encounter || submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        chiefComplaint: editForm.chiefComplaint,
        clinicalNotes: editForm.clinicalNotes,
        vitals: {
          temperatureC: editForm.temperatureC ? Number(editForm.temperatureC) : null,
          bloodPressure: editForm.bloodPressure,
          pulse: editForm.pulse ? Number(editForm.pulse) : null,
        },
      };
      const { data } = await DoctorApiClient.updateEncounter(encounter._id, payload);
      setEncounter(data);
      setIsEditing(false);
      setMessage("Encounter updated successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !encounter || uploadingImage) return;

    if (uploadForm.file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setUploadingImage(true);
    setError("");
    setMessage("");

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(uploadForm.file);
      });

      const uploadRes = await UploadApiClient.uploadImage({ image: base64, folder: "medical-images" });
      const imageUrl = uploadRes.data.url;

      const payload = {
        title: uploadForm.title,
        type: uploadForm.type,
        url: imageUrl,
        thumbnailUrl: imageUrl,
        mimeType: uploadForm.file.type,
        sizeBytes: uploadForm.file.size,
      };

      await DoctorApiClient.uploadMedicalImage(encounter._id, payload);
      
      setMessage("Medical image uploaded successfully.");
      setShowUploadModal(false);
      setUploadForm({ title: "", type: "X-Ray", file: null });
      loadEncounter();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingImage(false);
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
                <>
                  {!isEditing ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleEditClick}
                      disabled={submitting}
                    >
                      Edit details
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleCancelEdit}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleSaveEdit}
                        disabled={submitting}
                      >
                        Save changes
                      </button>
                    </>
                  )}
                  <Link to={`/doctor/encounters/${encounter._id}/prescriptions/new`} className="btn btn-outline btn-sm">
                    Create prescription
                  </Link>
                </>
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
                  {isEditing ? (
                    <input
                      className="encounter-edit-input encounter-edit-title"
                      value={editForm.chiefComplaint}
                      onChange={(e) => setEditForm({ ...editForm, chiefComplaint: e.target.value })}
                      placeholder="Enter chief complaint..."
                    />
                  ) : (
                    <h2>{encounter.chiefComplaint || "Clinical encounter"}</h2>
                  )}
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
                {isEditing ? (
                  <textarea
                    className="encounter-edit-textarea"
                    value={editForm.clinicalNotes}
                    onChange={(e) => setEditForm({ ...editForm, clinicalNotes: e.target.value })}
                    placeholder="Enter detailed clinical notes here..."
                  />
                ) : (
                  <p>{encounter.clinicalNotes || "No notes recorded."}</p>
                )}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0 }}>Medical images</h3>
                  {encounter.canSignOff && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowUploadModal(true)}
                      disabled={submitting || uploadingImage}
                    >
                      Add image
                    </button>
                  )}
                </div>
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
                  <dd>
                    {isEditing ? (
                      <input
                        type="number"
                        className="encounter-edit-input encounter-edit-vital"
                        value={editForm.temperatureC}
                        onChange={(e) => setEditForm({ ...editForm, temperatureC: e.target.value })}
                        placeholder="Ex: 37"
                      />
                    ) : (
                      encounter.vitals?.temperatureC ?? "-"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Blood pressure</dt>
                  <dd>
                    {isEditing ? (
                      <input
                        className="encounter-edit-input encounter-edit-vital"
                        value={editForm.bloodPressure}
                        onChange={(e) => setEditForm({ ...editForm, bloodPressure: e.target.value })}
                        placeholder="Ex: 120/80"
                      />
                    ) : (
                      encounter.vitals?.bloodPressure || "-"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Pulse</dt>
                  <dd>
                    {isEditing ? (
                      <input
                        type="number"
                        className="encounter-edit-input encounter-edit-vital"
                        value={editForm.pulse}
                        onChange={(e) => setEditForm({ ...editForm, pulse: e.target.value })}
                        placeholder="Ex: 80"
                      />
                    ) : (
                      encounter.vitals?.pulse ?? "-"
                    )}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        )}

        {showUploadModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div className="card" style={{ width: "400px", padding: "20px", backgroundColor: "#fff" }}>
              <h3>Upload Medical Image</h3>
              <form onSubmit={handleUploadSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>Title</label>
                  <input
                    required
                    type="text"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>Type</label>
                  <select
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                  >
                    <option value="X-Ray">X-Ray</option>
                    <option value="MRI">MRI</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="Ultrasound">Ultrasound</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px" }}>Image File (Max 10MB)</label>
                  <input
                    required
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="submit" className="btn btn-primary" disabled={uploadingImage}>
                    {uploadingImage ? "Uploading..." : "Upload"}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowUploadModal(false)} disabled={uploadingImage}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DoctorLayout>
    </PageLayout>
  );
}
