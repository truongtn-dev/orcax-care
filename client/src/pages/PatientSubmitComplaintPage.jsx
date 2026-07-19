import { useId, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { UploadApiClient } from "../services/uploadApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./PatientDashboardPage.css";
import "./PatientComplaintPage.css";

const CATEGORY_OPTIONS = [
  { value: "service", label: "Service quality" },
  { value: "billing", label: "Billing or payment" },
  { value: "doctor", label: "Doctor experience" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "technical", label: "Technical issue" },
  { value: "other", label: "Other" },
];

const TICKET_TYPE_OPTIONS = [
  { value: "complaint", label: "Complaint" },
  { value: "feedback", label: "Feedback" },
  { value: "request", label: "Support request" },
];

const EMPTY_FORM = {
  category: "service",
  ticketType: "complaint",
  description: "",
  attachmentUrl: "",
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export default function PatientSubmitComplaintPage() {
  const fileInputId = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachmentName, setAttachmentName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const clearAttachment = () => {
    setAttachmentName("");
    updateField("attachmentUrl", "");
  };

  const handleAttachmentChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Attachment must be an image (JPG, PNG, GIF, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Attachment must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const image = await readFileAsDataUrl(file);
      const { data } = await UploadApiClient.uploadImage({
        image,
        folder: "orcaxcare/complaints",
      });
      updateField("attachmentUrl", data.url || "");
      setAttachmentName(file.name);
    } catch (err) {
      clearAttachment();
      setError(getApiErrorMessage(err) || "Could not upload attachment.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setCreated(null);
    setSubmitting(true);

    try {
      const payload = {
        category: form.category,
        ticketType: form.ticketType,
        description: form.description.trim(),
        attachmentUrl: form.attachmentUrl || undefined,
      };
      const { data } = await PatientApiClient.createComplaint(payload);
      setCreated(data.item);
      setForm(EMPTY_FORM);
      setAttachmentName("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="patient-dashboard patient-complaint-page">
        <section className="patient-dashboard-hero patient-complaint-hero">
          <div className="patient-dashboard-hero-inner">
            <div className="patient-dashboard-hero-main">
              <p className="patient-dashboard-hero-eyebrow">Complaint handling</p>
              <h1>Submit a complaint</h1>
              <p className="patient-dashboard-hero-lead">
                Create a support ticket for service issues, billing questions, or care feedback.
              </p>
            </div>
          </div>
        </section>

        {error && <div className="alert alert-error">{error}</div>}
        {created && (
          <div className="alert alert-success patient-complaint-success">
            <span>
              Complaint submitted. Ticket <strong>{created.ticketId}</strong> is now open.
            </span>
            <Link to="/patient/complaints" className="btn btn-outline btn-sm">
              View my complaints
            </Link>
          </div>
        )}

        <section className="patient-complaint-card">
          <form className="patient-complaint-form" onSubmit={handleSubmit}>
            <CustomSelect
              label="Category"
              value={form.category}
              onChange={(value) => updateField("category", value)}
              options={CATEGORY_OPTIONS}
            />

            <CustomSelect
              label="Ticket type"
              value={form.ticketType}
              onChange={(value) => updateField("ticketType", value)}
              options={TICKET_TYPE_OPTIONS}
            />

            <label className="patient-complaint-form-wide">
              Description
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                minLength={10}
                maxLength={2000}
                rows={7}
                placeholder="Describe what happened and what support you need."
                required
              />
            </label>

            <div className="patient-complaint-form-wide patient-complaint-attachment-field">
              <span className="patient-complaint-attachment-label">Attachment (optional)</span>
              <p className="patient-complaint-attachment-hint">
                Upload a screenshot or photo (JPG, PNG, WebP · max 5 MB).
              </p>
              <div className="patient-complaint-attachment-row">
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="patient-complaint-attachment-input"
                  onChange={handleAttachmentChange}
                  disabled={uploading || submitting}
                />
                <label htmlFor={fileInputId} className="btn btn-outline btn-sm">
                  {uploading ? "Uploading…" : form.attachmentUrl ? "Change image" : "Choose image"}
                </label>
                {form.attachmentUrl ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={clearAttachment}
                    disabled={uploading || submitting}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {form.attachmentUrl ? (
                <div className="patient-complaint-attachment-preview">
                  <img src={form.attachmentUrl} alt="Complaint attachment preview" />
                  {attachmentName ? <span>{attachmentName}</span> : null}
                </div>
              ) : null}
            </div>

            <div className="patient-complaint-actions">
              <Link to="/patient" className="btn btn-outline">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
                {submitting ? "Submitting…" : "Submit complaint"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </PageLayout>
  );
}
