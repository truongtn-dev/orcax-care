import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
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

export default function EditWorkShiftPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [regenerateFutureSlots, setRegenerateFutureSlots] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [shiftRes, roomRes] = await Promise.all([
          AdminApiClient.getWorkShift(id),
          AdminApiClient.listClinicRooms({ isActive: "true", limit: 100 }),
        ]);
        const shift = shiftRes.data;
        setRooms(roomRes.data.items || []);
        setForm({
          roomId: shift.roomId || "",
          dayOfWeek: String(shift.dayOfWeek),
          startTime: shift.startTime,
          endTime: shift.endTime,
          maxPatients: String(shift.maxPatients),
          isActive: shift.isActive !== false,
          doctorName: shift.doctorName,
          doctorId: shift.doctorId,
          dayLabel: shift.dayLabel,
        });
        setPreview({ valid: true, plan: shift.slotPlan, dayLabel: shift.dayLabel });
        const impactRes = await AdminApiClient.getDeleteShiftImpact(id);
        setDeleteImpact(impactRes.data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!form?.doctorId) return undefined;

    const timer = window.setTimeout(async () => {
      try {
        const { data } = await AdminApiClient.previewWorkShift({
          doctorId: form.doctorId,
          roomId: form.roomId || undefined,
          dayOfWeek: Number(form.dayOfWeek),
          startTime: form.startTime,
          endTime: form.endTime,
          maxPatients: Number(form.maxPatients),
          excludeShiftId: id,
        });
        setPreview(data);
      } catch {
        setPreview(null);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form, id]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const onDelete = async () => {
    const impactText = deleteImpact
      ? `\nFuture booked: ${deleteImpact.futureBooked}\nSlots removed: ${deleteImpact.slotsRemovedIfDeleted}`
      : "";
    const confirmed = window.confirm(
      `Delete this shift template?${impactText}\n\nThis cannot be undone if there are no future bookings.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      await AdminApiClient.deleteWorkShift(id);
      navigate("/admin/work-shifts");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await AdminApiClient.updateWorkShift(id, {
        roomId: form.roomId || null,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        maxPatients: Number(form.maxPatients),
        isActive: form.isActive,
        regenerateFutureSlots,
      });
      navigate("/admin/work-shifts");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const roomOptions = [
    { value: "", label: "No room assigned" },
    ...rooms.map((item) => ({
      value: item._id,
      label: `${item.roomNumber || item.roomCode || ""} ${item.name}`.trim(),
    })),
  ];

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Edit work shift"
        description="Adjust hours, capacity, or room. Future appointment slots may need regeneration."
      >
      <div className="card form-card-centered">
        {loading ? (
          <p>Loading shift…</p>
        ) : !form ? (
          <div className="alert alert-error">{error || "Shift not found."}</div>
        ) : (
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}

            <fieldset className="form-section">
              <legend>Shift details</legend>

              <p className="text-muted">
                Doctor: <strong>{form.doctorName}</strong>
              </p>

              <CustomSelect
                id="edit-work-shift-room"
                label="Clinic room"
                value={form.roomId}
                placeholder="No room assigned"
                onChange={(roomId) => setForm((current) => ({ ...current, roomId }))}
                options={roomOptions}
              />

              <CustomSelect
                id="edit-work-shift-day"
                label="Day of week"
                value={form.dayOfWeek}
                onChange={(dayOfWeek) => setForm((current) => ({ ...current, dayOfWeek }))}
                options={DAY_OPTIONS}
              />

              <div className="form-row">
                <TimePicker
                  id="edit-work-shift-start"
                  label="Start time"
                  name="startTime"
                  value={form.startTime}
                  onChange={onChange}
                  max={form.endTime}
                  required
                />
                <TimePicker
                  id="edit-work-shift-end"
                  label="End time"
                  name="endTime"
                  value={form.endTime}
                  onChange={onChange}
                  min={form.startTime}
                  required
                />
              </div>

              <label>
                Max patients
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

              <label className="checkbox-label">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
                Active shift template
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={regenerateFutureSlots}
                  onChange={(event) => setRegenerateFutureSlots(event.target.checked)}
                />
                Regenerate future slots (delta sync, preserve booked appointments)
              </label>
            </fieldset>

            <ShiftPlanPreview preview={preview} title="Updated shift validation" />

            {deleteImpact && (
              <div className="alert alert-info">
                Delete impact: {deleteImpact.futureBooked} future booked,{" "}
                {deleteImpact.futureAvailable + deleteImpact.futureBlocked} open/blocked slots would be removed.
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link to="/admin/work-shifts" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onDelete}
                disabled={saving || deleting}
              >
                {deleting ? "Deleting…" : "Delete shift"}
              </button>
            </div>
          </form>
        )}
      </div>
      </AdminLayout>
    </PageLayout>
  );
}
