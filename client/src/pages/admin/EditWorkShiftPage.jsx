import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "./schedulingFormPages.css";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState(null);
  const [regenerateFutureSlots, setRegenerateFutureSlots] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
      setPreviewLoading(true);
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
      } finally {
        setPreviewLoading(false);
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

  const openDeleteConfirm = () => setDeleteConfirmOpen(true);

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeleteConfirmOpen(false);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await AdminApiClient.deleteWorkShift(id);
      setDeleteConfirmOpen(false);
      navigate("/admin/work-shifts");
    } catch (err) {
      setError(getApiErrorMessage(err));
      setDeleteConfirmOpen(false);
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
        description="Update weekly template — tick regenerate if hours or capacity change."
      >
      <div className="card scheduling-form-card scheduling-form-card--wide">
        {loading ? (
          <p style={{ padding: "1.75rem 2rem" }}>Loading shift…</p>
        ) : !form ? (
          <div className="alert alert-error" style={{ margin: "1.75rem 2rem" }}>{error || "Shift not found."}</div>
        ) : (
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="scheduling-form-layout scheduling-form-layout--split">
              <div className="scheduling-form-main">
                <fieldset className="form-section">
                  <legend>Shift details</legend>

                  <div className="scheduling-form-grid">
                    <div className="scheduling-form-span-2 scheduling-doctor-chip">
                      <span>Doctor</span>
                      <strong>{form.doctorName}</strong>
                    </div>

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

                    <label className="scheduling-form-span-2">
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

                    <label className="checkbox-row scheduling-form-span-2">
                      <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
                      Active shift template
                    </label>

                    <div className="scheduling-form-span-2">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={regenerateFutureSlots}
                          onChange={(event) => setRegenerateFutureSlots(event.target.checked)}
                        />
                        Regenerate future slots (preserve booked)
                      </label>
                      {deleteImpact?.futureBooked > 0 && (
                        <p className="scheduling-form-hint scheduling-form-hint--warn">
                          {deleteImpact.futureBooked} future booking
                          {deleteImpact.futureBooked === 1 ? "" : "s"} — enable regenerate before changing hours or
                          capacity.
                        </p>
                      )}
                    </div>
                  </div>
                </fieldset>
              </div>

              <aside className="scheduling-form-aside">
                <ShiftPlanPreview
                  preview={preview}
                  loading={previewLoading}
                  title="Updated shift validation"
                  emptyMessage="Change shift details to refresh validation."
                />
              </aside>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link to="/admin/work-shifts" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="button"
                className="btn btn-danger"
                onClick={openDeleteConfirm}
                disabled={saving || deleting}
              >
                Delete shift
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete work shift?"
        description="Removes this weekly template and deletes open future slots. Booked appointments stay on the calendar."
        confirmText="Delete shift"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={closeDeleteConfirm}
      >
        {deleteImpact && (
          <>
            <ul className="confirm-dialog-stats">
              <li>
                <span>Open slots removed</span>
                <strong>{deleteImpact.slotsRemovedIfDeleted}</strong>
              </li>
              <li>
                <span>Booked kept</span>
                <strong>{deleteImpact.futureBooked}</strong>
              </li>
            </ul>
            <p className="confirm-dialog-note">This action cannot be undone. Past slots are not affected.</p>
            {deleteImpact.futureBooked > 0 && (
              <p className="confirm-dialog-warning">
                {deleteImpact.futureBooked} patient booking
                {deleteImpact.futureBooked === 1 ? "" : "s"} will remain — cancel or reschedule separately if needed.
              </p>
            )}
          </>
        )}
      </ConfirmDialog>
      </AdminLayout>
    </PageLayout>
  );
}
