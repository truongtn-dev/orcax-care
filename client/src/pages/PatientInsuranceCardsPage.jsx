import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "../styles/patient.shared.css";
import "./PatientInsuranceCardsPage.css";

const emptyForm = {
  providerName: "",
  policyNumber: "",
  holderName: "",
  coverageType: "",
  validFrom: "",
  validTo: "",
  isPrimary: false,
};

export default function PatientInsuranceCardsPage() {
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [ocrFileName, setOcrFileName] = useState("");
  const [error, setError] = useState("");

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

    setOcrBusy(true);
    setOcrFileName(file.name);
    setOcrMessage("");
    setError("");

    try {
      const { data } = await PatientApiClient.extractInsuranceCardOcr({
        fileName: file.name,
      });
      setForm((current) => ({
        ...current,
        policyNumber: data.policyNumber || current.policyNumber,
      }));
      setOcrMessage("Policy number filled from OCR stub. You can edit it before saving.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setOcrBusy(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await PatientApiClient.createInsuranceCard({
        providerName: form.providerName,
        policyNumber: form.policyNumber,
        holderName: form.holderName,
        coverageType: form.coverageType || undefined,
        validFrom: form.validFrom || undefined,
        validTo: form.validTo || undefined,
        isPrimary: form.isPrimary,
      });
      setForm(emptyForm);
      setOcrFileName("");
      setOcrMessage("");
      setShowForm(false);
      await loadCards();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <div className="patient-insurance-page">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1>Insurance cards</h1>
              <p>View saved health insurance policies linked to your account.</p>
            </div>
            <Link to="/patient" className="btn btn-secondary">
              Back to dashboard
            </Link>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="patient-insurance-loading">Loading insurance cards…</p>
        ) : cards.length === 0 && !showForm ? (
          <div className="patient-panel">
            <div className="patient-panel-head">
              <div className="patient-panel-head-main">
                <h2>No insurance cards yet</h2>
                <p className="patient-panel-lead">
                  Add a policy to use insurance benefits when booking appointments.
                </p>
              </div>
            </div>
            <div className="patient-panel-body">
              <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
                Add insurance card
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="patient-insurance-toolbar">
              <p className="text-muted">{cards.length} saved polic{cards.length === 1 ? "y" : "ies"}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowForm((current) => !current)}
              >
                {showForm ? "Hide form" : "Add insurance card"}
              </button>
            </div>

            {showForm && (
              <div className="patient-panel" style={{ marginBottom: "1.25rem" }}>
                <div className="patient-panel-head">
                  <div className="patient-panel-head-main">
                    <h2>Add insurance card</h2>
                    <p className="patient-panel-lead">Enter your policy details below.</p>
                  </div>
                </div>
                <div className="patient-panel-body">
                  <form onSubmit={onSubmit} className="form">
                    <p className="patient-section-label">Policy details</p>
                    <fieldset className="form-section" style={{ padding: 0, background: "none", border: "none" }}>
                      <label>
                        Provider
                        <input
                          name="providerName"
                          value={form.providerName}
                          onChange={onChange}
                          required
                        />
                      </label>
                      <label>
                        Upload card image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onOcrImageChange}
                          disabled={ocrBusy || saving}
                        />
                        <span className="hint">
                          {ocrBusy
                            ? "Reading image..."
                            : "OCR is a demo stub. It suggests a policy number from the file name."}
                        </span>
                        {ocrFileName && <span className="hint">Selected file: {ocrFileName}</span>}
                      </label>
                      {ocrMessage && <div className="alert alert-success">{ocrMessage}</div>}
                      <label>
                        Policy number
                        <input
                          name="policyNumber"
                          value={form.policyNumber}
                          onChange={onChange}
                          required
                        />
                      </label>
                      <label>
                        Policy holder
                        <input name="holderName" value={form.holderName} onChange={onChange} required />
                      </label>
                      <label>
                        Coverage type
                        <input name="coverageType" value={form.coverageType} onChange={onChange} />
                      </label>
                      <div className="form-row">
                        <label>
                          Valid from
                          <input type="date" name="validFrom" value={form.validFrom} onChange={onChange} />
                        </label>
                        <label>
                          Valid to
                          <input type="date" name="validTo" value={form.validTo} onChange={onChange} />
                        </label>
                      </div>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="isPrimary"
                          checked={form.isPrimary}
                          onChange={onChange}
                        />
                        Set as primary policy
                      </label>
                    </fieldset>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? "Saving…" : "Save insurance card"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="patient-insurance-grid">
              {cards.map((card) => (
                <article key={card._id} className="patient-panel">
                  <div className="patient-panel-head patient-insurance-card-head">
                    <div className="patient-panel-head-main">
                      <h2>{card.providerName}</h2>
                    </div>
                    {card.isPrimary && <span className="insurance-primary-badge">Primary</span>}
                  </div>
                  <div className="patient-panel-body">
                    <p className="patient-section-label">Policy details</p>
                    <dl className="patient-fact-list">
                      <div className="patient-fact-row">
                        <dt>Policy number</dt>
                        <dd>{card.policyNumber}</dd>
                      </div>
                      <div className="patient-fact-row">
                        <dt>Holder</dt>
                        <dd>{card.holderName}</dd>
                      </div>
                      {card.coverageType && (
                        <div className="patient-fact-row">
                          <dt>Coverage</dt>
                          <dd>{card.coverageType}</dd>
                        </div>
                      )}
                      {(card.validFrom || card.validTo) && (
                        <div className="patient-fact-row">
                          <dt>Validity</dt>
                          <dd>
                            {card.validFrom || "—"} to {card.validTo || "—"}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
