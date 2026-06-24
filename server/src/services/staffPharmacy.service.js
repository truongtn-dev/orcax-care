import mongoose from "mongoose";
import { Medicine } from "../models/Medicine.js";
import { StockMovement } from "../models/StockMovement.js";

function serializeMedicine(medicine) {
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
    createdAt: row.createdAt,
    medicine: medicine._id
      ? { _id: medicine._id.toString(), name: medicine.name, code: medicine.code, unit: medicine.unit }
      : null,
  };
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
    items = items.filter((item) => item.stockQty <= item.minStockLevel);
  }

  return {
    status: 200,
    body: {
      items: items.map(serializeMedicine),
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

  const lowStockItems = medicineRows.filter((item) => item.stockQty <= item.minStockLevel);
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

export async function getPharmacyDashboard() {
  return {
    status: 200,
    body: await buildPharmacyDashboardBody(),
  };
}

export async function getStaffDashboard() {
  return {
    status: 200,
    body: await buildPharmacyDashboardBody(),
  };
}
