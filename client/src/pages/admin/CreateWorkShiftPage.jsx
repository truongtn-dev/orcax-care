import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const DAY_OPTIONS = [
  { value: "0", label: "Chủ nhật" },
  { value: "1", label: "Thứ 2" },
  { value: "2", label: "Thứ 3" },
  { value: "3", label: "Thứ 4" },
  { value: "4", label: "Thứ 5" },
  { value: "5", label: "Thứ 6" },
  { value: "6", label: "Thứ 7" },
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
    { value: "", label: "Chọn bác sĩ" },
    ...doctors.map((item) => ({
      value: item._id,
      label: `${item.fullName} — ${item.specialtyName || "Chuyên khoa"}`,
    })),
  ];

  const roomOptions = [
    { value: "", label: "Không gán phòng" },
    ...rooms.map((item) => ({
      value: item._id,
      label: `${item.roomNumber || item.roomCode || ""} ${item.name}`.trim(),
    })),
  ];

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Tạo ca làm việc</h1>
        <p>Thiết lập mẫu ca theo ngày trong tuần cho bác sĩ. Dùng để sinh slot đặt lịch sau này.</p>
      </div>

      <div className="card form-card-centered">
        {loading ? (
          <p>Đang tải danh sách bác sĩ và phòng khám…</p>
        ) : (
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}
            {created && (
              <div className="alert alert-success">
                Đã tạo ca {created.dayLabel} ({created.startTime}–{created.endTime}) cho {created.doctorName}.
                Mỗi slot {created.slotDurationMin} phút, tối đa {created.maxPatients} bệnh nhân.
              </div>
            )}

            <fieldset className="form-section">
              <legend>Thông tin ca làm</legend>

              <CustomSelect
                id="work-shift-doctor"
                label="Bác sĩ"
                value={form.doctorId}
                placeholder="Chọn bác sĩ"
                onChange={(doctorId) => setForm((current) => ({ ...current, doctorId }))}
                options={doctorOptions}
                required
              />

              <CustomSelect
                id="work-shift-room"
                label="Phòng khám"
                value={form.roomId}
                placeholder="Không gán phòng"
                onChange={(roomId) => setForm((current) => ({ ...current, roomId }))}
                options={roomOptions}
              />

              <CustomSelect
                id="work-shift-day"
                label="Ngày trong tuần"
                value={form.dayOfWeek}
                onChange={(dayOfWeek) => setForm((current) => ({ ...current, dayOfWeek }))}
                options={DAY_OPTIONS}
              />

              <div className="form-row">
                <label>
                  Giờ bắt đầu
                  <input type="time" name="startTime" value={form.startTime} onChange={onChange} required />
                </label>
                <label>
                  Giờ kết thúc
                  <input type="time" name="endTime" value={form.endTime} onChange={onChange} required />
                </label>
              </div>

              <label>
                Số bệnh nhân tối đa
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
                {saving ? "Đang lưu…" : "Tạo ca làm việc"}
              </button>
              <Link to="/admin/doctors" className="btn btn-secondary">
                Quay lại danh sách bác sĩ
              </Link>
            </div>
          </form>
        )}
      </div>
    </PageLayout>
  );
}
