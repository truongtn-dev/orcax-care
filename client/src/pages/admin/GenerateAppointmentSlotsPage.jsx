import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
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

export default function GenerateAppointmentSlotsPage() {
  const [form, setForm] = useState({
    startDate: defaultDate(1),
    endDate: defaultDate(14),
    doctorId: "",
  });
  const [doctors, setDoctors] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDoctors() {
      setLoading(true);
      try {
        const { data } = await AdminApiClient.getDoctors({ activeOnly: true, limit: 100 });
        setDoctors(data.items || []);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadDoctors();
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setResult(null);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const { data } = await AdminApiClient.generateAppointmentSlots({
        startDate: form.startDate,
        endDate: form.endDate,
        doctorId: form.doctorId || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const doctorOptions = [
    { value: "", label: "All doctors" },
    ...doctors.map((item) => ({
      value: item._id,
      label: item.fullName,
    })),
  ];

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Generate appointment slots</h1>
        <p>
          Batch-create bookable slots from weekly shift templates. Holidays are skipped and
          duplicate slot times are not created.
        </p>
      </div>

      <div className="card form-card-centered">
        {loading ? (
          <p>Loading doctors…</p>
        ) : (
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}
            {result && (
              <div className="alert alert-success">
                Created {result.created} slot{result.created === 1 ? "" : "s"}, skipped{" "}
                {result.skipped} duplicate{result.skipped === 1 ? "" : "s"}, holidays skipped{" "}
                {result.holidaysSkipped} day{result.holidaysSkipped === 1 ? "" : "s"} across{" "}
                {result.shiftsProcessed} shift template{result.shiftsProcessed === 1 ? "" : "s"}.
              </div>
            )}

            <fieldset className="form-section">
              <legend>Generation range</legend>

              <div className="form-row">
                <label>
                  Start date
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={onChange}
                    required
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={onChange}
                    required
                  />
                </label>
              </div>

              <CustomSelect
                id="generate-slots-doctor"
                label="Doctor"
                value={form.doctorId}
                placeholder="All doctors"
                onChange={(doctorId) => setForm((current) => ({ ...current, doctorId }))}
                options={doctorOptions}
              />
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={generating}>
                {generating ? "Generating…" : "Generate slots"}
              </button>
              <Link to="/admin/work-shifts" className="btn btn-secondary">
                Back to shifts
              </Link>
            </div>
          </form>
        )}
      </div>
    </PageLayout>
  );
}
