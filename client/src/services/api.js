import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "";
const TOKEN_SCHEME = "Token";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function getStoredToken() {
  return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `${TOKEN_SCHEME} ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err) {
  return err?.response?.data?.message || err?.message || "Something went wrong";
}

export function getApiErrorCode(err) {
  return err?.response?.data?.code || null;
}

export { TOKEN_SCHEME };
