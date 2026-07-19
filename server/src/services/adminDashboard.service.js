import mongoose from "mongoose";
import ExcelJS from "exceljs";
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

const GROUP_BY_OPTIONS = new Set(["day", "week", "month"]);
const PAYMENT_METHODS = new Set(["wallet", "payos", "insurance"]);

function paymentMethodMatch(paymentMethod) {
  if (!paymentMethod) return {};
  if (paymentMethod === "insurance") {
    return {
      $or: [{ paymentMethod: "insurance" }, { insuranceCardId: { $ne: null } }],
    };
  }
  if (paymentMethod === "payos") {
    return { paymentMethod: "payos" };
  }
  return {
    $and: [
      {
        $or: [
          { paymentMethod: "wallet" },
          { paymentMethod: { $exists: false } },
          { paymentMethod: null },
        ],
      },
      {
        $or: [{ insuranceCardId: null }, { insuranceCardId: { $exists: false } }],
      },
    ],
  };
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

  const groupBy = query.groupBy && GROUP_BY_OPTIONS.has(query.groupBy) ? query.groupBy : "day";
  if (query.groupBy && !GROUP_BY_OPTIONS.has(query.groupBy)) {
    return { error: { status: 400, body: { message: "groupBy must be day, week, or month" } } };
  }

  let paymentMethod = null;
  if (query.paymentMethod) {
    if (!PAYMENT_METHODS.has(query.paymentMethod)) {
      return {
        error: { status: 400, body: { message: "paymentMethod must be wallet, payos, or insurance" } },
      };
    }
    paymentMethod = query.paymentMethod;
  }

  return { from, to, doctorId, groupBy, paymentMethod };
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function mondayOfWeek(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const weekday = day.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  day.setDate(day.getDate() + diff);
  return day;
}

function groupRevenueChart(dailyPoints, groupBy) {
  if (groupBy === "week") {
    const buckets = new Map();
    for (const point of dailyPoints) {
      const key = formatDateOnly(mondayOfWeek(parseDateOnly(point.date) || new Date(point.date)));
      const bucket = buckets.get(key) || { date: key, revenue: 0, appointments: 0 };
      bucket.revenue += point.revenue;
      bucket.appointments += point.appointments;
      buckets.set(key, bucket);
    }
    return [...buckets.values()]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((bucket) => ({ ...bucket, label: `Wk of ${bucket.date.slice(5)}` }));
  }

  if (groupBy === "month") {
    const buckets = new Map();
    for (const point of dailyPoints) {
      const key = point.date.slice(0, 7);
      const bucket = buckets.get(key) || { date: key, revenue: 0, appointments: 0 };
      bucket.revenue += point.revenue;
      bucket.appointments += point.appointments;
      buckets.set(key, bucket);
    }
    return [...buckets.values()]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((bucket) => {
        const [year, month] = bucket.date.split("-");
        return { ...bucket, label: `${MONTH_LABELS[Number(month) - 1]} ${year}` };
      });
  }

  return dailyPoints.map((point) => ({ ...point, label: point.date.slice(5) }));
}

function netFeeExpression() {
  return { $subtract: ["$fee", { $ifNull: ["$discountAmount", 0] }] };
}

function buildSlotDateMatch(from, to, doctorId, paymentMethod) {
  return {
    "slot.date": { $gte: from, $lt: endExclusive(to) },
    status: { $in: ["confirmed", "completed"] },
    ...(doctorId ? { doctorId } : {}),
    ...paymentMethodMatch(paymentMethod),
  };
}

async function getAppointmentsToday(doctorId, paymentMethod) {
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
        ...paymentMethodMatch(paymentMethod),
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

async function getPeriodMetrics(from, to, doctorId, groupBy = "day", paymentMethod = null) {
  const rangeEnd = endExclusive(to);
  const slotDateMatch = buildSlotDateMatch(from, to, doctorId, paymentMethod);

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
    revenueChart: groupRevenueChart(revenueChart, groupBy),
  };
}

export async function getDashboardSummary(query = {}) {
  const period = parsePeriod(query);
  if (period.error) return period.error;

  const { from, to, doctorId, groupBy, paymentMethod } = period;
  const [appointmentsToday, periodMetrics] = await Promise.all([
    getAppointmentsToday(doctorId, paymentMethod),
    getPeriodMetrics(from, to, doctorId, groupBy, paymentMethod),
  ]);

  return {
    status: 200,
    body: {
      date: formatDateOnly(startOfToday()),
      period: {
        from: formatDateOnly(from),
        to: formatDateOnly(to),
        doctorId: doctorId ? doctorId.toString() : null,
        groupBy,
        paymentMethod,
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

const CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function exportRevenueReport(query = {}) {
  const summary = await getDashboardSummary(query);
  if (summary.status !== 200) return summary;

  const { period, kpis, revenueChart, appointmentsToday } = summary.body;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OrcaXCare";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 22 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRows([
    { metric: "From", value: period.from },
    { metric: "To", value: period.to },
    { metric: "Doctor filter", value: period.doctorId || "All doctors" },
    { metric: "Payment method", value: period.paymentMethod || "All methods" },
    { metric: "Group by", value: period.groupBy },
    { metric: "Total revenue (VND)", value: kpis.totalRevenue },
    { metric: "Appointments (period)", value: kpis.appointmentCount },
    { metric: "New patients", value: kpis.newPatients },
    { metric: "Active doctors", value: kpis.activeDoctors },
    { metric: "Appointments today", value: appointmentsToday.total },
  ]);

  const chartSheet = workbook.addWorksheet("Revenue series");
  chartSheet.columns = [
    { header: "Period", key: "label", width: 16 },
    { header: "Date key", key: "date", width: 14 },
    { header: "Revenue (VND)", key: "revenue", width: 16 },
    { header: "Appointments", key: "appointments", width: 14 },
  ];
  chartSheet.getRow(1).font = { bold: true };
  for (const point of revenueChart) {
    chartSheet.addRow({
      label: point.label || point.date,
      date: point.date,
      revenue: point.revenue || 0,
      appointments: point.appointments || 0,
    });
  }
  chartSheet.addRow({
    label: "TOTAL",
    date: "",
    revenue: kpis.totalRevenue,
    appointments: kpis.appointmentCount,
  });
  chartSheet.lastRow.font = { bold: true };

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const stamp = formatDateOnly(new Date());
  const methodPart = period.paymentMethod ? `-${period.paymentMethod}` : "";
  return {
    status: 200,
    contentType: CONTENT_TYPE,
    contentDisposition: `attachment; filename="revenue-report-${period.from}_${period.to}${methodPart}-${stamp}.xlsx"`,
    buffer,
  };
}
