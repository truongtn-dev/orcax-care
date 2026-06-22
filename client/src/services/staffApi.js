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

  listStockMovements(params) {
    return api.get("/api/staff/pharmacy/stock-movements", { params });
  },

  stockInbound(payload) {
    return api.post("/api/staff/pharmacy/stock-inbound", payload);
  },
};
