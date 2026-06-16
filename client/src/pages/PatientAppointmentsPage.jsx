import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { formatWalletCurrency } from "../utils/walletUtils.js";
import "../styles/patient.shared.css";
import "./PatientAppointmentsPage.css";

export default function PatientAppointmentsPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bookedNotice = searchParams.get("booked");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.listAppointments();
      setItems(data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  return (
    <PageLayout dashboard>
      <div className="patient-appointments-page">
        <div className="page-header">
          <h1>My appointments</h1>
          <p>Upcoming and past bookings made through OrcaXCare.</p>
        </div>

        {bookedNotice && (
          <div className="alert alert-success">Your appointment has been confirmed.</div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="patient-appointments-toolbar">
          <Link to="/search-doctors" className="btn btn-primary btn-sm">
            Book another appointment
          </Link>
        </div>

        {loading ? (
          <div className="patient-panel patient-appointments-loading">
            <div className="patient-panel-body">
              <div className="loading-spinner" />
              <p>Loading appointments…</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="patient-panel">
            <div className="patient-panel-head">
              <div className="patient-panel-head-main">
                <h2>No appointments yet</h2>
                <p className="patient-panel-lead">
                  Find a doctor, pick an available slot, and book using your wallet balance.
                </p>
              </div>
            </div>
            <div className="patient-panel-body">
              <div className="form-actions">
                <Link to="/search-doctors" className="btn btn-primary">
                  Find a doctor
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="patient-appointments-list">
            {items.map((item) => (
              <article key={item._id} className="patient-panel patient-appointment-card">
                <div className="patient-panel-head">
                  <div className="patient-panel-head-main">
                    <p className="patient-appointment-status">{item.status}</p>
                    <h2>{item.doctor.fullName}</h2>
                    <p className="patient-panel-lead">{item.doctor.specialty}</p>
                  </div>
                  <strong className="patient-appointment-fee">{formatWalletCurrency(item.fee)}</strong>
                </div>

                <div className="patient-panel-body">
                  <p className="patient-section-label">Appointment details</p>
                  <dl className="patient-fact-list">
                    <div className="patient-fact-row">
                      <dt>Date</dt>
                      <dd>{item.slot?.date || "—"}</dd>
                    </div>
                    <div className="patient-fact-row">
                      <dt>Time</dt>
                      <dd>
                        {item.slot
                          ? `${item.slot.startTime} – ${item.slot.endTime}`
                          : "—"}
                      </dd>
                    </div>
                    <div className="patient-fact-row">
                      <dt>Room</dt>
                      <dd>{item.slot?.roomName || "Not assigned"}</dd>
                    </div>
                  </dl>

                  {item.reason && (
                    <>
                      <p className="patient-section-label">Reason for visit</p>
                      <p className="patient-appointment-reason">{item.reason}</p>
                    </>
                  )}

                  <div className="patient-appointment-actions">
                    <Link to={`/doctor/${item.doctor._id}`} className="btn btn-secondary btn-sm">
                      View doctor
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
