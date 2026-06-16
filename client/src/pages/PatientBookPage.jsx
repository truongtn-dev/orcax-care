import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import ScrollReveal from "../components/ScrollReveal.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./PatientBookPage.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

export default function PatientBookPage() {
  const [searchParams] = useSearchParams();
  const doctorId = searchParams.get("doctorId");
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const bookingFee = 150000;

  useEffect(() => {
    if (!doctorId) {
      setError("Please select a doctor to book an appointment.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    Promise.all([
      PublicApiClient.getDoctor(doctorId),
      PatientApiClient.getDoctorSlots(doctorId),
      PatientApiClient.getWallet(),
    ])
      .then(([docRes, slotsRes, walletRes]) => {
        if (!active) return;
        setDoctor(docRes.data);
        setSlots(slotsRes.data.items || []);
        setWallet(walletRes.data);
      })
      .catch((err) => {
        if (!active) return;
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [doctorId]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError("");
    try {
      await PatientApiClient.bookAppointment({ slotId: selectedSlot._id });
      setSuccess(true);
      setTimeout(() => {
        navigate("/patient/appointments");
      }, 2000);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  const hasSufficientBalance = wallet && wallet.balance >= bookingFee;

  return (
    <PageLayout>
      <div className="patient-book-container">
        <ScrollReveal variant="up">
          <header className="patient-book-header">
            <Link to={doctorId ? `/doctor/${doctorId}` : "/search-doctors"} className="patient-book-back-link">
              ← Back to doctor profile
            </Link>
            <h1>Book an Appointment</h1>
            <p className="patient-book-lead">
              Confirm your appointment slot and pay securely using your wallet.
            </p>
          </header>
        </ScrollReveal>

        {loading ? (
          <div className="patient-book-loading">Loading booking details…</div>
        ) : error && !doctor ? (
          <div className="alert alert-error">{error}</div>
        ) : (
          <div className="patient-book-content">
            <div className="patient-book-main">
              <ScrollReveal variant="up" delay={20}>
                <section className="patient-book-section">
                  <h2>1. Select Date & Time</h2>
                  {slots.length === 0 ? (
                    <div className="patient-book-empty-slots">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <p>No available slots found for this doctor in the next 14 days.</p>
                      <Link to="/search-doctors" className="btn btn-outline btn-sm">
                        Find other doctors
                      </Link>
                    </div>
                  ) : (
                    <div className="patient-book-slots-grid">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?._id === slot._id;
                        return (
                          <button
                            key={slot._id}
                            type="button"
                            className={`patient-book-slot-card ${isSelected ? "is-selected" : ""}`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <span className="patient-book-slot-date">{formatDate(slot.date)}</span>
                            <span className="patient-book-slot-time">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            {slot.roomName && (
                              <span className="patient-book-slot-room">Room: {slot.roomName}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              </ScrollReveal>
            </div>

            <div className="patient-book-sidebar">
              <ScrollReveal variant="up" delay={40}>
                <aside className="patient-book-summary-card">
                  <h3>Booking Summary</h3>
                  
                  {doctor && (
                    <div className="patient-book-doctor-info">
                      <div className="patient-book-doctor-avatar">
                        {doctor.photoUrl ? (
                          <img src={doctor.photoUrl} alt="" />
                        ) : (
                          <span className="patient-book-doctor-initials">
                            {doctor.fullName?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="patient-book-doctor-details">
                        <h4>{doctor.fullName}</h4>
                        <p>{doctor.specialty?.name || "General Practitioner"}</p>
                        <small>{doctor.department?.name || "OrcaXCare Clinic"}</small>
                      </div>
                    </div>
                  )}

                  <hr className="patient-book-divider" />

                  <div className="patient-book-payment-details">
                    <div className="patient-book-row">
                      <span>Consultation Fee</span>
                      <strong>{formatCurrency(bookingFee)}</strong>
                    </div>
                    {wallet && (
                      <div className="patient-book-row">
                        <span>Your Wallet Balance</span>
                        <strong className={hasSufficientBalance ? "text-success" : "text-danger"}>
                          {formatCurrency(wallet.balance)}
                        </strong>
                      </div>
                    )}
                  </div>

                  {wallet && !hasSufficientBalance && (
                    <div className="patient-book-insufficient-alert">
                      <p>You do not have enough wallet balance to book this appointment.</p>
                      <Link to="/patient/wallet" className="btn btn-emerald btn-sm btn-block">
                        Top up wallet
                      </Link>
                    </div>
                  )}

                  {selectedSlot && (
                    <div className="patient-book-selected-summary">
                      <p>
                        Selected slot: <strong>{formatDate(selectedSlot.date)}</strong> at{" "}
                        <strong>{selectedSlot.startTime}</strong>
                      </p>
                    </div>
                  )}

                  {error && <div className="alert alert-error patient-book-error">{error}</div>}

                  {success ? (
                    <div className="patient-book-success-overlay">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      <h4>Booking Confirmed!</h4>
                      <p>Redirecting to your appointments list...</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-block patient-book-confirm-btn"
                      disabled={!selectedSlot || !hasSufficientBalance || submitting}
                      onClick={handleBook}
                    >
                      {submitting ? "Processing Booking..." : "Confirm & Pay"}
                    </button>
                  )}
                </aside>
              </ScrollReveal>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
