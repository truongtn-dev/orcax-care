import { InsuranceCard } from "../models/InsuranceCard.js";
import { parseDateOnly, formatDateOnly } from "../utils/shiftTime.js";
import { isInsuranceCardEligibleOnDate } from "../utils/insuranceFee.js";
import { runInsuranceCardOcr } from "./insuranceCardOcr.service.js";

function serializeInsuranceCard(card, { visitDate = null } = {}) {
  const eligibleForDiscount = visitDate
    ? isInsuranceCardEligibleOnDate(card, visitDate)
    : isInsuranceCardEligibleOnDate(card, new Date());

  return {
    _id: card._id.toString(),
    providerName: card.providerName,
    policyNumber: card.policyNumber,
    holderName: card.holderName,
    coverageType: card.coverageType || "",
    coveragePercent: card.coveragePercent ?? 0,
    validFrom: card.validFrom ? formatDateOnly(card.validFrom) : null,
    validTo: card.validTo ? formatDateOnly(card.validTo) : null,
    isPrimary: Boolean(card.isPrimary),
    isActive: Boolean(card.isActive),
    eligibleForDiscount,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

function parseCoveragePercent(value) {
  if (value === undefined || value === null || value === "") return { value: 0 };
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    return { error: "coveragePercent must be between 0 and 100" };
  }
  return { value: Math.round(num) };
}

function validateCardDates(validFrom, validTo, payload) {
  const from =
    payload.validFrom !== undefined
      ? payload.validFrom
        ? parseDateOnly(payload.validFrom)
        : null
      : validFrom;
  const to =
    payload.validTo !== undefined ? (payload.validTo ? parseDateOnly(payload.validTo) : null) : validTo;
  if (payload.validFrom && !from) {
    return { status: 400, body: { message: "validFrom must use YYYY-MM-DD" } };
  }
  if (payload.validTo && !to) {
    return { status: 400, body: { message: "validTo must use YYYY-MM-DD" } };
  }
  if (from && to && to < from) {
    return { status: 400, body: { message: "validTo must be on or after validFrom" } };
  }
  return { from, to };
}

export async function listInsuranceCards(userId) {
  const cards = await InsuranceCard.find({ userId, isActive: true })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();

  return {
    status: 200,
    body: {
      items: cards.map((card) => serializeInsuranceCard(card)),
      total: cards.length,
    },
  };
}

export async function createInsuranceCard(userId, payload = {}) {
  const providerName = String(payload.providerName || "").trim();
  const policyNumber = String(payload.policyNumber || "").trim();
  const holderName = String(payload.holderName || "").trim();
  const coverageType = String(payload.coverageType || "").trim();

  if (!providerName) {
    return { status: 400, body: { message: "Insurance provider is required" } };
  }
  if (!policyNumber) {
    return { status: 400, body: { message: "Policy number is required" } };
  }
  if (!holderName) {
    return { status: 400, body: { message: "Policy holder name is required" } };
  }

  const dateCheck = validateCardDates(null, null, payload);
  if (dateCheck.status) return dateCheck;

  const coverageResult = parseCoveragePercent(payload.coveragePercent);
  if (coverageResult.error) {
    return { status: 400, body: { message: coverageResult.error } };
  }

  const duplicate = await InsuranceCard.findOne({ userId, policyNumber }).lean();
  if (duplicate) {
    return { status: 409, body: { message: "This policy number is already saved" } };
  }

  if (payload.isPrimary) {
    await InsuranceCard.updateMany({ userId, isPrimary: true }, { isPrimary: false });
  }

  const card = await InsuranceCard.create({
    userId,
    providerName,
    policyNumber,
    holderName,
    coverageType,
    coveragePercent: coverageResult.value,
    validFrom: dateCheck.from,
    validTo: dateCheck.to,
    isPrimary: payload.isPrimary === true,
    isActive: true,
  });

  return { status: 201, body: serializeInsuranceCard(card) };
}

export async function updateInsuranceCard(userId, cardId, payload = {}) {
  const card = await InsuranceCard.findOne({ _id: cardId, userId, isActive: true });
  if (!card) {
    return { status: 404, body: { message: "Insurance card not found" } };
  }

  const providerName =
    payload.providerName !== undefined ? String(payload.providerName || "").trim() : card.providerName;
  const policyNumber =
    payload.policyNumber !== undefined ? String(payload.policyNumber || "").trim() : card.policyNumber;
  const holderName =
    payload.holderName !== undefined ? String(payload.holderName || "").trim() : card.holderName;
  const coverageType =
    payload.coverageType !== undefined ? String(payload.coverageType || "").trim() : card.coverageType;

  if (!providerName) return { status: 400, body: { message: "Insurance provider is required" } };
  if (!policyNumber) return { status: 400, body: { message: "Policy number is required" } };
  if (!holderName) return { status: 400, body: { message: "Policy holder name is required" } };

  const dateCheck = validateCardDates(card.validFrom, card.validTo, payload);
  if (dateCheck.status) return dateCheck;

  if (payload.coveragePercent !== undefined) {
    const coverageResult = parseCoveragePercent(payload.coveragePercent);
    if (coverageResult.error) {
      return { status: 400, body: { message: coverageResult.error } };
    }
    card.coveragePercent = coverageResult.value;
  }

  if (policyNumber !== card.policyNumber) {
    const duplicate = await InsuranceCard.findOne({ userId, policyNumber, _id: { $ne: card._id } }).lean();
    if (duplicate) {
      return { status: 409, body: { message: "This policy number is already saved" } };
    }
  }

  if (payload.isPrimary === true) {
    await InsuranceCard.updateMany({ userId, isPrimary: true, _id: { $ne: card._id } }, { isPrimary: false });
    card.isPrimary = true;
  } else if (payload.isPrimary === false) {
    card.isPrimary = false;
  }

  card.providerName = providerName;
  card.policyNumber = policyNumber;
  card.holderName = holderName;
  card.coverageType = coverageType;
  if (payload.validFrom !== undefined) card.validFrom = dateCheck.from;
  if (payload.validTo !== undefined) card.validTo = dateCheck.to;

  await card.save();
  return { status: 200, body: serializeInsuranceCard(card) };
}

export async function deleteInsuranceCard(userId, cardId) {
  const card = await InsuranceCard.findOne({ _id: cardId, userId, isActive: true });
  if (!card) {
    return { status: 404, body: { message: "Insurance card not found" } };
  }

  card.isActive = false;
  card.isPrimary = false;
  await card.save();

  return { status: 200, body: { message: "Insurance card deleted", _id: card._id.toString() } };
}

export async function extractInsuranceCardOcr(payload = {}) {
  return runInsuranceCardOcr(payload);
}
