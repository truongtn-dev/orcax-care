import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const emptyForm = {
  doctorId: "",
  roomId: "",
  dayOfWeek: "1",
  startTime: "08:00",
  endTime: "12:00",
  maxPatients: "8",
};

export default function CreateWorkShiftPage() {
  const [form, setForm] = useState(emptyForm);
  const [doctors, setDoctors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [created, setCreated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      try {
        const [doctorRes, roomRes] = await Promise.all([
          AdminApiClient.getDoctors({ activeOnly: true, limit: 100 }),
          AdminApiClient.listClinicRooms({ isActive: "true", limit: 100 }),
        ]);
        setDoctors(doctorRes.data.items || []);
        setRooms(roomRes.data.items || []);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setCreated(null);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setCreated(null);
    try {
      const { data } = await AdminApiClient.createWorkShift({
        doctorId: form.doctorId,
        roomId: form.roomId || undefined,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        maxPatients: Number(form.maxPatients),
      });
      setCreated(data);
      setForm(emptyForm);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const doctorOptions = [
    { value: "", label: "Select doctor" },
    ...doctors.map((item) => ({
      value: item._id,
      label: `${item.fullName} — ${item.specialtyName || "Specialty"}`,
    })),
  ];

  const roomOptions = [
    { value: "", label: "No room assigned" },
    ...rooms.map((item) => ({
      value: item._id,
      label: `${item.roomNumber || item.roomCode || ""} ${item.name}`.trim(),
    })),
  ];

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Create work shift</h1>
        <p>Set up a weekly shift template for a doctor. Used to generate appointment slots later.</p>
      </div>

      <div className="card form-card-centered">
        {loading ? (
          <p>Loading doctors and clinic rooms…</p>
        ) : (
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}
            {created && (
              <div className="alert alert-success">
                Created shift {created.dayLabel} ({created.startTime}–{created.endTime}) for {created.doctorName}.
                Each slot {created.slotDurationMin} min, up to {created.maxPatients} patients.
              </div>
            )}

            <fieldset className="form-section">
              <legend>Shift details</legend>

              <CustomSelect
                id="work-shift-doctor"
                label="Doctor"
                value={form.doctorId}
                placeholder="Select doctor"
                onChange={(doctorId) => setForm((current) => ({ ...current, doctorId }))}
                options={doctorOptions}
                required
              />

              <CustomSelect
                id="work-shift-room"
                label="Clinic room"
                value={form.roomId}
                placeholder="No room assigned"
                onChange={(roomId) => setForm((current) => ({ ...current, roomId }))}
                options={roomOptions}
              />

              <CustomSelect
                id="work-shift-day"
                label="Day of week"
                value={form.dayOfWeek}
                onChange={(dayOfWeek) => setForm((current) => ({ ...current, dayOfWeek }))}
                options={DAY_OPTIONS}
              />

              <div className="form-row">
                <label>
                  Start time
                  <input type="time" name="startTime" value={form.startTime} onChange={onChange} required />
                </label>
                <label>
                  End time
                  <input type="time" name="endTime" value={form.endTime} onChange={onChange} required />
                </label>
              </div>

              <label>
                Maximum patients
                <input
                  type="number"
                  name="maxPatients"
                  min="1"
                  max="50"
                  value={form.maxPatients}
                  onChange={onChange}
                  required
                />
              </label>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || !form.doctorId}>
                {saving ? "Saving…" : "Create work shift"}
              </button>
              <Link to="/admin/doctors" className="btn btn-secondary">
                Back to doctor list
              </Link>
            </div>
          </form>
        )}
      </div>
    </PageLayout>
  );
}
