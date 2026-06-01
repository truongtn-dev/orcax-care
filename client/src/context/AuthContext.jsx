import { createContext, useContext, useMemo, useState } from "react";
import { AuthApiClient } from "../services/authApi.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuth, setIsAuth] = useState(AuthApiClient.isAuthenticated());
  const [role, setRole] = useState(AuthApiClient.getUserRole());
  const [fullName, setFullName] = useState(AuthApiClient.getUserName());

  const value = useMemo(
    () => ({
      isAuthenticated: isAuth,
      role,
      fullName,
      loginSuccess(data, rememberMe) {
        AuthApiClient.storeToken(data.accessToken, rememberMe);
        AuthApiClient.storeUserMeta(data.role, data.fullName, rememberMe);
        setIsAuth(true);
        setRole(data.role);
        setFullName(data.fullName || "");
      },
      logout() {
        AuthApiClient.removeToken();
        AuthApiClient.clearAuthHeader();
        setIsAuth(false);
        setRole(null);
        setFullName("");
      },
    }),
    [isAuth, role, fullName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
