import { Complaint } from "../models/Complaint.js";

const CATEGORY_LABELS = {
  service: "Service",
  billing: "Billing",
  doctor: "Doctor",
  pharmacy: "Pharmacy",
  technical: "Technical",
  other: "Other",
};
const CATEGORY_SET = new Set(Object.keys(CATEGORY_LABELS));
const TICKET_TYPES = new Set(["complaint", "feedback", "request"]);
const STATUS_FILTERS = new Set(["open", "in_progress", "resolved", "closed"]);

function normalizeText(value) {
  return String(value || "").trim();
}

function buildSubject(category, description) {
  const label = CATEGORY_LABELS[category] || "Other";
  const snippet = description.replace(/\s+/g, " ").slice(0, 120);
  return `[${label}] ${snippet}`.slice(0, 200);
}

async function generateTicketId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const ticketId = `CMP-${stamp}-${suffix}`;
    const exists = await Complaint.exists({ ticketId });
    if (!exists) return ticketId;
  }

  return `CMP-${stamp}-${Date.now().toString(36).toUpperCase()}`;
}

function serializeComplaint(complaint) {
  return {
    _id: complaint._id.toString(),
    ticketId: complaint.ticketId,
    category: complaint.category,
    ticketType: complaint.ticketType,
    subject: complaint.subject,
    description: complaint.content,
    content: complaint.content,
    attachmentUrl: complaint.attachmentUrl || "",
    status: complaint.status,
    statusUpdatedAt: complaint.statusUpdatedAt,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}

export async function createComplaint(patientUserId, payload = {}) {
  const category = normalizeText(payload.category);
  const ticketType = normalizeText(payload.ticketType);
  const description = normalizeText(payload.description || payload.content);
  const attachmentUrl = normalizeText(payload.attachmentUrl);

  if (!CATEGORY_SET.has(category)) {
    return { status: 400, body: { message: "Category is required" } };
  }

  if (!TICKET_TYPES.has(ticketType)) {
    return { status: 400, body: { message: "Ticket type is required" } };
  }

  if (description.length < 10) {
    return { status: 400, body: { message: "Description must be at least 10 characters" } };
  }

  if (attachmentUrl && !/^https?:\/\//i.test(attachmentUrl)) {
    return { status: 400, body: { message: "Attachment URL must start with http:// or https://" } };
  }

  const complaint = await Complaint.create({
    ticketId: await generateTicketId(),
    patientUserId,
    category,
    ticketType,
    subject: buildSubject(category, description),
    content: description,
    attachmentUrl,
    status: "open",
    statusUpdatedAt: new Date(),
  });

  return { status: 201, body: { item: serializeComplaint(complaint) } };
}

export async function listComplaints(patientUserId, query = {}) {
  const filter = { patientUserId };
  const status = normalizeText(query.status);

  if (status) {
    if (!STATUS_FILTERS.has(status)) {
      return { status: 400, body: { message: "Invalid status filter" } };
    }
    filter.status = status;
  }

  const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).lean();
  return {
    status: 200,
    body: {
      items: complaints.map(serializeComplaint),
      total: complaints.length,
      status: status || "all",
    },
  };
}
