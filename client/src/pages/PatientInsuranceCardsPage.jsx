import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";

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
    setError("");
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
        <p>Loading insurance cards…</p>
      ) : cards.length === 0 && !showForm ? (
        <div className="card empty-state">
          <h3>No insurance cards yet</h3>
          <p>Add a policy to use insurance benefits when booking appointments.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            Add insurance card
          </button>
        </div>
      ) : (
        <>
          <div className="page-header-row" style={{ marginBottom: "1rem" }}>
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
            <div className="card form-card-centered" style={{ marginBottom: "1.25rem" }}>
              <form onSubmit={onSubmit} className="form">
                <fieldset className="form-section">
                  <legend>New insurance card</legend>
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
          )}

          <div className="insurance-card-grid">
            {cards.map((card) => (
              <article key={card._id} className="card insurance-card-item">
                <div className="insurance-card-header">
                  <h3>{card.providerName}</h3>
                  {card.isPrimary && <span className="insurance-primary-badge">Primary</span>}
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Policy number</dt>
                    <dd>{card.policyNumber}</dd>
                  </div>
                  <div>
                    <dt>Holder</dt>
                    <dd>{card.holderName}</dd>
                  </div>
                  {card.coverageType && (
                    <div>
                      <dt>Coverage</dt>
                      <dd>{card.coverageType}</dd>
                    </div>
                  )}
                  {(card.validFrom || card.validTo) && (
                    <div>
                      <dt>Validity</dt>
                      <dd>
                        {card.validFrom || "—"} to {card.validTo || "—"}
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
    </PageLayout>
  );
}
