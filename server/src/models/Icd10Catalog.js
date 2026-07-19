import mongoose from "mongoose";

const icd10CatalogSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { collection: "icd10_catalogs", timestamps: true }
);

export const Icd10Catalog = mongoose.model("Icd10Catalog", icd10CatalogSchema);
