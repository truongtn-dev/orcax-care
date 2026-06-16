import Tesseract from "tesseract.js";

const IMAGE_DATA_URI_PATTERN = /^data:image\/(?:jpeg|jpg|png|webp|gif|bmp);base64,/i;

const PROVIDER_HINTS = [
  { pattern: /bao\s*vi[eê]t|baoviet/i, name: "Bảo Việt" },
  { pattern: /prudential/i, name: "Prudential" },
  { pattern: /manulife/i, name: "Manulife" },
  { pattern: /\bmic\b/i, name: "MIC" },
  { pattern: /\bpvi\b/i, name: "PVI" },
  { pattern: /generali/i, name: "Generali" },
  { pattern: /aia\b/i, name: "AIA" },
  { pattern: /liberty/i, name: "Liberty Insurance" },
  { pattern: /bhyt|b[aẢ]o\s*hi[eẺ]m\s*y\s*t[eẾ]/i, name: "BHYT" },
];

const POLICY_LABEL_PATTERN =
  /(?:s[oố]\s*th[eẻ]|m[aã]\s*s[oố]|policy(?:\s*no\.?|\s*number)?|card\s*no\.?|member\s*id|s[oố]\s*bhyt|insurance\s*id|id\s*th[eẻ])\s*[:\-#]?\s*([A-Z0-9][A-Z0-9\-\/\.]{4,28})/i;

const HOLDER_LABEL_PATTERN =
  /(?:h[oọ]\s*(?:v[aà]\s*)?t[eê]n|policy\s*holder|card\s*holder|t[eê]n\s*ch[uủ]\s*th[eẻ]|insured\s*name)\s*[:\-]?\s*([A-ZÀ-Ỹ][A-ZÀ-Ỹa-zà-ỹ\s'.-]{2,60})/i;

const DATE_PATTERN = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g;

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function toIsoDate(day, month, year) {
  const y = year.length === 2 ? `20${year}` : year;
  const d = String(day).padStart(2, "0");
  const m = String(month).padStart(2, "0");
  const iso = `${y}-${m}-${d}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return iso;
}

function extractDates(text) {
  const matches = [];
  for (const match of text.matchAll(DATE_PATTERN)) {
    const iso = toIsoDate(match[1], match[2], match[3]);
    if (iso) matches.push(iso);
  }
  return [...new Set(matches)];
}

function extractProviderName(text) {
  for (const hint of PROVIDER_HINTS) {
    if (hint.pattern.test(text)) return hint.name;
  }
  return "";
}

function extractPolicyNumber(text) {
  const labeled = text.match(POLICY_LABEL_PATTERN);
  if (labeled?.[1]) {
    return labeled[1].replace(/\s+/g, "").toUpperCase();
  }

  const candidates = text.match(/\b[A-Z0-9][A-Z0-9\-\/\.]{5,24}\b/g) || [];
  const filtered = candidates
    .map((value) => value.replace(/\s+/g, "").toUpperCase())
    .filter((value) => !/^\d{1,2}[\/\-.]\d{1,2}/.test(value))
    .filter((value) => !/^20\d{2}$/.test(value));

  return filtered.sort((a, b) => b.length - a.length)[0] || "";
}

function cleanHolderName(value) {
  return String(value || "")
    .replace(/\s*(?:hieu\s*luc|hi[eê]u\s*l[uự]c|valid|policy|s[oố]\s*th[eẻ]|card|ngay|date|\d{1,2}[\/\-.]).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHolderName(text) {
  const labeled = text.match(HOLDER_LABEL_PATTERN);
  if (labeled?.[1]) {
    return cleanHolderName(labeled[1]);
  }
  return "";
}

export function parseInsuranceCardText(rawText) {
  const text = normalizeOcrText(rawText);
  const dates = extractDates(text);

  return {
    policyNumber: extractPolicyNumber(text),
    holderName: extractHolderName(text),
    providerName: extractProviderName(text),
    validFrom: dates[0] || "",
    validTo: dates[1] || dates[0] || "",
    rawText: text,
  };
}

function decodeImageDataUri(image) {
  if (!image || typeof image !== "string") {
    return { error: "Insurance card image is required" };
  }
  if (!IMAGE_DATA_URI_PATTERN.test(image)) {
    return { error: "Only JPEG, PNG, WebP, or GIF images are allowed" };
  }

  const base64Part = image.split(",")[1] || "";
  const bytes = Math.ceil((base64Part.length * 3) / 4);
  if (bytes > 5 * 1024 * 1024) {
    return { error: "Image must be 5 MB or smaller" };
  }

  try {
    return { buffer: Buffer.from(base64Part, "base64") };
  } catch {
    return { error: "Invalid image data" };
  }
}

function stubFromFileName(fileName) {
  const base = String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return {
    policyNumber: `OCR-${base || "INSURANCE-CARD"}`,
    holderName: "",
    providerName: "",
    validFrom: "",
    validTo: "",
    source: "stub",
    confidence: null,
    manualOverrideAllowed: true,
  };
}

export async function runInsuranceCardOcr(payload = {}) {
  const fileName = String(payload.fileName || "").trim();
  const image = payload.image;

  if (process.env.INSURANCE_OCR_STUB === "true") {
    if (!fileName && !image) {
      return { status: 400, body: { message: "Insurance card image is required" } };
    }
    return {
      status: 200,
      body: {
        ...stubFromFileName(fileName || "insurance-card.png"),
        manualOverrideAllowed: true,
      },
    };
  }

  if (!image) {
    return { status: 400, body: { message: "Insurance card image is required" } };
  }

  const decoded = decodeImageDataUri(image);
  if (decoded.error) {
    return { status: 400, body: { message: decoded.error } };
  }

  const languages = process.env.INSURANCE_OCR_LANG || "eng+vie";

  let recognition;
  try {
    recognition = await Tesseract.recognize(decoded.buffer, languages, {
      logger: () => {},
    });
  } catch (err) {
    console.error("Insurance OCR failed:", err);
    return {
      status: 422,
      body: {
        message: "Could not read the insurance card image. Enter the details manually.",
        manualOverrideAllowed: true,
      },
    };
  }

  const parsed = parseInsuranceCardText(recognition.data.text);
  const confidence = Math.round(recognition.data.confidence || 0);

  if (!parsed.policyNumber) {
    return {
      status: 422,
      body: {
        message: "OCR could not detect a policy number. Enter it manually.",
        rawText: parsed.rawText,
        holderName: parsed.holderName,
        providerName: parsed.providerName,
        validFrom: parsed.validFrom,
        validTo: parsed.validTo,
        confidence,
        source: "tesseract",
        manualOverrideAllowed: true,
      },
    };
  }

  return {
    status: 200,
    body: {
      policyNumber: parsed.policyNumber,
      holderName: parsed.holderName,
      providerName: parsed.providerName,
      validFrom: parsed.validFrom,
      validTo: parsed.validTo,
      confidence,
      source: "tesseract",
      manualOverrideAllowed: true,
    },
  };
}
