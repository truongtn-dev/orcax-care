import { api } from "./api.js";

export const StaffApiClient = {
  getDashboard() {
    return api.get("/api/staff/dashboard");
  },

  getPharmacyDashboard() {
    return api.get("/api/staff/pharmacy/dashboard");
  },

  listMedicines(params) {
    return api.get("/api/staff/pharmacy/medicines", { params });
  },

  getMedicine(id) {
    return api.get(`/api/staff/pharmacy/medicines/${id}`);
  },

  listStockMovements(params) {
    return api.get("/api/staff/pharmacy/stock-movements", { params });
  },

  stockInbound(payload) {
    return api.post("/api/staff/pharmacy/stock-inbound", payload);
  },

  verifyPrescription(payload) {
    return api.post("/api/staff/pharmacy/prescriptions/verify", payload);
  },

  createMedicine(payload) {
    return api.post("/api/staff/pharmacy/medicines", payload);
  },

  stockOutbound(payload) {
    return api.post("/api/staff/pharmacy/stock-outbound", payload);
  },

  getMyBranch() {
    return api.get("/api/staff/branch");
  },

  updateMyBranch(payload) {
    return api.put("/api/staff/branch", payload);
  },
};
