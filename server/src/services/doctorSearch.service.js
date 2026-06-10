import mongoose from "mongoose";
import { Specialty } from "../models/Specialty.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { extractQueryEntities } from "./search/hmmExtractor.js";
import { rankDoctors } from "./search/retrievalEngine.js";

let catalogCache = null;

async function loadCatalog() {
  if (catalogCache) return catalogCache;

  const [specialties, departments] = await Promise.all([
    Specialty.find({ isActive: true }).sort({ name: 1 }).lean(),
    Department.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  catalogCache = { specialties, departments, loadedAt: Date.now() };
  return catalogCache;
}

export function invalidateSearchCache() {
  catalogCache = null;
}

export async function listSpecialties() {
  const { specialties } = await loadCatalog();
  return specialties;
}

export async function listDepartments() {
  const { departments } = await loadCatalog();
  return departments;
}

async function fetchDoctorRecords(matchStage = { isActive: true }) {
  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    { $match: { "user.isActive": true } },
    {
      $lookup: {
        from: "specialties",
        localField: "specialtyId",
        foreignField: "_id",
        as: "specialty",
      },
    },
    { $unwind: "$specialty" },
    {
      $lookup: {
        from: "departments",
        localField: "departmentId",
        foreignField: "_id",
        as: "department",
      },
    },
    { $unwind: "$department" },
    {
      $project: {
        _id: 1,
        bio: 1,
        photoUrl: { $ifNull: ["$photoUrl", "$user.photoUrl"] },
        licenseNo: 1,
        languages: 1,
        workplace: 1,
        reviewRating: 1,
        reviewCount: 1,
        reviewSummary: 1,
        fullName: "$user.fullName",
        email: "$user.email",
        phone: "$user.phone",
        specialty: { _id: "$specialty._id", name: "$specialty.name", code: "$specialty.code" },
        department: { _id: "$department._id", name: "$department.name" },
        specialtyId: 1,
        departmentId: 1,
      },
    },
  ];

  return Doctor.aggregate(pipeline);
}

export async function getDoctorById(doctorId) {
  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    return null;
  }

  const matchStage = { isActive: true, _id: new mongoose.Types.ObjectId(doctorId) };
  const doctors = await fetchDoctorRecords(matchStage);
  return doctors.length > 0 ? doctors[0] : null;
}

export async function getFeaturedDoctors(limit = 6) {
  const doctors = await fetchDoctorRecords({ isActive: true });
  const sorted = doctors
    .map((doc) => ({
      ...doc,
      reviewRating: doc.reviewRating != null ? doc.reviewRating : 0,
      reviewCount: doc.reviewCount || 0,
    }))
    .sort((a, b) => {
      if (b.reviewRating !== a.reviewRating) return b.reviewRating - a.reviewRating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.fullName.localeCompare(b.fullName);
    });
  return sorted.slice(0, Math.max(1, Math.min(12, parseInt(limit, 10) || 6)));
}

function applyIdFilter(matchStage, specialtyId, departmentId) {
  if (specialtyId && mongoose.Types.ObjectId.isValid(specialtyId)) {
    matchStage.specialtyId = new mongoose.Types.ObjectId(specialtyId);
  }
  if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
    matchStage.departmentId = new mongoose.Types.ObjectId(departmentId);
  }
  return matchStage;
}

export async function searchDoctors({ q, name, specialtyId, departmentId, page = 1, limit = 12 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));

  const { specialties, departments } = await loadCatalog();
  const rawQuery = (q || name || "").trim();

  let extracted = null;
  let resolvedSpecialtyId = specialtyId || "";
  let resolvedDepartmentId = departmentId || "";
  let resolvedName = name?.trim() || "";

  if (rawQuery) {
    const allDoctors = await fetchDoctorRecords({ isActive: true });
    extracted = extractQueryEntities(rawQuery, {
      specialties,
      departments,
      doctorNames: allDoctors.map((d) => d.fullName),
    });

    if (!resolvedSpecialtyId && extracted.specialtyId) resolvedSpecialtyId = extracted.specialtyId;
    if (!resolvedDepartmentId && extracted.departmentId) resolvedDepartmentId = extracted.departmentId;
    if (!resolvedName && extracted.nameText) resolvedName = extracted.nameText;
  }

  const matchStage = applyIdFilter({ isActive: true }, resolvedSpecialtyId, resolvedDepartmentId);
  let doctors = await fetchDoctorRecords(matchStage);

  const searchText = rawQuery || resolvedName;
  const MIN_RELEVANCE = 0.08;

  const catalog = { specialties, departments };

  if (searchText) {
    doctors = rankDoctors(doctors, searchText, catalog).filter(
      (d) => d._searchScore >= MIN_RELEVANCE || !rawQuery
    );

    if (rawQuery && doctors.every((d) => d._searchScore < MIN_RELEVANCE)) {
      doctors = rankDoctors(await fetchDoctorRecords({ isActive: true }), searchText, catalog);
    }
  }

  const total = doctors.length;
  const skip = (pageNum - 1) * limitNum;
  const items = doctors.slice(skip, skip + limitNum).map(({ _searchScore, _matchPercent, ...doc }) => ({
    ...doc,
    searchScore: _searchScore != null ? Number(_searchScore.toFixed(4)) : undefined,
    matchPercent: _matchPercent ?? undefined,
  }));

  return {
    items,
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum) || 1,
    searchEngine: {
      type: "BM25 + NGramIndex + HMM",
      query: rawQuery || null,
      extraction: extracted
        ? {
            name: extracted.nameText || null,
            specialty: extracted.specialtyName,
            specialtyMatchPercent: extracted.specialtyMatchPercent,
            specialtyAlternatives: extracted.specialtyAlternatives,
            department: extracted.departmentName,
            departmentMatchPercent: extracted.departmentMatchPercent,
            departmentAlternatives: extracted.departmentAlternatives,
            tokens: extracted.tokens,
            labels: extracted.labels,
          }
        : null,
      appliedFilters: {
        name: resolvedName || null,
        specialtyId: resolvedSpecialtyId || null,
        departmentId: resolvedDepartmentId || null,
      },
    },
  };
}
