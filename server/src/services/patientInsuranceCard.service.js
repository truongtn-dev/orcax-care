import { InsuranceCard } from "../models/InsuranceCard.js";
import { parseDateOnly, formatDateOnly } from "../utils/shiftTime.js";

function serializeInsuranceCard(card) {
  return {
    _id: card._id.toString(),
    providerName: card.providerName,
    policyNumber: card.policyNumber,
    holderName: card.holderName,
    coverageType: card.coverageType || "",
    validFrom: card.validFrom ? formatDateOnly(card.validFrom) : null,
    validTo: card.validTo ? formatDateOnly(card.validTo) : null,
    isPrimary: Boolean(card.isPrimary),
    isActive: Boolean(card.isActive),
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

export async function listInsuranceCards(userId) {
  const cards = await InsuranceCard.find({ userId, isActive: true })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();

  return {
    status: 200,
    body: {
      items: cards.map(serializeInsuranceCard),
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

  const validFrom = payload.validFrom ? parseDateOnly(payload.validFrom) : null;
  const validTo = payload.validTo ? parseDateOnly(payload.validTo) : null;
  if (payload.validFrom && !validFrom) {
    return { status: 400, body: { message: "validFrom must use YYYY-MM-DD" } };
  }
  if (payload.validTo && !validTo) {
    return { status: 400, body: { message: "validTo must use YYYY-MM-DD" } };
  }
  if (validFrom && validTo && validTo < validFrom) {
    return { status: 400, body: { message: "validTo must be on or after validFrom" } };
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
    validFrom,
    validTo,
    isPrimary: payload.isPrimary === true,
    isActive: true,
  });

  return { status: 201, body: serializeInsuranceCard(card) };
}

export async function extractInsuranceCardOcr(payload = {}) {
  const fileName = String(payload.fileName || "").trim();
  if (!fileName) {
    return { status: 400, body: { message: "Insurance card image file name is required" } };
  }

  const base = fileName
    .replace(/\.[^.]+$/, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return {
    status: 200,
    body: {
      policyNumber: `OCR-${base || "INSURANCE-CARD"}`,
      source: "stub",
      manualOverrideAllowed: true,
    },
  };
}
