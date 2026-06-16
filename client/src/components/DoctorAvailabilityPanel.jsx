import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./DoctorAvailabilityPanel.css";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { formatWalletCurrency } from "../utils/walletUtils.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

function formatDayLabel(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${DAY_LABELS[date.getDay()]}, ${MONTH_LABELS[month - 1]} ${day}`;
}

export default function DoctorAvailabilityPanel({
  doctorId,
  consultationFee,
  selectedSlotId = "",
  initialSlotId = "",
  onSelectSlot,
  bookBasePath = "/patient/book",
  showBookLink = true,
  isAuthenticated = true,
  loginPath = "/login",
  variant = "default",
  embedded = false,
}) {
  const [availability, setAvailability] = useState(null);
  const [activeDate, setActiveDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isProfile = variant === "profile";
  const isBooking = variant === "booking";
  const isReschedule = variant === "reschedule" || embedded;
  const showSectionLabels = isProfile || isBooking || isReschedule;

  const loadAvailability = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    setError("");
    try {
      const startDate = formatDateOnly(new Date());
      const endDate = formatDateOnly(addDays(new Date(), 13));
      const { data } = await PublicApiClient.getDoctorAvailability(doctorId, {
        startDate,
        endDate,
      });
      setAvailability(data);
      const firstDayWithSlots = data.days.find((day) => day.slots.length > 0);
      setActiveDate((current) => {
        if (current && data.days.some((day) => day.date === current && day.slots.length > 0)) {
          return current;
        }
        return firstDayWithSlots?.date || data.days[0]?.date || "";
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setAvailability(null);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    if (!initialSlotId || !onSelectSlot || !availability) return;
    for (const day of availability.days) {
      const slot = day.slots.find((item) => item._id === initialSlotId);
      if (slot) {
        setActiveDate(day.date);
        onSelectSlot(slot);
        break;
      }
    }
  }, [availability, initialSlotId, onSelectSlot]);

  const activeDay = useMemo(
    () => availability?.days?.find((day) => day.date === activeDate) || null,
    [availability, activeDate]
  );

  const fee = consultationFee ?? availability?.consultationFee ?? 0;
  const bookUrl = isAuthenticated
    ? `${bookBasePath}?doctorId=${doctorId}`
    : `${loginPath}?next=${encodeURIComponent(`${bookBasePath}?doctorId=${doctorId}`)}`;

  const buildBookUrl = (slot) => {
    const target = `${bookBasePath}?doctorId=${doctorId}&slotId=${slot._id}&date=${slot.date}`;
    if (isAuthenticated) return target;
    return `${loginPath}?next=${encodeURIComponent(target)}`;
  };

  if (loading) {
    return (
      <div className={`doctor-availability doctor-availability--loading${isProfile ? " doctor-availability--profile" : ""}`}>
        <div className="loading-spinner" />
        <p>Loading slots…</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!availability || availability.summary.available === 0) {
    return (
      <div className={`doctor-availability doctor-availability--empty${isProfile ? " doctor-availability--profile" : ""}`}>
        <p>No open slots in the next 14 days. Check back after admin generates appointment slots.</p>
      </div>
    );
  }

  return (
    <div
      className={`doctor-availability${isProfile ? " doctor-availability--profile" : ""}${isBooking ? " doctor-availability--booking" : ""}${isReschedule ? " doctor-availability--embedded" : ""}`}
    >
      {!isReschedule && (
      <div className="doctor-availability-toolbar">
        <div className="doctor-availability-meta">
          <span className="doctor-availability-badge">
            {availability.summary.available} open slots
          </span>
          <span className="doctor-availability-fee">{formatWalletCurrency(fee)}</span>
        </div>
        {showBookLink && (
          <Link to={bookUrl} className="btn btn-primary btn-sm">
            Book now
          </Link>
        )}
      </div>
      )}

      {showSectionLabels && <p className="doctor-availability-section-label">Select a date</p>}

      <div className="doctor-availability-days" role="tablist" aria-label="Days with open slots">
        {availability.days.map((day) => {
          const count = day.slots.length;
          if (!count) return null;
          const isActive = day.date === activeDate;
          return (
            <button
              key={day.date}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`doctor-availability-day${isActive ? " is-active" : ""}`}
              onClick={() => setActiveDate(day.date)}
            >
              <span>{formatDayLabel(day.date)}</span>
              <em>{count}</em>
            </button>
          );
        })}
      </div>

      {showSectionLabels && <p className="doctor-availability-section-label">Available times</p>}

      <ul className="doctor-availability-slots">
        {(activeDay?.slots || []).map((slot) => {
          const selected = selectedSlotId === slot._id;
          const roomLabel = slot.roomLabel || slot.roomName || "";
          const inner = (
            <>
              <strong>{slot.startTime} – {slot.endTime}</strong>
              {roomLabel ? <span className="doctor-availability-room">{roomLabel}</span> : null}
            </>
          );

          if (onSelectSlot) {
            return (
              <li key={slot._id}>
                <button
                  type="button"
                  className={`doctor-availability-slot${selected ? " is-selected" : ""}`}
                  onClick={() => onSelectSlot(slot)}
                >
                  {inner}
                </button>
              </li>
            );
          }

          return (
            <li key={slot._id}>
              <Link to={buildBookUrl(slot)} className="doctor-availability-slot">
                {inner}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
