import React, { Suspense, lazy, useState, useMemo, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, CircularProgress, Snackbar, Alert } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import { getAppTheme } from "./styles/theme";
import LoadingScreen from "./components/ui/LoadingScreen";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./ErrorBoundary";

/* -------------------------
   Lazy import with retry
   ------------------------- */
const lazyWithRetry = (importFn, retries = 2, interval = 1200) =>
  lazy(async () => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await importFn();
      } catch (err) {
        lastErr = err;
        if (attempt === retries) throw lastErr;
        await new Promise((r) => setTimeout(r, interval));
      }
    }
    throw lastErr;
  });

/* -------------------------
   Route-level lazy imports
   ------------------------- */
const AssessmentDashboard = lazyWithRetry(() => import("./components/AssessmentDashboard"));
const CreateAssessment = lazyWithRetry(() => import("./components/CreateAssessment"));
const TakeAssessment = lazyWithRetry(() => import("./components/TakeAssessment"));
const PdfReport = lazyWithRetry(() => import("./components/PdfReport"));
const AuthPage = lazyWithRetry(() => import("./pages/Auth"));
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage"));
const BillingPage = lazyWithRetry(() => import("./pages/Billing"));
const AdminDashboard = lazyWithRetry(() => import("./pages/Admin/Dashboard"));
const PricingPage = lazyWithRetry(() => import("./pages/Pricing"));
const ContactPage = lazyWithRetry(() => import("./pages/Contact"));

/* -------------------------
   Theme hook with local persistence
   ------------------------- */
const useThemeMode = () => {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("darkMode") || "false");
    } catch {
      return false;
    }
  });

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("darkMode", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const theme = useMemo(() => getAppTheme(darkMode ? "dark" : "light"), [darkMode]);
  return { theme, darkMode, toggleDarkMode };
};

/* -------------------------
   Minimal loading skeleton used in production branches
   ------------------------- */
const ProductionLoading = React.memo(function ProductionLoading() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <CircularProgress size={40} />
    </Box>
  );
});

/* -------------------------
   App component
   ------------------------- */
export default function App() {
  const { theme, darkMode, toggleDarkMode } = useThemeMode();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setSnackbar({ open: true, message: "You're back online!", severity: "success" });
    };
    const onOffline = () => {
      setIsOnline(false);
      setSnackbar({ open: true, message: "Offline mode: Some features unavailable.", severity: "warning" });
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <Suspense fallback={<LoadingScreen fullScreen />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/contact" element={<ContactPage />} />

                {/* Auth */}
                <Route
                  path="/auth/*"
                  element={
                    <AuthLayout darkMode={darkMode}>
                      <AuthPage />
                    </AuthLayout>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <AuthLayout darkMode={darkMode}>
                      <AuthPage />
                    </AuthLayout>
                  }
                />

                {/* Protected app routes */}
                {[
                  { path: "/dashboard", component: AssessmentDashboard },
                  { path: "/create", component: CreateAssessment },
                  { path: "/take/:id", component: TakeAssessment },
                  { path: "/report/:id", component: PdfReport },
                  { path: "/billing", component: BillingPage },
                  { path: "/admin", component: AdminDashboard, roles: ["admin"] },
                ].map(({ path, component: Component, roles }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <MainLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                        <ProtectedRoute roles={roles}>
                          <Suspense fallback={<ProductionLoading />}>
                            <Component />
                          </Suspense>
                        </ProtectedRoute>
                      </MainLayout>
                    }
                  />
                ))}

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>

            {/* Snackbar */}
            <Snackbar
              open={snackbar.open}
              autoHideDuration={4000}
              onClose={handleSnackbarClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
              <Alert severity={snackbar.severity} onClose={handleSnackbarClose}>
                {snackbar.message}
              </Alert>
            </Snackbar>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
