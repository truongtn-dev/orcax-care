import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./GenerateAppointmentSlotsPage.css";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import DatePicker from "../../components/DatePicker.jsx";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

function defaultDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function countDaysInclusive(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function formatDateLabel(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const DATE_PRESETS = [
  { id: "7d", label: "7 days", startOffset: 1, endOffset: 7 },
  { id: "14d", label: "14 days", startOffset: 1, endOffset: 14 },
  { id: "30d", label: "30 days", startOffset: 1, endOffset: 30 },
];

export default function GenerateAppointmentSlotsPage() {
  const [form, setForm] = useState({
    startDate: defaultDate(1),
    endDate: defaultDate(14),
    doctorId: "",
    doctorName: "",
    scope: "all",
  });
  const [activePreset, setActivePreset] = useState("14d");
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const dayCount = useMemo(
    () => countDaysInclusive(form.startDate, form.endDate),
    [form.startDate, form.endDate],
  );

  const loadDoctorOptions = useCallback(async (query) => {
    const { data } = await AdminApiClient.getDoctors({
      activeOnly: true,
      q: query,
      limit: 30,
    });
    return (data.items || []).map((item) => ({
      value: item._id,
      label: `${item.fullName} — ${item.specialtyName || "Specialty"}`,
    }));
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setActivePreset("");
    setError("");
    setResult(null);
  };

  const applyPreset = (preset) => {
    setForm((current) => ({
      ...current,
      startDate: defaultDate(preset.startOffset),
      endDate: defaultDate(preset.endOffset),
    }));
    setActivePreset(preset.id);
    setError("");
    setResult(null);
  };

  const setScope = (scope) => {
    setForm((current) => ({
      ...current,
      scope,
      doctorId: scope === "all" ? "" : current.doctorId,
      doctorName: scope === "all" ? "" : current.doctorName,
    }));
    setError("");
    setResult(null);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (form.scope === "one" && !form.doctorId) {
      setError("Please search and select a doctor, or choose all active doctors.");
      return;
    }

    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const { data } = await AdminApiClient.generateAppointmentSlots({
        startDate: form.startDate,
        endDate: form.endDate,
        doctorId: form.scope === "one" ? form.doctorId : undefined,
      });
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const scopeShort =
    form.scope === "all"
      ? "All doctors"
      : form.doctorName?.split(" — ")[0] || "One doctor";

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Generate appointment slots"
        description="Batch-create bookable slots from weekly shift templates."
      >
        <div className="slot-gen">
          <div className="card profile-form-card slot-gen-card">
            <div className="slot-gen-meta" aria-label="Current settings">
              <div className="slot-gen-meta-item">
                <span className="slot-gen-meta-label">Range</span>
                <span className="slot-gen-meta-value">
                  {formatDateLabel(form.startDate)} – {formatDateLabel(form.endDate)}
                </span>
              </div>
              <div className="slot-gen-meta-divider" aria-hidden="true" />
              <div className="slot-gen-meta-item">
                <span className="slot-gen-meta-label">Days</span>
                <span className="slot-gen-meta-value">
                  {dayCount > 0 ? dayCount : "—"}
                </span>
              </div>
              <div className="slot-gen-meta-divider" aria-hidden="true" />
              <div className="slot-gen-meta-item slot-gen-meta-item--wide">
                <span className="slot-gen-meta-label">Scope</span>
                <span className="slot-gen-meta-value">{scopeShort}</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="form slot-gen-form">
              {error && <div className="alert alert-error">{error}</div>}

              {result && (
                <div className="slot-gen-result" aria-label="Generation summary">
                  <p className="slot-gen-result-lead">
                    Generated slots for <strong>{formatDateLabel(result.range?.startDate)}</strong> to{" "}
                    <strong>{formatDateLabel(result.range?.endDate)}</strong>.
                  </p>
                  <div className="slot-gen-result-grid">
                    <div className="slot-gen-stat is-success">
                      <strong>{result.created}</strong>
                      <span>Created</span>
                    </div>
                    <div className="slot-gen-stat is-muted">
                      <strong>{result.skipped}</strong>
                      <span>Skipped</span>
                    </div>
                    <div className="slot-gen-stat">
                      <strong>{result.holidaysSkipped}</strong>
                      <span>Holidays</span>
                    </div>
                    <div className="slot-gen-stat">
                      <strong>{result.shiftsProcessed}</strong>
                      <span>Templates</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="slot-gen-block">
                <div className="slot-gen-block-head">
                  <h3>When</h3>
                  <div className="slot-gen-presets" role="group" aria-label="Quick ranges">
                    {DATE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`slot-gen-preset ${activePreset === preset.id ? "is-active" : ""}`}
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="slot-gen-dates">
                  <DatePicker
                    id="generate-slots-start"
                    label="From"
                    name="startDate"
                    value={form.startDate}
                    onChange={onChange}
                    max={form.endDate}
                    required
                  />
                  <span className="slot-gen-dates-sep" aria-hidden="true">
                    →
                  </span>
                  <DatePicker
                    id="generate-slots-end"
                    label="To"
                    name="endDate"
                    value={form.endDate}
                    onChange={onChange}
                    min={form.startDate}
                    required
                  />
                </div>
              </div>

              <div className="slot-gen-block">
                <div className="slot-gen-block-head">
                  <h3>Who</h3>
                  <div className="slot-gen-scope" role="group" aria-label="Doctor scope">
                    <button
                      type="button"
                      className={`slot-gen-scope-btn ${form.scope === "all" ? "is-active" : ""}`}
                      onClick={() => setScope("all")}
                    >
                      All doctors
                    </button>
                    <button
                      type="button"
                      className={`slot-gen-scope-btn ${form.scope === "one" ? "is-active" : ""}`}
                      onClick={() => setScope("one")}
                    >
                      One doctor
                    </button>
                  </div>
                </div>

                {form.scope === "one" ? (
                  <SearchableSelect
                    id="generate-slots-doctor"
                    label="Search doctor"
                    value={form.doctorId}
                    placeholder="Type name, email, or license…"
                    searchPlaceholder="Search…"
                    onChange={(doctorId) =>
                      setForm((current) => ({
                        ...current,
                        doctorId,
                        doctorName: doctorId ? current.doctorName : "",
                      }))
                    }
                    onOptionSelect={(doctorId, label) =>
                      setForm((current) => ({
                        ...current,
                        doctorId,
                        doctorName: doctorId ? label : "",
                      }))
                    }
                    loadOptions={loadDoctorOptions}
                    required
                    emptyMessage="No doctors found."
                  />
                ) : (
                  <p className="slot-gen-scope-note">
                    Every active doctor with a shift template in this date range will be included.
                  </p>
                )}
              </div>

              <div className="form-actions slot-gen-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={generating || (form.scope === "one" && !form.doctorId)}
                >
                  {generating ? "Generating…" : "Generate slots"}
                </button>
                <Link to="/admin/work-shifts" className="btn btn-outline">
                  Manage shifts
                </Link>
              </div>
            </form>

            <p className="slot-gen-footnote">
              Matches weekly templates by day · Skips holidays · Won&apos;t overwrite existing slots ·{" "}
              <Link to="/admin/work-shifts/new">Add shift template</Link>
            </p>
          </div>
        </div>
      </AdminLayout>
    </PageLayout>
  );
}
