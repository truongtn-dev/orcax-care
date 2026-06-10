import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { getApiErrorMessage } from "../services/api.js";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function DoctorWorkShiftsPage() {
  const [result, setResult] = useState({ items: [], weeklyPattern: [], doctor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await DoctorApiClient.listWorkShifts();
        setResult(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const patternByDay = Object.fromEntries(
    (result.weeklyPattern || []).map((day) => [day.dayOfWeek, day])
  );

  return (
    <PageLayout>
      <div className="page-header">
        <h1>My work shifts</h1>
        <p>Read-only weekly schedule assigned by admin.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>Loading your schedule…</p>
      ) : result.items.length === 0 ? (
        <div className="empty-state card">
          <h3>No shifts assigned</h3>
          <p>Your weekly shifts will appear here once admin creates them.</p>
          <Link to="/doctor" className="btn btn-secondary">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="work-shift-week-grid">
          {DAY_ORDER.map((dayOfWeek) => {
            const day = patternByDay[dayOfWeek];
            return (
              <section key={dayOfWeek} className="work-shift-day card">
                <h3 className="work-shift-day-title">{day?.dayLabel || `Day ${dayOfWeek}`}</h3>
                {!day?.shifts?.length ? (
                  <p className="work-shift-day-empty">Off</p>
                ) : (
                  <ul className="work-shift-day-list">
                    {day.shifts.map((shift) => (
                      <li key={shift._id} className="work-shift-card">
                        <strong>{shift.startTime} – {shift.endTime}</strong>
                        {shift.roomName && <span>{shift.roomName}</span>}
                        <span>Max {shift.maxPatients} patients</span>
                        <span>{shift.slotDurationMin} min per slot</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
