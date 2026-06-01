import { api } from "./api.js";

export const AuthApiClient = {
  login(email, password) {
    return api.post("/api/auth/login", { email, password });
  },

  register(payload) {
    return api.post("/api/auth/register", payload);
  },

  forgotPassword(email) {
    return api.post("/api/auth/forgot-password", { email });
  },

  resetPassword(token, newPassword) {
    return api.post("/api/auth/reset-password", { token, newPassword });
  },

  verifyEmail(token) {
    return api.get("/api/auth/verify-email", { params: { token } });
  },

  resendVerification(email) {
    return api.post("/api/auth/resend-verification", { email });
  },

  changePassword(currentPassword, newPassword) {
    return api.put("/api/auth/change-password", { currentPassword, newPassword });
  },

  me() {
    return api.get("/api/auth/me");
  },

  storeToken(accessToken, rememberMe = false) {
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");
    if (rememberMe) {
      localStorage.setItem("accessToken", accessToken);
    } else {
      sessionStorage.setItem("accessToken", accessToken);
    }
  },

  getToken() {
    return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  },

  removeToken() {
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userName");
  },

  storeUserMeta(role, fullName, rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("userRole", role);
    storage.setItem("userName", fullName || "");
  },

  getUserRole() {
    return localStorage.getItem("userRole") || sessionStorage.getItem("userRole");
  },

  getUserName() {
    return localStorage.getItem("userName") || sessionStorage.getItem("userName");
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  clearAuthHeader() {
    delete api.defaults.headers.common.Authorization;
  },
};
