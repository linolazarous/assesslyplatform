// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import PropTypes from "prop-types";
import axiosLib from "axios";

/**
 * Production-ready AuthContext
 * Exports: AuthProvider, useAuth, OrganizationProvider, useOrganization
 *
 * Drop in as-is. Ensure environment variables:
 *  - VITE_API_BASE_URL (optional)
 *  - VITE_APP_VERSION (optional)
 *
 * Responsibilities:
 *  - persistent token storage
 *  - axios instance with Authorization header
 *  - refresh token flow (scheduled + on 401)
 *  - basic role/permission helpers
 *  - organization context & switch
 */

/* ------------------------------
   Configuration & Storage keys
   ------------------------------ */
const STORAGE = {
  TOKEN: "assessly_token",
  REFRESH: "assessly_refresh_token",
  USER: "assessly_user",
  ORG: "assessly_current_org",
  TOKEN_EXPIRY: "assessly_token_expiry",
};

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "") ||
  "https://assesslyplatform-t49h.onrender.com";
const API_V1 = `${API_BASE}/api/v1`;

/* ------------------------------
   Utilities
   ------------------------------ */
const safeJSONParse = (v) => {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const decodeJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (e) {
    try {
      // fallback simple parse (some environments)
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  }
};

const isTokenValid = (token, bufferMs = 60 * 1000) => {
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return false;
  return Date.now() + bufferMs < decoded.exp * 1000;
};

/* ------------------------------
   Role hierarchy & defaults
   ------------------------------ */
export const ROLE_HIERARCHY = {
  super_admin: 100,
  organization_owner: 90,
  organization_admin: 80,
  organization_manager: 70,
  assessor: 60,
  candidate: 50,
  viewer: 40,
  guest: 10,
};

/* ------------------------------
   Axios instance
   ------------------------------ */
export const axios = axiosLib.create({
  baseURL: API_V1,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Client": "assessly-web",
    "X-Client-Version": import.meta.env.VITE_APP_VERSION || "1.0.0",
  },
});

/* ------------------------------
   Contexts
   ------------------------------ */
const AuthContext = createContext(null);
const OrganizationContext = createContext(null);

