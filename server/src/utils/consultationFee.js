import { DEFAULT_CONSULTATION_FEE_VND } from "../config/booking.js";

export const MIN_CONSULTATION_FEE_VND = 0;
export const MAX_CONSULTATION_FEE_VND = 50_000_000;

export function resolveConsultationFee(doctor) {
  const fee = Number(doctor?.consultationFee);
  if (Number.isFinite(fee) && fee >= MIN_CONSULTATION_FEE_VND) {
    return Math.round(Math.min(fee, MAX_CONSULTATION_FEE_VND));
  }
  return DEFAULT_CONSULTATION_FEE_VND;
}

export function parseConsultationFeeInput(value) {
  if (value === null || value === undefined || value === "") {
    return { value: DEFAULT_CONSULTATION_FEE_VND };
  }

  const normalized = String(value).replace(/[^\d]/g, "");
  const fee = Number(normalized);
  if (!Number.isFinite(fee) || fee < MIN_CONSULTATION_FEE_VND) {
    return { error: "Consultation fee must be a non-negative whole number (VND)" };
  }
  if (fee > MAX_CONSULTATION_FEE_VND) {
    return {
      error: `Consultation fee cannot exceed ${MAX_CONSULTATION_FEE_VND.toLocaleString("en-US")} VND`,
    };
  }

  return { value: Math.round(fee) };
}
