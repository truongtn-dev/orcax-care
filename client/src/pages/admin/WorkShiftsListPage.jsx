import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function WorkShiftsListPage() {
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [result, setResult] = useState({ items: [], weeklyPattern: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadShifts = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await AdminApiClient.listWorkShifts(params);
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setResult({ items: [], weeklyPattern: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const doctorRes = await AdminApiClient.getDoctors({ activeOnly: true, limit: 100 });
      setDoctors(doctorRes.data.items || []);
      await loadShifts({});
    }
    init();
  }, [loadShifts]);

  const doctorOptions = [
    { value: "", label: "All doctors" },
    ...doctors.map((item) => ({
      value: item._id,
      label: item.fullName,
    })),
  ];

  const patternByDay = Object.fromEntries(
    (result.weeklyPattern || []).map((day) => [day.dayOfWeek, day])
  );

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Work shifts</h1>
            <p>Weekly shift templates. Filter by doctor to review the recurring schedule.</p>
          </div>
          <Link to="/admin/work-shifts/new" className="btn btn-primary">
            Create shift
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <CustomSelect
          id="work-shift-list-doctor"
          label="Doctor"
          value={doctorId}
          placeholder="All doctors"
          onChange={(value) => {
            setDoctorId(value);
            loadShifts(value ? { doctorId: value } : {});
          }}
          options={doctorOptions}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>Loading shifts…</p>
      ) : result.total === 0 ? (
        <div className="empty-state card">
          <h3>No work shifts yet</h3>
          <p>Create a weekly shift template to start generating appointment slots.</p>
          <Link to="/admin/work-shifts/new" className="btn btn-primary">
            Create shift
          </Link>
        </div>
      ) : (
        <>
          <p className="text-muted" style={{ marginBottom: "1rem" }}>
            {result.total} shift template{result.total === 1 ? "" : "s"}
          </p>
          <div className="work-shift-week-grid">
            {DAY_ORDER.map((dayOfWeek) => {
              const day = patternByDay[dayOfWeek];
              return (
                <section key={dayOfWeek} className="work-shift-day card">
                  <h3 className="work-shift-day-title">{day?.dayLabel || `Day ${dayOfWeek}`}</h3>
                  {!day?.shifts?.length ? (
                    <p className="work-shift-day-empty">No shifts</p>
                  ) : (
                    <ul className="work-shift-day-list">
                      {day.shifts.map((shift) => (
                        <li key={shift._id} className="work-shift-card">
                          <strong>{shift.startTime} – {shift.endTime}</strong>
                          <span>{shift.doctorName}</span>
                          {shift.roomName && <span>{shift.roomName}</span>}
                          <span>Max {shift.maxPatients} · {shift.slotDurationMin} min/slot</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </PageLayout>
  );
}
