/** Fallback when API has not returned a fee yet (must match server default). */
export const DEFAULT_CONSULTATION_FEE_VND = 200000;

export function formatConsultationFee(value, formatter) {
  const fee = Number(value);
  if (!Number.isFinite(fee) || fee < 0) {
    return formatter ? formatter(DEFAULT_CONSULTATION_FEE_VND) : DEFAULT_CONSULTATION_FEE_VND;
  }
  return formatter ? formatter(fee) : fee;
}
