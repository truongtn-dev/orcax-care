import { api } from "./api.js";

export const AuthApiClient = {
  login(email, password, rememberMe = false) {
    return api.post("/api/auth/login", { email, password, rememberMe });
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

  logout() {
    return api.post("/api/auth/logout");
  },

  storeToken(accessToken, rememberMe = false, tokenType = "Token") {
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("tokenType");
    sessionStorage.removeItem("tokenType");
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("accessToken", accessToken);
    storage.setItem("tokenType", tokenType);
  },

  getToken() {
    return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
  },

  removeToken() {
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("tokenType");
    sessionStorage.removeItem("tokenType");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("userEmail");
    localStorage.removeItem("userAvatarUrl");
    sessionStorage.removeItem("userAvatarUrl");
  },

  storeUserMeta(role, fullName, rememberMe = false, email = "", avatarUrl = "") {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("userRole", role);
    storage.setItem("userName", fullName || "");
    storage.setItem("userEmail", email || "");
    storage.setItem("userAvatarUrl", avatarUrl || "");
  },

  getUserRole() {
    return localStorage.getItem("userRole") || sessionStorage.getItem("userRole");
  },

  getUserName() {
    return localStorage.getItem("userName") || sessionStorage.getItem("userName");
  },

  getUserEmail() {
    return localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail");
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  clearAuthHeader() {
    delete api.defaults.headers.common.Authorization;
  },
};
