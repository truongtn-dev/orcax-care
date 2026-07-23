import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { Complaint } from "../models/Complaint.js";
import { Medicine } from "../models/Medicine.js";
import { Prescription } from "../models/Prescription.js";
import { QueueSession } from "../models/QueueSession.js";
import { QueueTicket } from "../models/QueueTicket.js";
import { StockMovement } from "../models/StockMovement.js";
import { endOfToday, startOfToday } from "../utils/queueDate.js";

function serializeMedicine(medicine, extras = {}) {
  return {
    _id: medicine._id.toString(),
    name: medicine.name,
    code: medicine.code,
    unit: medicine.unit,
    price: medicine.price,
    stockQty: medicine.stockQty,
    minStockLevel: medicine.minStockLevel,
    isActive: medicine.isActive,
    isLowStock: medicine.stockQty <= medicine.minStockLevel,
    nearestExpiry: extras.nearestExpiry || null,
    updatedAt: medicine.updatedAt,
  };
}

function serializeMovement(row) {
  const medicine = row.medicineId || {};
  return {
    _id: row._id.toString(),
    type: row.type,
    quantity: row.quantity,
    batchNo: row.batchNo || "",
    expiryDate: row.expiryDate ? row.expiryDate.toISOString().slice(0, 10) : "",
    supplierRef: row.supplierRef || "",
    note: row.note || "",
    prescriptionId: row.prescriptionId ? row.prescriptionId.toString() : null,
    createdAt: row.createdAt,
    medicine: medicine._id
      ? { _id: medicine._id.toString(), name: medicine.name, code: medicine.code, unit: medicine.unit }
      : null,
  };
}

async function loadNearestExpiries(medicineIds) {
  if (!medicineIds.length) return new Map();

  const rows = await StockMovement.aggregate([
    {
      $match: {
        medicineId: { $in: medicineIds },
        type: "inbound",
        expiryDate: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$medicineId",
        nearestExpiry: { $min: "$expiryDate" },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [row._id.toString(), row.nearestExpiry ? row.nearestExpiry.toISOString().slice(0, 10) : null])
  );
}

function formatDateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function serializeBatch(batch) {
  return {
    batchNo: batch.batchNo,
    inboundQty: batch.inboundQty,
    outboundQty: batch.outboundQty,
    onHandQty: batch.inboundQty - batch.outboundQty,
    expiryDate: formatDateOnly(batch.expiryDate),
    supplierRefs: [...batch.supplierRefs],
    lastMovementAt: batch.lastMovementAt,
  };
}

export async function listMedicines({ q = "", lowStockOnly = false } = {}) {
  const filter = { isActive: true };
  const search = String(q || "").trim();
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: regex }, { code: regex }];
  }

  let items = await Medicine.find(filter).sort({ name: 1 }).lean();
  if (lowStockOnly === true || lowStockOnly === "true") {
    items = items
      .filter((item) => item.stockQty <= item.minStockLevel)
      .sort((a, b) => {
        const urgencyA = (a.minStockLevel || 0) - (a.stockQty || 0);
        const urgencyB = (b.minStockLevel || 0) - (b.stockQty || 0);
        if (urgencyB !== urgencyA) return urgencyB - urgencyA;
        return (a.stockQty || 0) - (b.stockQty || 0);
      });
  }

  const expiryMap = await loadNearestExpiries(items.map((item) => item._id));

  return {
    status: 200,
    body: {
      items: items.map((item) =>
        serializeMedicine(item, { nearestExpiry: expiryMap.get(item._id.toString()) || null })
      ),
      total: items.length,
      lowStockCount: items.filter((item) => item.stockQty <= item.minStockLevel).length,
    },
  };
}

export async function listStockMovements({ limit = 50 } = {}) {
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const rows = await StockMovement.find()
    .populate("medicineId", "name code unit")
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .lean();

  return {
    status: 200,
    body: { items: rows.map(serializeMovement) },
  };
}

