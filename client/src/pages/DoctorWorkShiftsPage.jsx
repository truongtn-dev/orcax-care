import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorLayout from "../components/DoctorLayout.jsx";
import WorkShiftWeekBoard from "../components/WorkShiftWeekBoard.jsx";
import { DoctorApiClient } from "../services/doctorApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useEffect, useState } from "react";

export default function DoctorWorkShiftsPage() {
  const [result, setResult] = useState({ items: [], weeklyPattern: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data } = await DoctorApiClient.listWorkShifts();
        setResult({
          items: data.items || [],
          weeklyPattern: data.weeklyPattern || [],
          total: data.items?.length || 0,
        });
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <PageLayout dashboard>
      <DoctorLayout title="My work shifts">
        {error && <div className="alert alert-error">{error}</div>}

        <WorkShiftWeekBoard
          weeklyPattern={result.weeklyPattern}
          total={result.total}
          loading={loading}
          emptyTitle="No shifts assigned"
          emptyDescription="Your weekly schedule will appear here once admin creates work shift templates."
          emptyAction={
            <Link to="/doctor/schedule" className="btn btn-secondary btn-sm">
              Go to calendar
            </Link>
          }
        />
      </DoctorLayout>
    </PageLayout>
  );
}
