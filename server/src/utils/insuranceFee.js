import { parseDateOnly } from "./shiftTime.js";

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function isInsuranceCardEligibleOnDate(card, visitDate) {
  if (!card?.isActive) return false;

  const checkDate = startOfDay(visitDate || new Date());
  if (card.validFrom) {
    const from = startOfDay(card.validFrom);
    if (checkDate < from) return false;
  }
  if (card.validTo) {
    const to = startOfDay(card.validTo);
    if (checkDate > to) return false;
  }

  const coveragePercent = Number(card.coveragePercent) || 0;
  return coveragePercent > 0;
}

export function calculateInsuranceFee(baseFee, card, visitDate) {
  const normalizedBase = Math.max(0, Math.round(Number(baseFee) || 0));
  if (!normalizedBase) {
    return {
      baseFee: 0,
      coveragePercent: 0,
      discountAmount: 0,
      finalFee: 0,
      eligible: false,
    };
  }

  const eligible = card ? isInsuranceCardEligibleOnDate(card, visitDate) : false;
  if (!eligible) {
    return {
      baseFee: normalizedBase,
      coveragePercent: 0,
      discountAmount: 0,
      finalFee: normalizedBase,
      eligible: false,
    };
  }

  const coveragePercent = Math.min(100, Math.max(0, Math.round(Number(card.coveragePercent) || 0)));
  const discountAmount = Math.floor((normalizedBase * coveragePercent) / 100);
  const finalFee = Math.max(0, normalizedBase - discountAmount);

  return {
    baseFee: normalizedBase,
    coveragePercent,
    discountAmount,
    finalFee,
    eligible: true,
  };
}

export function describeInsuranceIneligibility(card, visitDate) {
  if (!card) return null;
  if (!card.isActive) return "Insurance card is inactive.";
  const checkDate = startOfDay(visitDate || new Date());
  if (card.validFrom && checkDate < startOfDay(card.validFrom)) {
    return "Insurance card is not yet valid on the appointment date.";
  }
  if (card.validTo && checkDate > startOfDay(card.validTo)) {
    return "Insurance card is expired on the appointment date.";
  }
  if ((Number(card.coveragePercent) || 0) <= 0) {
    return "Insurance card has no coverage percentage configured.";
  }
  return null;
}