export async function getMedicineDetail(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { status: 400, body: { message: "Invalid medicine" } };
  }

  const medicine = await Medicine.findById(id).lean();
  if (!medicine) {
    return { status: 404, body: { message: "Medicine not found" } };
  }

  const movementRows = await StockMovement.find({ medicineId: medicine._id })
    .populate("medicineId", "name code unit")
    .sort({ createdAt: -1 })
    .lean();

  const batchMap = new Map();
  for (const row of movementRows) {
    const batchNo = row.batchNo || "Unbatched";
    const current =
      batchMap.get(batchNo) ||
      {
        batchNo,
        inboundQty: 0,
        outboundQty: 0,
        expiryDate: null,
        supplierRefs: new Set(),
        lastMovementAt: row.createdAt,
      };

    if (row.type === "inbound") {
      current.inboundQty += row.quantity || 0;
    } else {
      current.outboundQty += row.quantity || 0;
    }
    if (row.expiryDate && (!current.expiryDate || row.expiryDate < current.expiryDate)) {
      current.expiryDate = row.expiryDate;
    }
    if (row.supplierRef) {
      current.supplierRefs.add(row.supplierRef);
    }
    if (!current.lastMovementAt || row.createdAt > current.lastMovementAt) {
      current.lastMovementAt = row.createdAt;
    }

    batchMap.set(batchNo, current);
  }

  return {
    status: 200,
    body: {
      medicine: serializeMedicine(medicine),
      batches: [...batchMap.values()]
        .map(serializeBatch)
        .sort((a, b) => new Date(b.lastMovementAt) - new Date(a.lastMovementAt)),
      movements: movementRows.slice(0, 100).map(serializeMovement),
    },
  };
}

export async function stockInbound(userId, payload = {}) {
  const medicineId = String(payload.medicineId || "").trim();
  const quantity = parseInt(payload.quantity, 10);
  const batchNo = String(payload.batchNo || "").trim();
  const supplierRef = String(payload.supplierRef || "").trim();
  const note = String(payload.note || "").trim();

  if (!medicineId || !mongoose.Types.ObjectId.isValid(medicineId)) {
    return { status: 400, body: { message: "Valid medicine is required" } };
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { status: 400, body: { message: "Quantity must be at least 1" } };
  }
  if (!batchNo) {
    return { status: 400, body: { message: "Batch number is required" } };
  }

  let expiryDate = null;
  if (payload.expiryDate) {
    expiryDate = new Date(payload.expiryDate);
    if (Number.isNaN(expiryDate.getTime())) {
      return { status: 400, body: { message: "Invalid expiry date" } };
    }
  }

  const medicine = await Medicine.findById(medicineId);
  if (!medicine || !medicine.isActive) {
    return { status: 404, body: { message: "Medicine not found" } };
  }

  const movement = await StockMovement.create({
    medicineId: medicine._id,
    type: "inbound",
    quantity,
    batchNo,
    expiryDate,
    supplierRef,
    note,
    performedBy: userId,
  });

  medicine.stockQty += quantity;
  await medicine.save();

  return {
    status: 201,
    body: {
      message: "Stock inbound recorded",
      movement: serializeMovement({ ...movement.toObject(), medicineId: medicine }),
      medicine: serializeMedicine(medicine.toObject()),
    },
  };
}

export async function stockOutbound(userId, payload = {}) {
  const medicineId = String(payload.medicineId || "").trim();
  const quantity = parseInt(payload.quantity, 10);
  const reason = String(payload.reason || payload.note || "").trim();
  const prescriptionId = String(payload.prescriptionId || "").trim();

  if (!medicineId || !mongoose.Types.ObjectId.isValid(medicineId)) {
    return { status: 400, body: { message: "Valid medicine is required." } };
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { status: 400, body: { message: "Quantity must be at least 1." } };
  }
  if (!reason) {
    return { status: 400, body: { message: "Reason is required for stock outbound." } };
  }

  const medicine = await Medicine.findById(medicineId);
  if (!medicine || !medicine.isActive) {
    return { status: 404, body: { message: "Medicine not found." } };
  }

  if (medicine.stockQty < quantity) {
    return {
      status: 409,
      body: {
        message: `Cannot exceed on-hand stock. Available: ${medicine.stockQty} ${medicine.unit}.`,
      },
    };
  }

  let linkedPrescriptionId = null;
  if (prescriptionId) {
    if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
      return { status: 400, body: { message: "Invalid prescription id." } };
    }
    const prescription = await Prescription.findById(prescriptionId).select("_id status").lean();
    if (!prescription) {
      return { status: 404, body: { message: "Prescription not found." } };
    }
    linkedPrescriptionId = prescription._id;
  }

  const movement = await StockMovement.create({
    medicineId: medicine._id,
    type: "outbound",
    quantity,
    note: reason,
    prescriptionId: linkedPrescriptionId,
    performedBy: userId,
  });

  medicine.stockQty -= quantity;
  await medicine.save();

  return {
    status: 201,
    body: {
      message: "Stock outbound recorded",
      movement: serializeMovement({ ...movement.toObject(), medicineId: medicine }),
      medicine: serializeMedicine(medicine.toObject()),
    },
  };
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

