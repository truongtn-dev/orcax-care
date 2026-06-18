import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthApiClient } from "../services/authApi.js";
import { setUnauthorizedHandler } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuth, setIsAuth] = useState(false);
  const [role, setRole] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const clearLocalSession = useCallback(() => {
    AuthApiClient.removeToken();
    AuthApiClient.clearAuthHeader();
    setIsAuth(false);
    setRole(null);
    setFullName("");
    setEmail("");
    setAvatarUrl("");
  }, []);

  const logout = useCallback(async () => {
    try {
      if (AuthApiClient.getToken()) {
        await AuthApiClient.logout();
      }
    } catch {
      // Always clear client session even if server revoke fails
    } finally {
      clearLocalSession();
    }
  }, [clearLocalSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => clearLocalSession());
    return () => setUnauthorizedHandler(null);
  }, [clearLocalSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = AuthApiClient.getToken();
      if (!token) {
        if (!cancelled) setAuthLoading(false);
        return;
      }

      try {
        const { data } = await AuthApiClient.me();
        if (cancelled) return;
        setIsAuth(true);
        setRole(data.role);
        setFullName(data.fullName || AuthApiClient.getUserName());
        setEmail(data.email || AuthApiClient.getUserEmail());
        setAvatarUrl(data.avatarUrl || "");
      } catch {
        if (!cancelled) clearLocalSession();
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearLocalSession]);

  const value = useMemo(
    () => ({
      isAuthenticated: isAuth,
      role,
      fullName,
      email,
      avatarUrl,
      authLoading,
      loginSuccess(data, rememberMe) {
        AuthApiClient.storeToken(data.accessToken, rememberMe, data.tokenType || "Token");
        AuthApiClient.storeUserMeta(data.role, data.fullName, rememberMe, data.email, data.avatarUrl);
        setIsAuth(true);
        setRole(data.role);
        setFullName(data.fullName || "");
        setEmail(data.email || "");
        setAvatarUrl(data.avatarUrl || "");
      },
      updateProfileMeta({ fullName: nextName, avatarUrl: nextAvatarUrl } = {}) {
        if (nextName !== undefined) {
          setFullName(nextName || "");
        }
        if (nextAvatarUrl !== undefined) {
          setAvatarUrl(nextAvatarUrl || "");
        }
        const rememberMe = Boolean(localStorage.getItem("accessToken"));
        AuthApiClient.storeUserMeta(
          role,
          nextName !== undefined ? nextName : fullName,
          rememberMe,
          email,
          nextAvatarUrl !== undefined ? nextAvatarUrl : avatarUrl
        );
      },
      logout,
    }),
    [isAuth, role, fullName, email, avatarUrl, authLoading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
