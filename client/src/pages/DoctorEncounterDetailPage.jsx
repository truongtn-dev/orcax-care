import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import AppModal from "../components/AppModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import SearchableSelect from "../components/SearchableSelect.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import FilterFormField from "../components/FilterFormField.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { UploadApiClient } from "../services/uploadApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./DoctorEncounterDetailPage.css";
import "./PrescriptionDetailPage.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

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

  const [isAddDiagnosisOpen, setIsAddDiagnosisOpen] = useState(false);
  const [isEditDiagnosisOpen, setIsEditDiagnosisOpen] = useState(false);
  const [diagnosisToEdit, setDiagnosisToEdit] = useState(null);
  const [selectedIcdCode, setSelectedIcdCode] = useState("");
  const [diagnosisNote, setDiagnosisNote] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [diagnosisToRemove, setDiagnosisToRemove] = useState(null);
  const [removingDiagnosis, setRemovingDiagnosis] = useState(false);
  const [confirmSignOff, setConfirmSignOff] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const [lightboxDragging, setLightboxDragging] = useState(false);
  const lightboxDragStart = useRef(null);

  const [prescription, setPrescription] = useState(null);
  const [rxLoading, setRxLoading] = useState(true);

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

  const loadPrescription = useCallback(async () => {
    setRxLoading(true);
    try {
      const { data } = await DoctorApiClient.getPrescriptionForEncounter(id);
      setPrescription(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setPrescription(null);
      } else {
        console.error(err);
      }
    } finally {
      setRxLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEncounter();
    loadPrescription();
  }, [loadEncounter, loadPrescription]);

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
    setConfirmSignOff(true);
  };

  const handleConfirmSignOff = async () => {
    if (!encounter || submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const { data } = await DoctorApiClient.signOffEncounter(encounter._id);
      setEncounter(data);
      setMessage("Encounter signed off successfully.");
      setConfirmSignOff(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDiagnosisClick = () => {
    setSelectedIcdCode("");
    setDiagnosisNote("");
    setModalError("");
    setIsAddDiagnosisOpen(true);
  };

  const handleEditDiagnosisClick = (diagnosis) => {
    setDiagnosisToEdit(diagnosis);
    setSelectedIcdCode(diagnosis.code || "");
    setDiagnosisNote(diagnosis.note || "");
    setModalError("");
    setIsEditDiagnosisOpen(true);
  };

  const loadIcdOptions = async (query) => {
    try {
      const { data } = await DoctorApiClient.searchIcd10({ q: query });
      return (data.items || []).map((item) => ({
        value: item.code,
        label: `${item.code} - ${item.name}`,
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!selectedIcdCode) {
      setModalError("Please select an ICD-10 code.");
      return;
    }
    setModalSubmitting(true);
    setModalError("");
    try {
      const { data } = await DoctorApiClient.addDiagnosis(encounter._id, {
        code: selectedIcdCode,
        note: diagnosisNote.trim(),
      });
      setEncounter(data);
      setIsAddDiagnosisOpen(false);
      setMessage("Diagnosis added successfully.");
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleUpdateDiagnosis = async () => {
    if (!diagnosisToEdit) return;
    if (!selectedIcdCode) {
      setModalError("Please select an ICD-10 code.");
      return;
    }
    setModalSubmitting(true);
    setModalError("");
    try {
      const { data } = await DoctorApiClient.updateDiagnosis(encounter._id, diagnosisToEdit.code, {
        code: selectedIcdCode,
        note: diagnosisNote.trim(),
      });
      setEncounter(data);
      setIsEditDiagnosisOpen(false);
      setDiagnosisToEdit(null);
      setMessage("Diagnosis updated successfully.");
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleConfirmRemoveDiagnosis = async () => {
    if (!encounter || !diagnosisToRemove) return;
    setRemovingDiagnosis(true);
    setError("");
    setMessage("");
    try {
      const { data } = await DoctorApiClient.removeDiagnosis(encounter._id, diagnosisToRemove.code);
      setEncounter(data);
      setMessage("Diagnosis removed successfully.");
      setDiagnosisToRemove(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setRemovingDiagnosis(false);
    }
  };

  const handleConfirmDeleteImage = async () => {
    if (!encounter || !imageToDelete || submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await DoctorApiClient.deleteMedicalImage(imageToDelete._id);
      setEncounter((current) =>
        current
          ? {
              ...current,
              images: (current.images || []).filter((item) => item._id !== imageToDelete._id),
            }
          : current
      );
      setMessage("Medical image deleted.");
      setImageToDelete(null);
      if (lightboxImage?._id === imageToDelete._id) setLightboxImage(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const imagesByDate = useMemo(() => {
    const groups = new Map();
    for (const image of encounter?.images || []) {
      const key = image.createdAt
        ? new Date(image.createdAt).toLocaleDateString()
        : "Unknown date";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(image);
    }
    return [...groups.entries()];
  }, [encounter?.images]);

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
                <div className="doctor-encounter-section-head">
                  <h3>Diagnoses</h3>
                  {encounter.canSignOff && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleAddDiagnosisClick}
                      disabled={submitting}
                    >
                      Add diagnosis
                    </button>
                  )}
                </div>
                {encounter.diagnoses?.length ? (
                  <ul className="doctor-encounter-diagnoses">
                    {encounter.diagnoses.map((diagnosis) => (
                      <li key={`${diagnosis.code}-${diagnosis.text}`}>
                        <div className="doctor-encounter-diagnosis-main">
                          <span className="doctor-encounter-diagnosis-code">{diagnosis.code || "N/A"}</span>
                          <div className="doctor-encounter-diagnosis-copy">
                            <strong>{diagnosis.text}</strong>
                            {diagnosis.note && <span>{diagnosis.note}</span>}
                          </div>
                        </div>
                        {encounter.canSignOff && (
                          <div className="doctor-encounter-diagnosis-actions">
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled={submitting || removingDiagnosis}
                              onClick={() => handleEditDiagnosisClick(diagnosis)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled={submitting || removingDiagnosis}
                              onClick={() => setDiagnosisToRemove(diagnosis)}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="doctor-encounter-empty">No diagnosis recorded.</p>
                )}
              </section>

              <section className="doctor-encounter-section">
                <div className="doctor-encounter-section-head">
                  <h3>Prescription</h3>
                  {encounter.canSignOff && (
                    <Link to={`/doctor/encounters/${encounter._id}/prescriptions/new`} className="btn btn-outline btn-sm">
                      Create prescription
                    </Link>
                  )}
                </div>

                {rxLoading ? (
                  <p className="doctor-encounter-empty">Loading prescription…</p>
                ) : !prescription || !prescription.lineItems?.length ? (
                  <p className="doctor-encounter-empty">No prescription created for this encounter yet.</p>
                ) : (
                  <>
                    <div className="prescription-detail-table-wrap">
                      <table className="prescription-detail-table">
                        <thead>
                          <tr>
                            <th>Medicine</th>
                            <th>Qty</th>
                            <th>Duration</th>
                            <th>Dosage</th>
                            <th>Instructions</th>
                            <th className="prescription-detail-money">Line total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prescription.lineItems.map((item) => (
                            <tr key={item.medicineId}>
                              <td>
                                <strong>{item.medicineName}</strong>
                                <span>{item.medicineCode}</span>
                              </td>
                              <td>
                                {item.quantity} {item.unit}
                              </td>
                              <td>{item.durationDays} days</td>
                              <td>{item.dosage || "-"}</td>
                              <td>{item.instructions || "-"}</td>
                              <td className="prescription-detail-money">{formatCurrency(item.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="doctor-encounter-section-foot">
                      <Link to={`/doctor/prescriptions/${prescription._id}`} className="btn btn-primary btn-sm">
                        View prescription
                      </Link>
                    </div>
                  </>
                )}
              </section>

              <section className="doctor-encounter-section">
                <div className="doctor-encounter-section-head">
                  <h3>Medical images</h3>
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
                  <div className="doctor-encounter-image-gallery">
                    {imagesByDate.map(([dateLabel, images]) => (
                      <div key={dateLabel} className="doctor-encounter-image-day">
                        <h4 className="doctor-encounter-image-day-title">{dateLabel}</h4>
                        <div className="doctor-encounter-image-grid">
                          {images.map((image) => (
                            <article key={image._id} className="doctor-encounter-image-card">
                              <button
                                type="button"
                                className="doctor-encounter-image-thumb"
                                onClick={() => setLightboxImage(image)}
                                aria-label={`View ${image.title} fullscreen`}
                              >
                                <img src={image.thumbnailUrl || image.url} alt={image.title} />
                                <span className="doctor-encounter-image-zoom">View</span>
                              </button>
                              <div className="doctor-encounter-image-meta">
                                <strong>{image.title}</strong>
                                <span>{image.type || "image"}</span>
                              </div>
                              {encounter.canSignOff && (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  disabled={submitting}
                                  onClick={() => setImageToDelete(image)}
                                >
                                  Delete
                                </button>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="doctor-encounter-empty">No medical images attached.</p>
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

        {isAddDiagnosisOpen && (
          <AppModal
            title="Add diagnosis"
            description="Search an ICD-10 code and add optional notes for this diagnosis."
            onClose={() => setIsAddDiagnosisOpen(false)}
          >
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveDiagnosis();
              }}
            >
              {modalError && <div className="alert alert-error">{modalError}</div>}

              <SearchableSelect
                label="ICD-10 code"
                placeholder="Select or search ICD-10 code…"
                searchPlaceholder="Type to search code or description…"
                value={selectedIcdCode}
                onChange={setSelectedIcdCode}
                loadOptions={loadIcdOptions}
                required
              />

              <label>
                Diagnosis note
                <textarea
                  className="encounter-edit-textarea"
                  value={diagnosisNote}
                  onChange={(e) => setDiagnosisNote(e.target.value)}
                  placeholder="Optional notes (e.g. primary, secondary, mild)…"
                />
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsAddDiagnosisOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalSubmitting || !selectedIcdCode}>
                  {modalSubmitting ? "Saving…" : "Save diagnosis"}
                </button>
              </div>
            </form>
          </AppModal>
        )}

        {isEditDiagnosisOpen && diagnosisToEdit && (
          <AppModal
            title="Edit diagnosis"
            description="Update ICD-10 code or clinical notes. Changes are audited."
            onClose={() => {
              if (!modalSubmitting) {
                setIsEditDiagnosisOpen(false);
                setDiagnosisToEdit(null);
              }
            }}
          >
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateDiagnosis();
              }}
            >
              {modalError && <div className="alert alert-error">{modalError}</div>}

              <SearchableSelect
                label="ICD-10 code"
                placeholder="Select or search ICD-10 code…"
                searchPlaceholder="Type to search code or description…"
                value={selectedIcdCode}
                onChange={setSelectedIcdCode}
                loadOptions={loadIcdOptions}
                pinnedLabel={
                  diagnosisToEdit
                    ? `${diagnosisToEdit.code} - ${diagnosisToEdit.text}`
                    : ""
                }
                required
              />

              <label>
                Diagnosis note
                <textarea
                  className="encounter-edit-textarea"
                  value={diagnosisNote}
                  onChange={(e) => setDiagnosisNote(e.target.value)}
                  placeholder="Optional notes (e.g. primary, secondary, mild)…"
                />
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setIsEditDiagnosisOpen(false);
                    setDiagnosisToEdit(null);
                  }}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalSubmitting || !selectedIcdCode}>
                  {modalSubmitting ? "Saving…" : "Update diagnosis"}
                </button>
              </div>
            </form>
          </AppModal>
        )}

        <ConfirmDialog
          open={Boolean(diagnosisToRemove)}
          title="Remove diagnosis?"
          description={
            diagnosisToRemove
              ? `Remove "${diagnosisToRemove.code} - ${diagnosisToRemove.text}" from this encounter?`
              : ""
          }
          confirmText={removingDiagnosis ? "Removing…" : "Remove"}
          variant="danger"
          loading={removingDiagnosis}
          onConfirm={handleConfirmRemoveDiagnosis}
          onCancel={() => setDiagnosisToRemove(null)}
        />

        <ConfirmDialog
          open={confirmSignOff}
          title="Sign off encounter?"
          description="After sign-off, clinical notes and diagnoses are finalized and can no longer be edited."
          confirmText={submitting ? "Signing off…" : "Sign off"}
          loading={submitting}
          onConfirm={handleConfirmSignOff}
          onCancel={() => setConfirmSignOff(false)}
        />

        <ConfirmDialog
          open={Boolean(imageToDelete)}
          title="Delete medical image?"
          description={
            imageToDelete ? `Delete "${imageToDelete.title}" from this encounter?` : ""
          }
          confirmText={submitting ? "Deleting…" : "Delete"}
          variant="danger"
          loading={submitting}
          onConfirm={handleConfirmDeleteImage}
          onCancel={() => setImageToDelete(null)}
        />

        {lightboxImage && (
          <div
            className="doctor-encounter-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={lightboxImage.title}
            onClick={() => {
              setLightboxImage(null);
              setLightboxZoom(1);
              setLightboxPan({ x: 0, y: 0 });
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setLightboxImage(null);
                setLightboxZoom(1);
                setLightboxPan({ x: 0, y: 0 });
              }
            }}
          >
            <div className="doctor-encounter-lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setLightboxZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))));
                  if (lightboxZoom <= 1.25) setLightboxPan({ x: 0, y: 0 });
                }}
              >
                Zoom out
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setLightboxZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
              >
                Zoom in
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setLightboxZoom(1);
                  setLightboxPan({ x: 0, y: 0 });
                }}
              >
                Reset
              </button>
              <a
                className="btn btn-primary btn-sm"
                href={lightboxImage.url}
                download={lightboxImage.title || "medical-image"}
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setLightboxImage(null);
                  setLightboxZoom(1);
                  setLightboxPan({ x: 0, y: 0 });
                }}
              >
                Close
              </button>
            </div>
            <figure
              className="doctor-encounter-lightbox-figure"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`doctor-encounter-lightbox-stage${lightboxZoom > 1 ? " is-zoomable" : ""}`}
                onPointerDown={(e) => {
                  if (lightboxZoom <= 1) return;
                  setLightboxDragging(true);
                  lightboxDragStart.current = {
                    x: e.clientX - lightboxPan.x,
                    y: e.clientY - lightboxPan.y,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!lightboxDragging || !lightboxDragStart.current) return;
                  setLightboxPan({
                    x: e.clientX - lightboxDragStart.current.x,
                    y: e.clientY - lightboxDragStart.current.y,
                  });
                }}
                onPointerUp={() => {
                  setLightboxDragging(false);
                  lightboxDragStart.current = null;
                }}
              >
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.title}
                  style={{
                    transform: `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`,
                  }}
                  draggable={false}
                />
              </div>
              <figcaption>
                <strong>{lightboxImage.title}</strong>
                <span>
                  {lightboxImage.type || "image"}
                  {lightboxImage.createdAt
                    ? ` · ${new Date(lightboxImage.createdAt).toLocaleString()}`
                    : ""}
                  {` · ${Math.round(lightboxZoom * 100)}%`}
                </span>
              </figcaption>
            </figure>
          </div>
        )}

        {showUploadModal && (
          <AppModal
            title="Upload medical image"
            description="Attach an imaging study to this encounter. Max 10MB."
            onClose={() => (!uploadingImage ? setShowUploadModal(false) : undefined)}
          >
            <form className="form" onSubmit={handleUploadSubmit}>
              <FilterFormField
                id="medical-image-title"
                label="Title"
                required
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g. Chest X-Ray PA"
              />
              <CustomSelect
                label="Type"
                value={uploadForm.type}
                onChange={(value) => setUploadForm({ ...uploadForm, type: value })}
                options={[
                  { value: "X-Ray", label: "X-Ray" },
                  { value: "MRI", label: "MRI" },
                  { value: "CT Scan", label: "CT Scan" },
                  { value: "Ultrasound", label: "Ultrasound" },
                  { value: "Other", label: "Other" },
                ]}
              />
              <label className="doctor-encounter-file-field">
                <span className="filter-field-label">Image file</span>
                <input
                  required
                  type="file"
                  className="filter-field-control"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                />
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadingImage}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadingImage || !uploadForm.file}>
                  {uploadingImage ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </AppModal>
        )}
      </DoctorLayout>
    </PageLayout>
  );
}