async function buildPharmacyDashboardBody() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trendStart = new Date(today);
  trendStart.setDate(today.getDate() - 6);

  const [medicineRows, recentInbound, inboundRows] = await Promise.all([
    Medicine.find({ isActive: true }).sort({ name: 1 }).lean(),
    StockMovement.countDocuments({
      type: "inbound",
      createdAt: { $gte: today },
    }),
    StockMovement.find({
      type: "inbound",
      createdAt: { $gte: trendStart },
    })
      .select("createdAt quantity")
      .lean(),
  ]);

  const lowStockItems = medicineRows
    .filter((item) => item.stockQty <= item.minStockLevel)
    .sort((a, b) => {
      const urgencyA = (a.minStockLevel || 0) - (a.stockQty || 0);
      const urgencyB = (b.minStockLevel || 0) - (b.stockQty || 0);
      if (urgencyB !== urgencyA) return urgencyB - urgencyA;
      return (a.stockQty || 0) - (b.stockQty || 0);
    });
  const trendDays = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    trendDays.push(dateKey(day));
  }

  const inboundByDay = Object.fromEntries(
    trendDays.map((day) => [day, { movements: 0, quantity: 0 }])
  );
  for (const row of inboundRows) {
    const key = dateKey(new Date(row.createdAt));
    if (!inboundByDay[key]) continue;
    inboundByDay[key].movements += 1;
    inboundByDay[key].quantity += row.quantity || 0;
  }

  const expiringLimit = new Date(today);
  expiringLimit.setDate(today.getDate() + 60);
  
  const expiringInbound = await StockMovement.find({
    type: "inbound",
    expiryDate: { $gte: today, $lte: expiringLimit }
  }).populate("medicineId", "name code stockQty minStockLevel unit").lean();
  
  const expiringMap = new Map();
  for (const mov of expiringInbound) {
    if (mov.medicineId && mov.medicineId.stockQty > 0) {
      expiringMap.set(`${mov.medicineId._id}-${mov.batchNo}`, {
        medicine: serializeMedicine(mov.medicineId),
        batchNo: mov.batchNo,
        expiryDate: formatDateOnly(mov.expiryDate),
      });
    }
  }

  return {
    medicineCount: medicineRows.length,
    lowStockCount: lowStockItems.length,
    inboundToday: recentInbound,
    stockChart: medicineRows.map((medicine) => ({
      key: medicine._id.toString(),
      label: medicine.code,
      value: medicine.stockQty,
      tone: medicine.stockQty <= medicine.minStockLevel ? "warn" : undefined,
      title: `${medicine.name}: ${medicine.stockQty} ${medicine.unit} (min ${medicine.minStockLevel})`,
    })),
    inboundTrend: trendDays.map((day) => ({
      date: day,
      label: day.slice(5),
      value: inboundByDay[day].quantity,
      movements: inboundByDay[day].movements,
    })),
    lowStockItems: lowStockItems.map((medicine) => serializeMedicine(medicine)),
    expiringBatches: Array.from(expiringMap.values()).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
    urgencyAlerts: [
      ...lowStockItems.map((medicine) => ({
        type: "low_stock",
        urgencyScore: (medicine.minStockLevel || 0) - (medicine.stockQty || 0),
        medicine: serializeMedicine(medicine),
        label: `${medicine.name} below threshold (${medicine.stockQty}/${medicine.minStockLevel})`,
      })),
      ...Array.from(expiringMap.values()).map((batch) => {
        const daysLeft = Math.ceil((new Date(batch.expiryDate) - today) / (24 * 60 * 60 * 1000));
        return {
          type: "near_expiry",
          urgencyScore: Math.max(0, 60 - daysLeft),
          medicine: batch.medicine,
          batchNo: batch.batchNo,
          expiryDate: batch.expiryDate,
          label: `${batch.medicine?.name || "Medicine"} batch ${batch.batchNo} expires ${batch.expiryDate}`,
        };
      }),
    ].sort((a, b) => b.urgencyScore - a.urgencyScore),
  };
}