/* ------------------------------
   AuthProvider
   ------------------------------ */
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => safeJSONParse(localStorage.getItem(STORAGE.USER)));
  const [currentOrganization, setCurrentOrganization] = useState(() =>
    safeJSONParse(localStorage.getItem(STORAGE.ORG))
  );
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE.TOKEN));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(STORAGE.REFRESH));
  const [claims, setClaims] = useState(() => (token ? decodeJwt(token) || {} : {}));
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authError, setAuthError] = useState(null);

  // refs & timers
  const refreshTimerRef = useRef(null);
  const refreshRetryRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  /* ------------------------------
     Token scheduling
     ------------------------------ */
  const scheduleTokenRefresh = useCallback(
    (accessToken) => {
      if (!accessToken) return;
      const decoded = decodeJwt(accessToken);
      if (!decoded?.exp) return;
      const refreshAt = decoded.exp * 1000 - Date.now() - 15 * 60 * 1000; // 15min before expiry
      if (refreshAt <= 0) {
        // immediate refresh
        refreshAccessToken().catch(() => {});
        return;
      }
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshAccessToken().catch(() => {});
      }, Math.max(refreshAt, 1000));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ------------------------------
     Low-level helpers: save/clear tokens
     ------------------------------ */
  const persistTokens = useCallback((access, refresh, expiryIso = null) => {
    try {
      if (access) {
        localStorage.setItem(STORAGE.TOKEN, access);
        setToken(access);
        setClaims(decodeJwt(access) || {});
      }
      if (refresh) {
        localStorage.setItem(STORAGE.REFRESH, refresh);
        setRefreshToken(refresh);
      }
      if (expiryIso) {
        localStorage.setItem(STORAGE.TOKEN_EXPIRY, expiryIso);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const clearAllAuth = useCallback(() => {
    try {
      Object.values(STORAGE).forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
    setToken(null);
    setRefreshToken(null);
    setCurrentUser(null);
    setClaims({});
    setCurrentOrganization(null);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  /* ------------------------------
     Send error to console + set state
     ------------------------------ */
  const handleAuthError = useCallback((err) => {
    console.error("Auth error:", err);
    if (mountedRef.current) setAuthError(err?.message || String(err));
  }, []);

  /* ------------------------------
     Refresh access token
     ------------------------------ */
  const refreshAccessToken = useCallback(
    async (providedRefresh = null) => {
      if (isRefreshing) return false;
      const usingRefresh = providedRefresh || localStorage.getItem(STORAGE.REFRESH);
      if (!usingRefresh) {
        clearAllAuth();
        return false;
      }

      setIsRefreshing(true);
      try {
        const res = await axios.post("/auth/refresh", { refresh_token: usingRefresh }, { timeout: 15000 });
        const data = res?.data || {};
        const newAccess = data.access_token || data.token || data.accessToken;
        const newRefresh = data.refresh_token || data.refreshToken || usingRefresh;
        if (!newAccess) throw new Error("No access token in refresh response");

        // persist & schedule
        persistTokens(newAccess, newRefresh, data.expires_at || null);
        scheduleTokenRefresh(newAccess);

        // update user if provided
        if (data.user) {
          setCurrentUser(data.user);
          try {
            localStorage.setItem(STORAGE.USER, JSON.stringify(data.user));
          } catch {}
        } else {
          // attempt to keep existing user
          const storedUser = safeJSONParse(localStorage.getItem(STORAGE.USER));
          if (storedUser) setCurrentUser(storedUser);
        }

        refreshRetryRef.current = 0;
        setIsRefreshing(false);
        return true;
      } catch (err) {
        refreshRetryRef.current += 1;
        console.warn("Refresh token attempt failed:", err?.message || err);
        // backoff up to 3 attempts
        if (refreshRetryRef.current <= 3) {
          const delay = Math.min(1000 * 2 ** (refreshRetryRef.current - 1), 30_000);
          await new Promise((r) => setTimeout(r, delay));
          setIsRefreshing(false);
          return refreshAccessToken(usingRefresh);
        }

        // permanent failure -> clear auth
        handleAuthError(err);
        clearAllAuth();
        setIsRefreshing(false);
        return false;
      }
    },
    [clearAllAuth, isRefreshing, persistTokens, scheduleTokenRefresh, handleAuthError]
  );

  /* ------------------------------
     Initialize auth on mount
     ------------------------------ */
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const storedToken = localStorage.getItem(STORAGE.TOKEN);
        const storedRefresh = localStorage.getItem(STORAGE.REFRESH);
        const storedUser = safeJSONParse(localStorage.getItem(STORAGE.USER));
        const storedOrg = safeJSONParse(localStorage.getItem(STORAGE.ORG));

        if (storedToken && isTokenValid(storedToken)) {
          setToken(storedToken);
          setClaims(decodeJwt(storedToken) || {});
          setCurrentUser(storedUser);
          setCurrentOrganization(storedOrg);
          scheduleTokenRefresh(storedToken);
        } else if (storedRefresh) {
          // attempt refresh
          await refreshAccessToken(storedRefresh);
          const afterToken = localStorage.getItem(STORAGE.TOKEN);
          const afterUser = safeJSONParse(localStorage.getItem(STORAGE.USER));
          const afterOrg = safeJSONParse(localStorage.getItem(STORAGE.ORG));
          if (afterToken) {
            setToken(afterToken);
            setClaims(decodeJwt(afterToken) || {});
            setCurrentUser(afterUser);
            setCurrentOrganization(afterOrg);
            scheduleTokenRefresh(afterToken);
          } else {
            clearAllAuth();
          }
        } else {
          // no tokens: keep signed out state
          clearAllAuth();
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        clearAllAuth();
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------
     Axios interceptors (attach token + refresh on 401)
     ------------------------------ */
  useEffect(() => {
    const reqId = axios.interceptors.request.use(
      (cfg) => {
        try {
          const t = localStorage.getItem(STORAGE.TOKEN);
          if (t) cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${t}` };
          const org = localStorage.getItem(STORAGE.ORG);
          if (org) {
            const parsed = safeJSONParse(org);
            if (parsed?.id) cfg.headers["X-Organization-ID"] = parsed.id;
          }
        } catch (e) {}
        return cfg;
      },
      (err) => Promise.reject(err)
    );

    const resId = axios.interceptors.response.use(
      (r) => {
        // optional timing/info logging in dev
        if (import.meta.env.DEV && r?.config?.metadata) {
          const start = r.config.metadata.start;
          const dur = start ? Date.now() - start : null;
          if (dur != null) console.debug(`API ${r.config.method} ${r.config.url} ${dur}ms`);
        }
        return r;
      },
      async (err) => {
        // If 401 -> try refresh once then retry original
        const original = err.config || {};
        if (err.response && err.response.status === 401 && !original._retry) {
          original._retry = true;
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            const newToken = localStorage.getItem(STORAGE.TOKEN);
            if (newToken) original.headers.Authorization = `Bearer ${newToken}`;
            return axios(original);
          }
        }
        return Promise.reject(err);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
    };
  }, [refreshAccessToken]);

  /* ------------------------------
     Auth operations: login, register, logout, switch org
     ------------------------------ */
  const login = useCallback(
    async (email, password, remember = false) => {
      setIsLoading(true);
      try {
        const res = await axios.post("/auth/login", {
          email: (email || "").toString().trim().toLowerCase(),
          password,
        });
        const data = res?.data || {};
        const access = data.access_token || data.token || data.accessToken;
        const refresh = data.refresh_token || data.refreshToken;
        const user = data.user || data;
        if (!access) throw new Error("No access token returned from login");
        persistTokens(access, refresh || null, data.expires_at || null);
        if (user) {
          setCurrentUser(user);
          try {
            localStorage.setItem(STORAGE.USER, JSON.stringify(user));
          } catch {}
        }
        scheduleTokenRefresh(access);
        setAuthError(null);
        return { ok: true, user };
      } catch (err) {
        handleAuthError(err);
        return { ok: false, error: err?.response?.data || err?.message || String(err) };
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    },
    [persistTokens, scheduleTokenRefresh, handleAuthError]
  );

  const register = useCallback(async (payload) => {
    setIsLoading(true);
    try {
      const res = await axios.post("/auth/register", payload);
      const data = res?.data || {};
      // Some APIs return tokens immediately on register
      const access = data.access_token || data.token || data.accessToken;
      const refresh = data.refresh_token || data.refreshToken;
      if (access) persistTokens(access, refresh || null, data.expires_at || null);
      if (data.user) {
        setCurrentUser(data.user);
        try {
          localStorage.setItem(STORAGE.USER, JSON.stringify(data.user));
        } catch {}
      }
      return { ok: true, user: data.user || null };
    } catch (err) {
      handleAuthError(err);
      return { ok: false, error: err?.response?.data || err?.message || String(err) };
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [persistTokens, handleAuthError]);

  const logout = useCallback((message) => {
    clearAllAuth();
    if (message && import.meta.env.DEV) console.info("Logout:", message);
    // Don't navigate here; allow callers to navigate. This avoids router issues during SSR/hydration.
  }, [clearAllAuth]);

  const switchOrganization = useCallback(
    (org) => {
      if (!org || !org.id) {
        console.warn("switchOrganization requires organization object with id");
        return;
      }
      setCurrentOrganization(org);
      try {
        localStorage.setItem(STORAGE.ORG, JSON.stringify(org));
      } catch {}
      // Optionally call backend to get org-scoped token (if API supports)
      // This method is intentionally simple so callers can implement server switch logic when needed.
    },
    []
  );

  /* ------------------------------
     Permission & role helpers
     ------------------------------ */
  const hasPermission = useCallback(
    (permission) => {
      const perms = claims?.permissions || claims?.perms || [];
      if (!perms || !Array.isArray(perms)) return false;
      if (perms.includes("*")) return true;
      if (!permission) return false;
      if (perms.includes(permission)) return true;
      // support resource:* wildcard
      const [res] = permission.split(":");
      if (perms.includes(`${res}:*`)) return true;
      return false;
    },
    [claims]
  );

  const hasRole = useCallback(
    (role) => {
      const myRole = claims?.role || (currentUser && currentUser.role) || "guest";
      const myLevel = ROLE_HIERARCHY[myRole] || ROLE_HIERARCHY.guest;
      const reqLevel = ROLE_HIERARCHY[role] || ROLE_HIERARCHY.guest;
      return myLevel >= reqLevel;
    },
    [claims, currentUser]
  );

  /* ------------------------------
     Context value & rendering
     ------------------------------ */
  const authValue = useMemo(
    () => ({
      // state
      currentUser,
      token,
      refreshToken,
      claims,
      currentOrganization,
      isLoading,
      isRefreshing,
      authError,

      // actions
      login,
      register,
      logout,
      refreshAccessToken,
      switchOrganization,
      setCurrentOrganization: switchOrganization,

      // helpers
      hasPermission,
      hasRole,
      axios,
      apiBase: API_V1,

      // debug
      _debug: {
        tokenExpiresAt: localStorage.getItem(STORAGE.TOKEN_EXPIRY),
      },
    }),
    [
      currentUser,
      token,
      refreshToken,
      claims,
      currentOrganization,
      isLoading,
      isRefreshing,
      authError,
      login,
      register,
      logout,
      refreshAccessToken,
      switchOrganization,
      hasPermission,
      hasRole,
    ]
  );

  // Render fallback while loading initial auth state to avoid UI mismatch/white screen
  if (isLoading) {
    return null; // App-level loading handled by your App (you already show loading in AuthProvider usage)
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/* ------------------------------
   Hook: useAuth
   ------------------------------ */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

/* ------------------------------
   OrganizationProvider & useOrganization
   ------------------------------
   We provide this wrapper to match imports in the rest of the app
   (App.jsx imports OrganizationProvider and useOrganization).
*/
export const OrganizationProvider = ({ children }) => {
  const auth = useAuth();
  const value = useMemo(
    () => ({
      currentOrganization: auth.currentOrganization,
      updateCurrentOrganization: auth.switchOrganization,
      organizations: auth.currentUser?.orgs || [],
      isLoading: auth.isLoading,
      hasMultipleOrganizations: (auth.currentUser?.orgs || []).length > 1,
    }),
    [auth]
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};

OrganizationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useOrganization = () => {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    // To avoid hard crash (and match earlier failures) return a safe fallback
    // This helps build succeed even if provider wiring is wrong; encourage correct usage.
    console.warn("useOrganization used outside OrganizationProvider - returning safe fallback");
    return {
      currentOrganization: null,
      updateCurrentOrganization: () => {},
      organizations: [],
      isLoading: false,
      hasMultipleOrganizations: false,
    };
  }
  return ctx;
};

/* ------------------------------
   Default export (optional)
   ------------------------------ */
export default AuthProvider;
