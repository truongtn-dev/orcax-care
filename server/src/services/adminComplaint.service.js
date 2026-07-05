import mongoose from "mongoose";
import { Complaint } from "../models/Complaint.js";
import { ComplaintReply } from "../models/ComplaintReply.js";
import { Patient } from "../models/Patient.js";

const VALID_STATUSES = new Set(["open", "in_progress", "resolved", "closed"]);

function serializeReply(row) {
  const user = row.repliedBy || {};
  return {
    _id: row._id.toString(),
    content: row.content,
    createdAt: row.createdAt,
    authorName: user.fullName || "Staff",
    authorRole: user.role || "",
  };
}

function serializeComplaintSummary(row) {
  const patient = row.patientUserId || {};
  return {
    _id: row._id.toString(),
    subject: row.subject,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    patientName: patient.fullName || "",
    patientEmail: patient.email || "",
    patientPhone: patient.phone || "",
  };
}

export async function listComplaints({ status, q, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status && VALID_STATUSES.has(status)) {
    filter.status = status;
  }

  const keyword = String(q || "").trim();
  if (keyword) {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ subject: regex }, { content: regex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [rows, total] = await Promise.all([
    Complaint.find(filter)
      .populate("patientUserId", "fullName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  return {
    status: 200,
    body: {
      items: rows.map(serializeComplaintSummary),
      page: pageNum,
      limit: limitNum,
      total,
    },
  };
}

export async function getComplaintDetail(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { message: "Invalid complaint id." } };
  }

  const complaint = await Complaint.findById(id)
    .populate("patientUserId", "fullName email phone")
    .lean();

  if (!complaint) {
    return { status: 404, body: { message: "Complaint not found." } };
  }

  const patientUser = complaint.patientUserId;
  const patientProfile = patientUser?._id
    ? await Patient.findOne({ userId: patientUser._id }).lean()
    : null;

  const replies = await ComplaintReply.find({ complaintId: complaint._id })
    .populate("repliedBy", "fullName role")
    .sort({ createdAt: 1 })
    .lean();

  return {
    status: 200,
    body: {
      complaint: {
        _id: complaint._id.toString(),
        subject: complaint.subject,
        content: complaint.content,
        status: complaint.status,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
        patient: patientUser
          ? {
              userId: patientUser._id.toString(),
              fullName: patientUser.fullName || "",
              email: patientUser.email || "",
              phone: patientUser.phone || "",
              address: patientProfile?.address || "",
            }
          : null,
      },
      replies: replies.map(serializeReply),
    },
  };
}

export async function updateComplaintStatus(id, status) {
  if (!VALID_STATUSES.has(status)) {
    return { status: 400, body: { message: "Invalid complaint status." } };
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    return { status: 404, body: { message: "Complaint not found." } };
  }

  complaint.status = status;
  await complaint.save();

  return getComplaintDetail(id);
}

export async function replyToComplaint(id, adminUserId, content) {
  const text = String(content || "").trim();
  if (!text) {
    return { status: 400, body: { message: "Reply content is required." } };
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    return { status: 404, body: { message: "Complaint not found." } };
  }

  await ComplaintReply.create({
    complaintId: complaint._id,
    repliedBy: adminUserId,
    content: text.slice(0, 5000),
  });

  if (complaint.status === "open") {
    complaint.status = "in_progress";
    await complaint.save();
  }

  return getComplaintDetail(id);
}
