import { useCallback, useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import DatePicker from "../components/DatePicker.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "../styles/patient.shared.css";
import "./PatientInsuranceCardsPage.css";

const emptyForm = {
  providerName: "",
  policyNumber: "",
  holderName: "",
  coveragePercent: "0",
  validFrom: "",
  validTo: "",
  isPrimary: false,
};

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected image"));
    reader.readAsDataURL(file);
  });
}

function formatValidity(from, to) {
  if (!from && !to) return "—";
  return `${from || "—"} → ${to || "—"}`;
}

export default function PatientInsuranceCardsPage() {
  const uploadInputId = useId();
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [ocrFileName, setOcrFileName] = useState("");
  const [error, setError] = useState("");
  const [editingCardId, setEditingCardId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isEditing = Boolean(editingCardId);

  const primaryCount = cards.filter((card) => card.isPrimary).length;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCardId("");
    setOcrFileName("");
    setOcrMessage("");
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (card) => {
    setEditingCardId(card._id);
    setForm({
      providerName: card.providerName || "",
      policyNumber: card.policyNumber || "",
      holderName: card.holderName || "",
      coverageType: card.coverageType || "",
      coveragePercent: card.coveragePercent != null ? String(card.coveragePercent) : "",
      validFrom: card.validFrom || "",
      validTo: card.validTo || "",
      isPrimary: Boolean(card.isPrimary),
    });
    setOcrFileName("");
    setOcrMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.listInsuranceCards();
      setCards(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setOcrMessage("");
    setError("");
  };

  const onOcrImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPEG, PNG, or WebP image of your insurance card.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setOcrBusy(true);
    setOcrFileName(file.name);
    setOcrMessage("");
    setError("");

    try {
      const image = await readFileAsDataUrl(file);
      const { data } = await PatientApiClient.extractInsuranceCardOcr({
        fileName: file.name,
        image,
      });

      setForm((current) => ({
        ...current,
        policyNumber: data.policyNumber || current.policyNumber,
        holderName: data.holderName || current.holderName,
        providerName: data.providerName || current.providerName,
        validFrom: data.validFrom || current.validFrom,
        validTo: data.validTo || current.validTo,
      }));

      const confidence =
        typeof data.confidence === "number" && data.confidence > 0
          ? ` (${data.confidence}% confidence)`
          : "";
      setOcrMessage(
        data.source === "tesseract"
          ? `Policy details read from your card${confidence}. Review and edit before saving.`
          : "Policy number suggested. You can edit all fields before saving."
      );
    } catch (err) {
      const apiMessage = getApiErrorMessage(err);
      setError(apiMessage);
      if (err?.response?.status === 422) {
        const partial = err.response.data || {};
        setForm((current) => ({
          ...current,
          holderName: partial.holderName || current.holderName,
          providerName: partial.providerName || current.providerName,
          validFrom: partial.validFrom || current.validFrom,
          validTo: partial.validTo || current.validTo,
        }));
      }
    } finally {
      setOcrBusy(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        providerName: form.providerName,
        policyNumber: form.policyNumber,
        holderName: form.holderName,
        coverageType: form.coverageType || undefined,
        coveragePercent: form.coveragePercent === "" ? 0 : Number(form.coveragePercent),
        validFrom: form.validFrom || undefined,
        validTo: form.validTo || undefined,
        isPrimary: form.isPrimary,
      };
      if (isEditing) {
        await PatientApiClient.updateInsuranceCard(editingCardId, payload);
      } else {
        await PatientApiClient.createInsuranceCard(payload);
      }
      closeForm();
      await loadCards();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await PatientApiClient.deleteInsuranceCard(deleteTarget._id);
      setDeleteTarget(null);
      if (editingCardId === deleteTarget._id) closeForm();
      await loadCards();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout>
      <div className="patient-insurance-fullpage">
      <div className="patient-insurance-toolbar">
        <Link to="/patient" className="patient-insurance-back">
          <BackIcon />
          Back to dashboard
        </Link>
        {!loading && cards.length > 0 && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => (showForm && !isEditing ? closeForm() : openCreateForm())}
          >
            {showForm ? "Hide form" : "Add insurance card"}
          </button>
        )}
      </div>

      <section className="patient-insurance-hero">
        <span className="patient-insurance-hero-orb patient-insurance-hero-orb--1" aria-hidden="true" />
        <span className="patient-insurance-hero-orb patient-insurance-hero-orb--2" aria-hidden="true" />

        <div className="patient-insurance-hero-inner">
          <div className="patient-insurance-hero-main">
            <div className="patient-insurance-hero-icon" aria-hidden="true">
              <ShieldIcon />
            </div>
            <div>
              <p className="patient-insurance-eyebrow">Health insurance</p>
              <h1>Insurance cards</h1>
              <p className="patient-insurance-hero-lead">
                Saved policies for faster check-in and booking discounts.
              </p>
            </div>
          </div>

          <div className="patient-insurance-hero-stats">
            <div className="patient-insurance-hero-stat">
              <strong>{loading ? "…" : cards.length}</strong>
              <span>Saved</span>
            </div>
            <div className="patient-insurance-hero-stat patient-insurance-hero-stat--highlight">
              <strong>{loading ? "…" : primaryCount}</strong>
              <span>Primary</span>
            </div>
          </div>
        </div>
      </section>

      <div className="patient-insurance-page-body">
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="patient-insurance-panel patient-insurance-loading">
            <div className="loading-spinner" />
            <p>Loading insurance cards…</p>
          </div>
        ) : cards.length === 0 && !showForm ? (
          <div className="patient-insurance-panel patient-insurance-empty">
            <div className="patient-insurance-empty-icon" aria-hidden="true">
              <ShieldIcon />
            </div>
            <h2>No insurance cards yet</h2>
            <p>Add a policy to use insurance benefits when booking appointments.</p>
            <button type="button" className="btn btn-primary" onClick={openCreateForm}>
              Add insurance card
            </button>
          </div>
        ) : (
          <>
            {showForm && (
              <div className="patient-insurance-panel patient-insurance-form-panel">
                <div className="patient-insurance-form-head">
                  <div>
                    <h2>{isEditing ? "Update insurance card" : "Add insurance card"}</h2>
                    <p>{isEditing ? "Edit policy details and save changes." : "Upload a card photo for OCR, then review the fields below."}</p>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={closeForm}>
                    Close
                  </button>
                </div>

                <form onSubmit={onSubmit} className="patient-insurance-form">
                  <div className="patient-insurance-form-layout">
                    {!isEditing && (
                    <div className="patient-insurance-form-ocr">
                      <span className="patient-insurance-field-label">Scan card image (OCR)</span>
                      <input
                        id={uploadInputId}
                        type="file"
                        accept="image/*"
                        className="patient-insurance-upload-input"
                        onChange={onOcrImageChange}
                        disabled={ocrBusy || saving}
                      />
                      <label
                        htmlFor={uploadInputId}
                        className={`patient-insurance-upload-box${ocrBusy ? " is-busy" : ""}`}
                      >
                        <span className="patient-insurance-upload-icon" aria-hidden="true">
                          <UploadIcon />
                        </span>
                        <p className="patient-insurance-upload-title">
                          {ocrBusy ? "Reading card image…" : "Upload insurance card photo"}
                        </p>
                        <p className="patient-insurance-upload-hint">
                          JPEG, PNG or WebP · max 5 MB
                        </p>
                        {ocrFileName && (
                          <span className="patient-insurance-upload-file">{ocrFileName}</span>
                        )}
                      </label>
                      {ocrMessage && <p className="patient-insurance-ocr-success">{ocrMessage}</p>}
                    </div>
                    )}

                    <div className="patient-insurance-form-fields">
                      <p className="patient-insurance-field-label patient-insurance-field-label--section">
                        Policy details
                      </p>
                      <div className="patient-insurance-form-grid">
                        <label>
                          <span className="patient-insurance-field-label">Provider</span>
                          <input
                            name="providerName"
                            value={form.providerName}
                            onChange={onChange}
                            placeholder="e.g. Bảo Việt, BHYT"
                            required
                          />
                        </label>
                        <label>
                          <span className="patient-insurance-field-label">Policy number</span>
                          <input
                            name="policyNumber"
                            value={form.policyNumber}
                            onChange={onChange}
                            placeholder="e.g. BV-2026-889944"
                            required
                          />
                        </label>
                        <label>
                          <span className="patient-insurance-field-label">Policy holder</span>
                          <input
                            name="holderName"
                            value={form.holderName}
                            onChange={onChange}
                            placeholder="Full name on the card"
                            required
                          />
                        </label>
                        <label>
                          <span className="patient-insurance-field-label">Coverage type</span>
                          <input
                            name="coverageType"
                            value={form.coverageType}
                            onChange={onChange}
                            placeholder="e.g. Student, Family"
                          />
                        </label>
                        <label>
                          <span className="patient-insurance-field-label">Coverage % (bảo lãnh)</span>
                          <input
                            type="number"
                            name="coveragePercent"
                            min="0"
                            max="100"
                            step="1"
                            value={form.coveragePercent}
                            onChange={onChange}
                            placeholder="e.g. 30"
                          />
                        </label>
                        <DatePicker
                          label="Valid from"
                          name="validFrom"
                          value={form.validFrom}
                          onChange={onChange}
                          max={form.validTo || undefined}
                          placeholder="Select start date"
                        />
                        <DatePicker
                          label="Valid to"
                          name="validTo"
                          value={form.validTo}
                          onChange={onChange}
                          min={form.validFrom || undefined}
                          placeholder="Select end date"
                        />
                        <label className="patient-insurance-checkbox field-span-2">
                          <input
                            type="checkbox"
                            name="isPrimary"
                            checked={form.isPrimary}
                            onChange={onChange}
                          />
                          Set as primary policy
                        </label>
                      </div>

                      <div className="patient-insurance-form-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving || ocrBusy}>
                          {saving ? "Saving…" : isEditing ? "Save changes" : "Save insurance card"}
                        </button>
                        <button type="button" className="btn btn-outline" disabled={saving} onClick={closeForm}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div className="patient-insurance-list">
              {cards.map((card) => (
                <article
                  key={card._id}
                  className={`patient-insurance-card-item${card.isPrimary ? " is-primary" : ""}`}
                >
                  <div className="patient-insurance-card-strip" aria-hidden="true">
                    <ShieldIcon />
                  </div>
                  <div className="patient-insurance-card-content">
                    <div className="patient-insurance-card-top">
                      <div>
                        <p className="patient-insurance-card-provider">{card.providerName}</p>
                        <p className="patient-insurance-card-number">{card.policyNumber}</p>
                      </div>
                      {card.isPrimary && <span className="insurance-primary-badge">Primary</span>}
                    </div>
                    <div className="patient-insurance-card-actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openEditForm(card)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm btn-danger-outline"
                        onClick={() => setDeleteTarget(card)}
                      >
                        Delete
                      </button>
                    </div>
                    <dl className="patient-insurance-card-meta">
                      <div>
                        <dt>Holder</dt>
                        <dd>{card.holderName}</dd>
                      </div>
                      <div>
                        <dt>Coverage</dt>
                        <dd>
                          {card.coverageType || "General"}
                          {card.coveragePercent > 0 ? ` · ${card.coveragePercent}% bảo lãnh` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>Validity</dt>
                        <dd>{formatValidity(card.validFrom, card.validTo)}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete insurance card?"
        description={
          deleteTarget
            ? `Remove policy ${deleteTarget.policyNumber}? It will no longer appear when booking.`
            : ""
        }
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </PageLayout>
  );
}
