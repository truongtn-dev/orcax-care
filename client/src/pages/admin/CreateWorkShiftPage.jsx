import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./schedulingFormPages.css";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import SearchableSelect from "../../components/SearchableSelect.jsx";
import ShiftPlanPreview from "../../components/ShiftPlanPreview.jsx";
import TimePicker from "../../components/TimePicker.jsx";
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
  const [rooms, setRooms] = useState([]);
  const [created, setCreated] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      try {
        const roomRes = await AdminApiClient.listClinicRooms({ isActive: "true", limit: 100 });
        setRooms(roomRes.data.items || []);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    if (!form.doctorId) {
      setPreview(null);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const { data } = await AdminApiClient.previewWorkShift({
          doctorId: form.doctorId,
          roomId: form.roomId || undefined,
          dayOfWeek: Number(form.dayOfWeek),
          startTime: form.startTime,
          endTime: form.endTime,
          maxPatients: Number(form.maxPatients),
        });
        setPreview(data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form]);

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

  const loadDoctorOptions = useCallback(async (query) => {
    const { data } = await AdminApiClient.getDoctors({
      activeOnly: true,
      q: query,
      limit: 30,
    });
    const items = (data.items || []).map((item) => ({
      value: item._id,
      label: `${item.fullName} — ${item.specialtyName || "Specialty"}`,
    }));
    return query ? items : [{ value: "", label: "Select doctor" }, ...items];
  }, []);

  const roomOptions = [
    { value: "", label: "No room assigned" },
    ...rooms.map((item) => ({
      value: item._id,
      label: `${item.roomNumber || item.roomCode || ""} ${item.name}`.trim(),
    })),
  ];

  const showPreviewPanel = Boolean(form.doctorId);
  const cardClassName = `card scheduling-form-card${showPreviewPanel ? " scheduling-form-card--wide" : ""}`;
  const layoutClassName = `scheduling-form-layout${showPreviewPanel ? " scheduling-form-layout--split" : ""}`;

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Create work shift"
        description="Weekly template for a doctor — used when generating appointment slots."
      >
      <div className={cardClassName}>
        {loading ? (
          <p className="scheduling-form-main" style={{ padding: "1.75rem 2rem" }}>Loading clinic rooms…</p>
        ) : (
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}
            {created && (
              <div className="alert alert-success">
                Created shift {created.dayLabel} ({created.startTime}–{created.endTime}) for {created.doctorName}.
                Each slot {created.slotDurationMin} min, up to {created.maxPatients} patients.
              </div>
            )}

            <div className={layoutClassName}>
              <div className="scheduling-form-main">
                <fieldset className="form-section">
                  <legend>Shift details</legend>

                  <div className="scheduling-form-grid">
                    <div className="scheduling-form-span-2">
                      <SearchableSelect
                        id="work-shift-doctor"
                        label="Doctor"
                        value={form.doctorId}
                        placeholder="Select doctor"
                        searchPlaceholder="Search doctor name, email, license…"
                        onChange={(doctorId) => setForm((current) => ({ ...current, doctorId }))}
                        loadOptions={loadDoctorOptions}
                        required
                      />
                    </div>

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

                    <TimePicker
                      id="work-shift-start"
                      label="Start time"
                      name="startTime"
                      value={form.startTime}
                      onChange={onChange}
                      max={form.endTime}
                      required
                    />
                    <TimePicker
                      id="work-shift-end"
                      label="End time"
                      name="endTime"
                      value={form.endTime}
                      onChange={onChange}
                      min={form.startTime}
                      required
                    />

                    <label className="scheduling-form-span-2">
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
                  </div>
                </fieldset>
              </div>

              {showPreviewPanel && (
                <aside className="scheduling-form-aside">
                  <ShiftPlanPreview
                    preview={preview}
                    loading={previewLoading}
                    emptyMessage="Adjust day, times, or capacity to refresh the slot plan."
                  />
                </aside>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || !form.doctorId}>
                {saving ? "Saving…" : "Create work shift"}
              </button>
              <Link to="/admin/work-shifts" className="btn btn-secondary">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
      </AdminLayout>
    </PageLayout>
  );
}
