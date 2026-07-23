import mongoose from "mongoose";
import { Complaint } from "../models/Complaint.js";
import { ComplaintReply } from "../models/ComplaintReply.js";
import { Patient } from "../models/Patient.js";
import { notifyPatientSafe } from "./notification.service.js";
import { parseDateOnly } from "../utils/shiftTime.js";

const VALID_STATUSES = new Set(["open", "in_progress", "resolved", "closed"]);

function endExclusive(date) {
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return end;
}

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
  const assignee = row.assignedAdminUserId || {};
  return {
    _id: row._id.toString(),
    subject: row.subject,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    patientName: patient.fullName || "",
    patientEmail: patient.email || "",
    patientPhone: patient.phone || "",
    assigneeName: assignee.fullName || "",
    assigneeId: assignee._id ? assignee._id.toString() : null,
  };
}

export async function listComplaints({ status, q, from, to, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (status && VALID_STATUSES.has(status)) {
    filter.status = status;
  }

  const keyword = String(q || "").trim();
  if (keyword) {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ subject: regex }, { content: regex }];
  }

  if (from || to) {
    const createdAt = {};
    if (from) {
      const fromDate = parseDateOnly(from);
      if (!fromDate) {
        return { status: 400, body: { message: "from must use YYYY-MM-DD" } };
      }
      createdAt.$gte = fromDate;
    }
    if (to) {
      const toDate = parseDateOnly(to);
      if (!toDate) {
        return { status: 400, body: { message: "to must use YYYY-MM-DD" } };
      }
      createdAt.$lt = endExclusive(toDate);
    }
    if (createdAt.$gte && createdAt.$lt && createdAt.$gte >= createdAt.$lt) {
      return { status: 400, body: { message: "from must be on or before to" } };
    }
    filter.createdAt = createdAt;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [rows, total] = await Promise.all([
    Complaint.find(filter)
      .populate("patientUserId", "fullName email phone")
      .populate("assignedAdminUserId", "fullName")
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
    .populate("assignedAdminUserId", "fullName email")
    .lean();

  if (!complaint) {
    return { status: 404, body: { message: "Complaint not found." } };
  }

  const patientUser = complaint.patientUserId;
  const assignee = complaint.assignedAdminUserId;
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
        statusUpdatedAt: complaint.statusUpdatedAt || complaint.updatedAt,
        assigneeName: assignee?.fullName || "",
        assigneeId: assignee?._id ? assignee._id.toString() : null,
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

export async function updateComplaintStatus(id, status, adminUserId = null) {
  if (!VALID_STATUSES.has(status)) {
    return { status: 400, body: { message: "Invalid complaint status." } };
  }

  const complaint = await Complaint.findById(id);
  if (!complaint) {
    return { status: 404, body: { message: "Complaint not found." } };
  }

  complaint.status = status;
  complaint.statusUpdatedAt = new Date();
  if (adminUserId && !complaint.assignedAdminUserId) {
    complaint.assignedAdminUserId = adminUserId;
  }
  await complaint.save();

  notifyPatientSafe(complaint.patientUserId, {
    title: "Complaint status updated",
    message: `Your complaint "${complaint.subject}" is now ${String(status).replace(/_/g, " ")}.`,
    type: "complaint",
    link: `/patient/complaints/${complaint._id.toString()}`,
  });

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

  if (adminUserId && !complaint.assignedAdminUserId) {
    complaint.assignedAdminUserId = adminUserId;
  }

  await ComplaintReply.create({
    complaintId: complaint._id,
    repliedBy: adminUserId,
    content: text.slice(0, 5000),
  });

  if (complaint.status === "open") {
    complaint.status = "in_progress";
    complaint.statusUpdatedAt = new Date();
  }
  await complaint.save();

  notifyPatientSafe(complaint.patientUserId, {
    title: "New reply on your complaint",
    message: `Staff replied to "${complaint.subject}".`,
    type: "complaint",
    link: `/patient/complaints/${complaint._id.toString()}`,
  });

  return getComplaintDetail(id);
}
