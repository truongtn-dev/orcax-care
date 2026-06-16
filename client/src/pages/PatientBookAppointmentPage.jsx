import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorAvailabilityPanel from "../components/DoctorAvailabilityPanel.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { formatWalletCurrency } from "../utils/walletUtils.js";
import "../styles/patient.shared.css";
import "./PatientBookAppointmentPage.css";

export default function PatientBookAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get("doctorId") || "";
  const initialSlotId = searchParams.get("slotId") || "";

  const [doctor, setDoctor] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fee = doctor?.consultationFee || 200000;

  const loadPage = useCallback(async () => {
    if (!doctorId) {
      setLoading(false);
      setError("Select a doctor before booking.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [doctorRes, walletRes] = await Promise.all([
        PublicApiClient.getDoctor(doctorId),
        PatientApiClient.getWallet(),
      ]);
      setDoctor(doctorRes.data);
      setWallet(walletRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const canAfford = useMemo(() => (wallet?.balance ?? 0) >= fee, [wallet, fee]);

  const onSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setNotice("");
    setError("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!selectedSlot?._id) {
      setError("Select an appointment slot to continue.");
      return;
    }
    if (!canAfford) {
      setError("Insufficient wallet balance. Top up your wallet before booking.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const { data } = await PatientApiClient.createAppointment({
        slotId: selectedSlot._id,
        reason,
      });
      setNotice("Appointment booked successfully.");
      navigate(`/patient/appointments?booked=${data.appointment._id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout dashboard>
      <div className="patient-book-page">
        <div className="page-header">
          <h1>Book an appointment</h1>
          <p>Choose an available slot, then confirm payment from your wallet.</p>
        </div>

        {loading ? (
          <div className="patient-panel patient-book-loading">
            <div className="patient-panel-body">
              <div className="loading-spinner" />
              <p>Loading booking details…</p>
            </div>
          </div>
        ) : !doctorId || !doctor ? (
          <div className="patient-panel">
            <div className="patient-panel-head">
              <div className="patient-panel-head-main">
                <h2>{error || "Doctor not found"}</h2>
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
          <div className="patient-book-layout">
            <section className="patient-panel">
              <div className="patient-panel-head">
                <div className="patient-panel-head-main">
                  <h2>Select a time slot</h2>
                  <p className="patient-panel-lead">
                    {doctor.fullName} · {doctor.specialty?.name || "Specialty"}
                  </p>
                </div>
                <Link to={`/doctor/${doctorId}`} className="btn btn-secondary btn-sm">
                  View profile
                </Link>
              </div>

              <div className="patient-panel-body">
                <DoctorAvailabilityPanel
                  doctorId={doctorId}
                  consultationFee={doctor.consultationFee}
                  selectedSlotId={selectedSlot?._id || ""}
                  initialSlotId={initialSlotId}
                  onSelectSlot={onSelectSlot}
                  showBookLink={false}
                  variant="booking"
                />
              </div>
            </section>

            <aside className="patient-panel patient-book-summary">
              <div className="patient-panel-head">
                <div className="patient-panel-head-main">
                  <h2>Booking summary</h2>
                  <p className="patient-panel-lead">Review details before confirming payment.</p>
                </div>
              </div>

              <div className="patient-panel-body">
                {error && <div className="alert alert-error">{error}</div>}
                {notice && <div className="alert alert-success">{notice}</div>}

                <p className="patient-section-label">Summary</p>
                <dl className="patient-fact-list">
                  <div className="patient-fact-row">
                    <dt>Doctor</dt>
                    <dd>{doctor.fullName}</dd>
                  </div>
                  <div className="patient-fact-row">
                    <dt>Slot</dt>
                    <dd>
                      {selectedSlot?.date && selectedSlot?.startTime
                        ? `${selectedSlot.date} · ${selectedSlot.startTime}–${selectedSlot.endTime}`
                        : "Not selected"}
                    </dd>
                  </div>
                  <div className="patient-fact-row">
                    <dt>Consultation fee</dt>
                    <dd>{formatWalletCurrency(fee)}</dd>
                  </div>
                  <div className="patient-fact-row">
                    <dt>Wallet balance</dt>
                    <dd>{formatWalletCurrency(wallet?.balance || 0)}</dd>
                  </div>
                </dl>

                {!canAfford && (
                  <p className="patient-book-wallet-hint">
                    Your wallet balance is not enough for this booking.{" "}
                    <Link to="/patient/wallet">Top up wallet</Link>
                  </p>
                )}

                <form onSubmit={onSubmit} className="patient-book-form">
                  <p className="patient-section-label">Reason for visit</p>
                  <label className="patient-book-reason-field">
                    <span className="visually-hidden">Reason for visit</span>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={4}
                      placeholder="Brief symptoms or reason for visit (optional)"
                      maxLength={500}
                    />
                  </label>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting || !selectedSlot?._id || !canAfford}
                    >
                      {submitting ? "Booking…" : "Confirm booking"}
                    </button>
                    <Link to={`/doctor/${doctorId}`} className="btn btn-secondary">
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            </aside>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
