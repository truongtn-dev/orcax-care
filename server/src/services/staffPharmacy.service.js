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

export async function getPharmacyDashboard() {
  const [medicines, lowStockCount, recentInbound] = await Promise.all([
    Medicine.countDocuments({ isActive: true }),
    Medicine.countDocuments({
      isActive: true,
      $expr: { $lte: ["$stockQty", "$minStockLevel"] },
    }),
    StockMovement.countDocuments({
      type: "inbound",
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
  ]);

  return {
    status: 200,
    body: {
      medicineCount: medicines,
      lowStockCount,
      inboundToday: recentInbound,
    },
  };
}
