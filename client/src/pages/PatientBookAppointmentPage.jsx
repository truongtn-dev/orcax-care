import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import DoctorAvailabilityPanel from "../components/DoctorAvailabilityPanel.jsx";
import DoctorSearchCard from "../components/DoctorSearchCard.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { formatWalletCurrency } from "../utils/walletUtils.js";
import "../styles/patient.shared.css";
import "./PatientBookAppointmentPage.css";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BOOKING_STEPS = [
  { id: 1, label: "Specialty" },
  { id: 2, label: "Doctor" },
  { id: 3, label: "Time slot" },
  { id: 4, label: "Confirm" },
];

function getInitials(name) {
  if (!name) return "D";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function isCardEligibleForVisit(card, visitDate) {
  if (!card?.isActive || !(Number(card.coveragePercent) > 0)) return false;
  if (!visitDate) return false;
  if (card.validFrom && visitDate < card.validFrom) return false;
  if (card.validTo && visitDate > card.validTo) return false;
  return true;
}

function BookingSteps({ activeStep }) {
  return (
    <div className="patient-book-steps patient-book-steps--four" aria-label="Booking progress">
      {BOOKING_STEPS.map((step, index) => (
        <div key={step.id} className="patient-book-step-group">
          <div
            className={`patient-book-step${activeStep >= step.id ? " is-active" : ""}${activeStep > step.id ? " is-done" : ""}`}
          >
            <span className="patient-book-step-num">{step.id}</span>
            <span className="patient-book-step-label">{step.label}</span>
          </div>
          {index < BOOKING_STEPS.length - 1 && <span className="patient-book-step-line" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

function formatSlotLabel(slot) {
  if (!slot?.date || !slot?.startTime) return null;
  const [year, month, day] = slot.date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = DAY_LABELS[date.getDay()];
  const monthName = MONTH_LABELS[month - 1];
  return {
    dateLine: `${dayName}, ${monthName} ${day}`,
    timeLine: `${slot.startTime} – ${slot.endTime}`,
    room: slot.roomLabel || slot.roomName || "",
  };
}

export default function PatientBookAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const specialtyId = searchParams.get("specialtyId") || "";
  const doctorId = searchParams.get("doctorId") || "";
  const initialSlotId = searchParams.get("slotId") || "";

  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [insuranceCards, setInsuranceCards] = useState([]);
  const [selectedInsuranceCardId, setSelectedInsuranceCardId] = useState("");
  const [feeSummary, setFeeSummary] = useState(null);
  const [feePreviewLoading, setFeePreviewLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const baseFee = feeSummary?.baseFee ?? doctor?.consultationFee ?? 200000;
  const finalFee = feeSummary?.finalFee ?? baseFee;
  const discountAmount = feeSummary?.discountAmount ?? 0;
  const balance = wallet?.balance ?? 0;
  const slotLabel = useMemo(() => formatSlotLabel(selectedSlot), [selectedSlot]);
  const eligibleCards = useMemo(
    () => insuranceCards.filter((card) => isCardEligibleForVisit(card, selectedSlot?.date)),
    [insuranceCards, selectedSlot?.date],
  );

  const activeStep = useMemo(() => {
    if (!doctorId) return specialtyId ? 2 : 1;
    return selectedSlot?._id ? 4 : 3;
  }, [doctorId, specialtyId, selectedSlot]);

  const selectedSpecialty = useMemo(
    () => specialties.find((item) => item._id === specialtyId) || null,
    [specialties, specialtyId]
  );

  const loadWallet = useCallback(async () => {
    try {
      const { data } = await PatientApiClient.getWallet();
      setWallet(data);
    } catch {
      setWallet(null);
    }
  }, []);

  const loadWizardStep = useCallback(async () => {
    if (doctorId) return;

    setWizardLoading(true);
    setError("");
    try {
      if (!specialtyId) {
        const { data } = await PublicApiClient.getSpecialties();
        setSpecialties(data.items || []);
        setDoctors([]);
      } else {
        const [specialtyRes, doctorRes] = await Promise.all([
          PublicApiClient.getSpecialties(),
          PublicApiClient.searchDoctors({ specialtyId, limit: 24 }),
        ]);
        setSpecialties(specialtyRes.data.items || []);
        setDoctors(doctorRes.data.items || []);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSpecialties([]);
      setDoctors([]);
    } finally {
      setWizardLoading(false);
      setLoading(false);
    }
  }, [doctorId, specialtyId]);

  const loadDoctorBooking = useCallback(async () => {
    if (!doctorId) return;

    setLoading(true);
    setError("");
    try {
      const [doctorRes, walletRes, insuranceRes] = await Promise.all([
        PublicApiClient.getDoctor(doctorId),
        PatientApiClient.getWallet(),
        PatientApiClient.listInsuranceCards(),
      ]);
      setDoctor(doctorRes.data);
      setWallet(walletRes.data);
      setInsuranceCards(insuranceRes.data.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  }, [doctorId, loadWallet]);

  useEffect(() => {
    if (doctorId) {
      loadDoctorBooking();
      return;
    }
    setDoctor(null);
    setSelectedSlot(null);
    loadWallet();
    loadWizardStep();
  }, [doctorId, specialtyId, loadDoctorBooking, loadWallet, loadWizardStep]);

  useEffect(() => {
    if (!selectedSlot?._id) {
      setFeeSummary(null);
      return;
    }

    let ignore = false;
    setFeePreviewLoading(true);
    PatientApiClient.previewAppointmentFee({
      slotId: selectedSlot._id,
      insuranceCardId: selectedInsuranceCardId || undefined,
    })
      .then(({ data }) => {
        if (!ignore) setFeeSummary(data);
      })
      .catch((err) => {
        if (!ignore) {
          setFeeSummary(null);
          setError(getApiErrorMessage(err));
        }
      })
      .finally(() => {
        if (!ignore) setFeePreviewLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedSlot?._id, selectedInsuranceCardId]);

  useEffect(() => {
    if (!selectedSlot?._id || selectedInsuranceCardId) return;
    const primaryEligible = eligibleCards.find((card) => card.isPrimary) || eligibleCards[0];
    if (primaryEligible) {
      setSelectedInsuranceCardId(primaryEligible._id);
    }
  }, [selectedSlot?._id, eligibleCards, selectedInsuranceCardId]);

  const canAfford = useMemo(() => balance >= finalFee, [balance, finalFee]);
  const balanceAfter = balance - finalFee;

  const onSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setSelectedInsuranceCardId("");
    setFeeSummary(null);
    setNotice("");
    setError("");
  };

  const onSelectSpecialty = (nextSpecialtyId) => {
    navigate(`/patient/book?specialtyId=${nextSpecialtyId}`);
  };

  const onSelectDoctor = (nextDoctorId) => {
    const query = specialtyId
      ? `specialtyId=${specialtyId}&doctorId=${nextDoctorId}`
      : `doctorId=${nextDoctorId}`;
    navigate(`/patient/book?${query}`);
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
        insuranceCardId: selectedInsuranceCardId || undefined,
      });
      setNotice("Appointment booked successfully.");
      navigate(`/patient/appointments?booked=${data.appointment._id}`, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const wizardBackTo =
    activeStep === 2 ? "/patient/book" : activeStep === 1 ? "/patient" : `/patient/book?specialtyId=${specialtyId}`;

  return (
    <PageLayout>
      <div className="patient-book-fullpage">
        <div className="patient-book-toolbar">
          <Link to={doctorId ? wizardBackTo : wizardBackTo} className="patient-book-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            {doctorId ? "Change doctor" : activeStep === 2 ? "Change specialty" : "Back to dashboard"}
          </Link>
          {wallet && (
            <Link to="/patient/wallet" className="patient-book-wallet-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
                <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
              </svg>
              {formatWalletCurrency(balance)}
            </Link>
          )}
        </div>

        {!doctorId && (
          <section className="patient-book-hero patient-book-hero--wizard">
            <span className="patient-book-hero-orb patient-book-hero-orb--1" aria-hidden="true" />
            <span className="patient-book-hero-orb patient-book-hero-orb--2" aria-hidden="true" />
            <div className="patient-book-hero-inner">
              <div className="patient-book-wizard-intro">
                <p className="patient-book-eyebrow">Book an appointment</p>
                <h1>{activeStep === 1 ? "Choose a specialty" : "Choose your doctor"}</h1>
                <p className="patient-book-wizard-lead">
                  {activeStep === 1
                    ? "Select the type of care you need to see available doctors."
                    : `Doctors in ${selectedSpecialty?.name || "this specialty"} with open slots.`}
                </p>
              </div>
              <BookingSteps activeStep={activeStep} />
            </div>
          </section>
        )}

        {loading || wizardLoading ? (
          <div className="patient-book-page-body">
            <div className="patient-panel patient-book-loading">
              <div className="patient-panel-body">
                <div className="loading-spinner" />
                <p>Loading booking details…</p>
              </div>
            </div>
          </div>
        ) : !doctorId ? (
          <div className="patient-book-page-body">
            {error && <div className="alert alert-error">{error}</div>}

            {activeStep === 1 && (
              <div className="patient-book-specialty-grid">
                {specialties.map((specialty) => (
                  <button
                    key={specialty._id}
                    type="button"
                    className="patient-book-specialty-card"
                    onClick={() => onSelectSpecialty(specialty._id)}
                  >
                    <span className="patient-book-specialty-code">{specialty.code}</span>
                    <strong>{specialty.name}</strong>
                    <span>{specialty.description || "View doctors in this specialty"}</span>
                  </button>
                ))}
                {specialties.length === 0 && (
                  <div className="patient-panel">
                    <div className="patient-panel-body">
                      <p>No specialties are available right now.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeStep === 2 && (
              <>
                {doctors.length === 0 ? (
                  <div className="patient-panel">
                    <div className="patient-panel-body">
                      <h2>No doctors available</h2>
                      <p>Try another specialty or check again later.</p>
                      <Link to="/patient/book" className="btn btn-primary">
                        Choose another specialty
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="doctor-grid-premium">
                    {doctors.map((item) => (
                      <div key={item._id} className="patient-book-doctor-pick">
                        <DoctorSearchCard doctor={item} />
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => onSelectDoctor(item._id)}>
                          Select doctor
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : !doctor ? (
          <div className="patient-book-page-body">
            <div className="patient-panel">
              <div className="patient-panel-body">
                <h2>{error || "Doctor not found"}</h2>
                <Link to={specialtyId ? `/patient/book?specialtyId=${specialtyId}` : "/patient/book"} className="btn btn-primary">
                  Choose another doctor
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <section className="patient-book-hero">
              <span className="patient-book-hero-orb patient-book-hero-orb--1" aria-hidden="true" />
              <span className="patient-book-hero-orb patient-book-hero-orb--2" aria-hidden="true" />

              <div className="patient-book-hero-inner">
                <div className="patient-book-doctor-card">
                  <div className="patient-book-avatar">
                    {doctor.photoUrl ? (
                      <img src={doctor.photoUrl} alt="" />
                    ) : (
                      <span aria-hidden="true">{getInitials(doctor.fullName)}</span>
                    )}
                  </div>
                  <div className="patient-book-doctor-info">
                    <p className="patient-book-eyebrow">Book an appointment</p>
                    <h1>{doctor.fullName}</h1>
                    <p className="patient-book-specialty">{doctor.specialty?.name || "Specialty"}</p>
                    <div className="patient-book-doctor-meta">
                      {doctor.department?.name && (
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                            <path d="M9 9V5a3 3 0 0 1 6 0v4" />
                          </svg>
                          {doctor.department.name}
                        </span>
                      )}
                      <span className="patient-book-fee-tag">{formatWalletCurrency(baseFee)}</span>
                    </div>
                  </div>
                </div>

                <BookingSteps activeStep={activeStep} />
              </div>
            </section>

            <div className="patient-book-page-body">
              <div className="patient-book-layout">
                <section className="patient-panel patient-book-slots-panel">
                  <div className="patient-panel-head">
                    <div className="patient-panel-head-main">
                      <div className="patient-panel-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M8 2v4" />
                          <path d="M16 2v4" />
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M3 10h18" />
                        </svg>
                      </div>
                      <div>
                        <h2>Select a time slot</h2>
                        <p className="patient-panel-lead">Pick a date and time that works for you.</p>
                      </div>
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

                <aside className="patient-book-summary-wrap">
                  <div className="patient-panel patient-book-summary">
                    <div className="patient-panel-head">
                      <div className="patient-panel-head-main">
                        <div className="patient-panel-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                            <path d="M14 2v6h6" />
                            <path d="M16 13H8" />
                            <path d="M16 17H8" />
                            <path d="M10 9H8" />
                          </svg>
                        </div>
                        <div>
                          <h2>Booking summary</h2>
                          <p className="patient-panel-lead">Review and confirm payment from your wallet.</p>
                        </div>
                      </div>
                    </div>

                    <div className="patient-panel-body">
                      {error && <div className="alert alert-error">{error}</div>}
                      {notice && <div className="alert alert-success">{notice}</div>}

                      <div className={`patient-book-slot-preview${slotLabel ? " has-slot" : ""}`}>
                        {slotLabel ? (
                          <>
                            <div className="patient-book-slot-preview-date">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                <path d="M8 2v4" />
                                <path d="M16 2v4" />
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M3 10h18" />
                              </svg>
                              <div>
                                <strong>{slotLabel.dateLine}</strong>
                                <span>{slotLabel.timeLine}</span>
                              </div>
                            </div>
                            {slotLabel.room && <span className="patient-book-room-badge">{slotLabel.room}</span>}
                          </>
                        ) : (
                          <p className="patient-book-slot-empty">
                            Select a time slot on the left to continue.
                          </p>
                        )}
                      </div>

                      <p className="patient-section-label">Insurance (bảo lãnh)</p>
                      <label className="patient-book-insurance-field">
                        <span className="visually-hidden">Insurance card</span>
                        <select
                          value={selectedInsuranceCardId}
                          onChange={(event) => {
                            setSelectedInsuranceCardId(event.target.value);
                            setError("");
                          }}
                          disabled={!selectedSlot?._id || feePreviewLoading}
                        >
                          <option value="">No insurance — pay full fee</option>
                          {eligibleCards.map((card) => (
                            <option key={card._id} value={card._id}>
                              {card.providerName} · {card.coveragePercent}% coverage
                              {card.isPrimary ? " (Primary)" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedSlot?._id && eligibleCards.length === 0 && (
                        <p className="patient-book-insurance-hint">
                          No eligible insurance card for this visit date.{" "}
                          <Link to="/patient/insurance-cards">Manage cards</Link>
                        </p>
                      )}

                      <p className="patient-section-label">Payment breakdown</p>
                      <dl className="patient-book-payment-list">
                        <div className="patient-book-payment-row">
                          <dt>Consultation fee</dt>
                          <dd>{formatWalletCurrency(baseFee)}</dd>
                        </div>
                        {discountAmount > 0 && (
                          <div className="patient-book-payment-row patient-book-payment-row--discount">
                            <dt>Insurance coverage ({feeSummary?.coveragePercent || 0}%)</dt>
                            <dd>-{formatWalletCurrency(discountAmount)}</dd>
                          </div>
                        )}
                        <div className="patient-book-payment-row patient-book-payment-row--total">
                          <dt>Amount due</dt>
                          <dd>{feePreviewLoading ? "…" : formatWalletCurrency(finalFee)}</dd>
                        </div>
                        <div className="patient-book-payment-row">
                          <dt>Wallet balance</dt>
                          <dd className={canAfford ? "is-ok" : "is-low"}>{formatWalletCurrency(balance)}</dd>
                        </div>
                        {selectedSlot?._id && (
                          <div className="patient-book-payment-row">
                            <dt>Balance after booking</dt>
                            <dd className={canAfford ? "is-ok" : "is-low"}>
                              {canAfford ? formatWalletCurrency(balanceAfter) : "Insufficient"}
                            </dd>
                          </div>
                        )}
                      </dl>

                      {!canAfford && selectedSlot?._id && (
                        <div className="patient-book-wallet-alert">
                          <div className="patient-book-wallet-alert-icon" aria-hidden="true">
                            !
                          </div>
                          <div>
                            <strong>Insufficient balance</strong>
                            <p>
                              You need {formatWalletCurrency(finalFee - balance)} more to complete this booking.{" "}
                              <Link to="/patient/wallet">Top up wallet</Link>
                            </p>
                          </div>
                        </div>
                      )}

                      <form onSubmit={onSubmit} className="patient-book-form">
                        <p className="patient-section-label">Reason for visit</p>
                        <label className="patient-book-reason-field">
                          <span className="visually-hidden">Reason for visit</span>
                          <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            rows={3}
                            placeholder="Brief symptoms or reason for visit (optional)"
                            maxLength={500}
                          />
                          <span className="patient-book-char-count">{reason.length}/500</span>
                        </label>

                        <div className="patient-book-actions">
                          <button
                            type="submit"
                            className="btn btn-primary patient-book-submit"
                            disabled={submitting || !selectedSlot?._id || !canAfford || feePreviewLoading}
                          >
                            {submitting ? "Booking…" : "Confirm booking"}
                          </button>
                          <Link to={wizardBackTo} className="btn btn-secondary">
                            Back
                          </Link>
                        </div>

                        <p className="patient-book-footnote">
                          Payment is deducted from your OrcaXCare wallet. Insurance coverage reduces the amount you pay (bảo lãnh viện phí).
                        </p>
                      </form>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
