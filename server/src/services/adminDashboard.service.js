import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { Doctor } from "../models/Doctor.js";
import { User } from "../models/User.js";
import { eachDateInclusive, formatDateOnly, parseDateOnly, startOfToday } from "../utils/shiftTime.js";

function endExclusive(date) {
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return end;
}

function defaultPeriod() {
  const to = startOfToday();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from, to };
}

function parsePeriod(query = {}) {
  const fallback = defaultPeriod();
  const from = query.from ? parseDateOnly(query.from) : fallback.from;
  const to = query.to ? parseDateOnly(query.to) : fallback.to;

  if (query.from && !from) {
    return { error: { status: 400, body: { message: "from must use YYYY-MM-DD" } } };
  }
  if (query.to && !to) {
    return { error: { status: 400, body: { message: "to must use YYYY-MM-DD" } } };
  }
  if (from > to) {
    return { error: { status: 400, body: { message: "from must be on or before to" } } };
  }

  let doctorId = null;
  if (query.doctorId) {
    if (!mongoose.Types.ObjectId.isValid(query.doctorId)) {
      return { error: { status: 400, body: { message: "Invalid doctorId" } } };
    }
    doctorId = new mongoose.Types.ObjectId(query.doctorId);
  }

  return { from, to, doctorId };
}

function netFeeExpression() {
  return { $subtract: ["$fee", { $ifNull: ["$discountAmount", 0] }] };
}

async function getAppointmentsToday(doctorId) {
  const start = startOfToday();
  const end = endExclusive(start);

  const pipeline = [
    {
      $lookup: {
        from: "appointmentslots",
        localField: "slotId",
        foreignField: "_id",
        as: "slot",
      },
    },
    { $unwind: "$slot" },
    {
      $match: {
        "slot.date": { $gte: start, $lt: end },
        ...(doctorId ? { doctorId } : {}),
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ];

  const rows = await Appointment.aggregate(pipeline);
  const byStatus = { confirmed: 0, completed: 0, cancelled: 0 };
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(byStatus, row._id)) {
      byStatus[row._id] = row.count;
    }
  }

  return {
    total: byStatus.confirmed + byStatus.completed,
    confirmed: byStatus.confirmed,
    completed: byStatus.completed,
    cancelled: byStatus.cancelled,
  };
}

async function getPeriodMetrics(from, to, doctorId) {
  const rangeEnd = endExclusive(to);
  const slotDateMatch = {
    "slot.date": { $gte: from, $lt: rangeEnd },
    status: { $in: ["confirmed", "completed"] },
    ...(doctorId ? { doctorId } : {}),
  };

  const slotLookupStages = [
    {
      $lookup: {
        from: "appointmentslots",
        localField: "slotId",
        foreignField: "_id",
        as: "slot",
      },
    },
    { $unwind: "$slot" },
    { $match: slotDateMatch },
  ];

  const [summaryRows, appointmentRows, newPatients, activeDoctors] = await Promise.all([
    Appointment.aggregate([
      ...slotLookupStages,
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: netFeeExpression() },
          appointmentCount: { $sum: 1 },
        },
      },
    ]),
    Appointment.aggregate([
      ...slotLookupStages,
      {
        $project: {
          revenue: netFeeExpression(),
          slotDate: "$slot.date",
        },
      },
    ]),
    User.countDocuments({
      role: "patient",
      isActive: true,
      createdAt: { $gte: from, $lt: rangeEnd },
    }),
    Doctor.countDocuments({ isActive: true }),
  ]);

  const summary = summaryRows[0] || { totalRevenue: 0, appointmentCount: 0 };
  const chartByDate = new Map();
  for (const row of appointmentRows) {
    const key = formatDateOnly(row.slotDate);
    const current = chartByDate.get(key) || { revenue: 0, appointments: 0 };
    current.revenue += row.revenue || 0;
    current.appointments += 1;
    chartByDate.set(key, current);
  }

  const revenueChart = eachDateInclusive(from, to).map((day) => {
    const key = formatDateOnly(day);
    const row = chartByDate.get(key);
    return {
      date: key,
      revenue: row?.revenue || 0,
      appointments: row?.appointments || 0,
    };
  });

  return {
    totalRevenue: summary.totalRevenue || 0,
    appointmentCount: summary.appointmentCount || 0,
    newPatients,
    activeDoctors,
    revenueChart,
  };
}

export async function getDashboardSummary(query = {}) {
  const period = parsePeriod(query);
  if (period.error) return period.error;

  const { from, to, doctorId } = period;
  const [appointmentsToday, periodMetrics] = await Promise.all([
    getAppointmentsToday(doctorId),
    getPeriodMetrics(from, to, doctorId),
  ]);

  return {
    status: 200,
    body: {
      date: formatDateOnly(startOfToday()),
      period: {
        from: formatDateOnly(from),
        to: formatDateOnly(to),
        doctorId: doctorId ? doctorId.toString() : null,
      },
      appointmentsToday,
      kpis: {
        totalRevenue: periodMetrics.totalRevenue,
        appointmentCount: periodMetrics.appointmentCount,
        newPatients: periodMetrics.newPatients,
        activeDoctors: periodMetrics.activeDoctors,
      },
      revenueChart: periodMetrics.revenueChart,
    },
  };
}