export async function createMedicine(userId, payload = {}) {
  const code = String(payload.code || "").trim().toUpperCase();
  const name = String(payload.name || "").trim();
  const unit = String(payload.unit || "").trim();
  const price = Number(payload.price);
  const minStockLevel = Number(payload.minStockLevel);
  const initialQuantity = parseInt(payload.initialQuantity, 10);

  if (!code || !name || !unit) {
    return { status: 400, body: { message: "Code, name, and unit are required" } };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { status: 400, body: { message: "Price must be a valid positive number" } };
  }
  if (!Number.isFinite(minStockLevel) || minStockLevel < 0) {
    return { status: 400, body: { message: "Min stock level must be a valid positive number" } };
  }

  const existing = await Medicine.findOne({ code });
  if (existing) {
    return { status: 409, body: { message: "Medicine code already exists" } };
  }

  const startStock = !Number.isNaN(initialQuantity) && initialQuantity > 0 ? initialQuantity : 0;

  const medicine = await Medicine.create({
    code,
    name,
    unit,
    price,
    minStockLevel,
    stockQty: startStock,
    isActive: true,
  });

  if (startStock > 0) {
    await StockMovement.create({
      medicineId: medicine._id,
      type: "inbound",
      quantity: startStock,
      batchNo: payload.batchNo || "INITIAL",
      note: "Initial stock from creation",
      performedBy: userId,
    });
  }

  return { status: 201, body: serializeMedicine(medicine) };
}

export async function updateMedicine(medicineId, payload = {}) {
  if (!medicineId || !mongoose.Types.ObjectId.isValid(medicineId)) {
    return { status: 400, body: { message: "Invalid medicine ID" } };
  }

  const name = String(payload.name || "").trim();
  const unit = String(payload.unit || "").trim();
  const minStockLevel = Number(payload.minStockLevel);

  if (!name) {
    return { status: 400, body: { message: "Medicine name is required" } };
  }
  if (!unit) {
    return { status: 400, body: { message: "Unit is required" } };
  }
  if (!Number.isFinite(minStockLevel) || minStockLevel < 0) {
    return { status: 400, body: { message: "Low stock threshold must be greater than or equal to 0" } };
  }

  const medicine = await Medicine.findById(medicineId);
  if (!medicine) {
    return { status: 404, body: { message: "Medicine not found" } };
  }

  const duplicate = await Medicine.findOne({
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    _id: { $ne: medicine._id },
  });
  if (duplicate) {
    return { status: 409, body: { message: "Medicine name already exists" } };
  }

  medicine.name = name;
  medicine.unit = unit;
  medicine.minStockLevel = minStockLevel;
  if (payload.price !== undefined) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price < 0) {
      return { status: 400, body: { message: "Price must be a valid positive number" } };
    }
    medicine.price = price;
  }
  if (payload.isActive !== undefined) medicine.isActive = Boolean(payload.isActive);

  await medicine.save();

  return { status: 200, body: serializeMedicine(medicine.toObject()) };
}

export async function getPharmacyDashboard() {
  return {
    status: 200,
    body: await buildPharmacyDashboardBody(),
  };
}

export async function getStaffDashboard() {
  const pharmacy = await buildPharmacyDashboardBody();
  const dayStart = startOfToday();
  const dayEnd = endOfToday();

  const [todayCheckIns, sessionIds, openComplaints] = await Promise.all([
    Appointment.countDocuments({
      status: "checked-in",
      updatedAt: { $gte: dayStart, $lt: dayEnd },
    }),
    QueueSession.find({
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $in: ["open", "paused"] },
    })
      .select("_id")
      .lean(),
    Complaint.countDocuments({ status: { $in: ["open", "in_progress"] } }),
  ]);

  const waitingQueueCount = sessionIds.length
    ? await QueueTicket.countDocuments({
        sessionId: { $in: sessionIds.map((row) => row._id) },
        status: "waiting",
      })
    : 0;

  return {
    status: 200,
    body: {
      ...pharmacy,
      operations: {
        todayCheckIns,
        waitingQueueCount,
        openComplaints,
        lowStockCount: pharmacy.lowStockCount || 0,
        refreshedAt: new Date().toISOString(),
      },
    },
  };
}

export async function lookupPrescription(prescriptionId) {
  if (!prescriptionId || !mongoose.Types.ObjectId.isValid(prescriptionId)) {
    return {
      status: 200,
      body: {
        validationStatus: "invalid",
        message: "Invalid prescription ID",
        canDispense: false,
        prescription: null,
      },
    };
  }

  const prescription = await Prescription.findById(prescriptionId)
    .populate("patientUserId", "fullName phone email")
    .populate({
      path: "doctorId",
      populate: { path: "userId", select: "fullName" },
    })
    .populate("encounterId", "visitDate diagnoses")
    .lean();

  if (!prescription) {
    return {
      status: 200,
      body: {
        validationStatus: "invalid",
        message: "Prescription not found",
        canDispense: false,
        prescription: null,
      },
    };
  }

  const PRESCRIPTION_VALIDITY_DAYS = 30;
  const issuedAt = prescription.issuedAt ? new Date(prescription.issuedAt) : null;
  const expiresAt =
    issuedAt && !Number.isNaN(issuedAt.getTime())
      ? new Date(issuedAt.getTime() + PRESCRIPTION_VALIDITY_DAYS * 24 * 60 * 60 * 1000)
      : null;
  const now = new Date();

  let validationStatus = "invalid";
  let message = "Prescription cannot be dispensed";
  let canDispense = false;

  if (prescription.status === "cancelled") {
    validationStatus = "invalid";
    message = "Prescription was cancelled";
  } else if (prescription.status === "draft") {
    validationStatus = "invalid";
    message = "Prescription is still a draft and has not been issued";
  } else if (prescription.status === "dispensed") {
    validationStatus = "already_dispensed";
    message = "This prescription has already been dispensed";
  } else if (prescription.status === "issued") {
    if (expiresAt && expiresAt < now) {
      validationStatus = "expired";
      message = `Prescription expired on ${expiresAt.toLocaleDateString()} (valid ${PRESCRIPTION_VALIDITY_DAYS} days after issue)`;
    } else {
      validationStatus = "valid";
      message = "Prescription is valid and ready to dispense";
      canDispense = true;
    }
  }

  return {
    status: 200,
    body: {
      validationStatus,
      message,
      canDispense,
      expiresAt,
      validityDays: PRESCRIPTION_VALIDITY_DAYS,
      prescription,
    },
  };
}

export async function verifyPrescription(userId, payload) {
  const prescriptionId = payload.prescriptionId;
  const lookup = await lookupPrescription(prescriptionId);
  const { validationStatus, message, canDispense, prescription: lookedUp } = lookup.body;

  if (validationStatus === "invalid") {
    return { status: 404, body: { validationStatus, message } };
  }
  if (validationStatus === "already_dispensed") {
    return { status: 400, body: { validationStatus, message } };
  }
  if (validationStatus === "expired") {
    return { status: 400, body: { validationStatus, message } };
  }
  if (!canDispense || !lookedUp) {
    return { status: 400, body: { validationStatus, message } };
  }

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription || prescription.status !== "issued") {
    return { status: 409, body: { validationStatus: "invalid", message: "Prescription is no longer available to dispense" } };
  }

  // Check stock for all medicines
  const medicineIds = prescription.lineItems.map((item) => item.medicineId);
  const medicines = await Medicine.find({ _id: { $in: medicineIds } });
  const medicineMap = new Map(medicines.map((m) => [m._id.toString(), m]));

  const outOfStockItems = [];
  for (const item of prescription.lineItems) {
    const med = medicineMap.get(item.medicineId.toString());
    if (!med || med.stockQty < item.quantity) {
      outOfStockItems.push({
        medicineCode: item.medicineCode,
        medicineName: item.medicineName,
        requested: item.quantity,
        available: med ? med.stockQty : 0,
      });
    }
  }

  if (outOfStockItems.length > 0) {
    return {
      status: 400,
      body: {
        validationStatus: "invalid",
        message: "Insufficient stock for some medicines",
        details: outOfStockItems,
      },
    };
  }

  for (const item of prescription.lineItems) {
    const med = medicineMap.get(item.medicineId.toString());
    med.stockQty -= item.quantity;
    await med.save();

    await StockMovement.create({
      medicineId: med._id,
      type: "outbound",
      quantity: item.quantity,
      note: `Dispensed for prescription ${prescription._id}`,
      performedBy: userId,
    });
  }

  prescription.status = "dispensed";
  prescription.dispensedAt = new Date();
  prescription.dispensedBy = userId;
  await prescription.save();

  const refreshed = await Prescription.findById(prescription._id)
    .populate("patientUserId", "fullName phone email")
    .populate({
      path: "doctorId",
      populate: { path: "userId", select: "fullName" },
    })
    .populate("encounterId", "visitDate diagnoses")
    .lean();

  return {
    status: 200,
    body: {
      validationStatus: "dispensed",
      message: "Prescription verified and medicines dispensed successfully",
      prescription: refreshed,
    },
  };
}
