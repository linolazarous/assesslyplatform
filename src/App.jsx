// src/App.jsx
import React, { Suspense, lazy, useState, useMemo, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, CircularProgress, Snackbar, Alert } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import { getAppTheme } from "./styles/theme.jsx";
import LoadingScreen from "./components/ui/LoadingScreen.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

/* ============================================================
   ✅ Lazy Import Utility with Retry
============================================================ */
const lazyWithRetry = (importFunc, retries = 2, interval = 1500) =>
  lazy(async () => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await importFunc();
      } catch (err) {
        console.warn(`Lazy load attempt ${attempt + 1} failed. Retrying...`);
        await new Promise((res) => setTimeout(res, interval));
      }
    }
    throw new Error("Component failed to load after multiple retries.");
  });

/* ============================================================
   ✅ Lazy-Loaded Pages
============================================================ */
const AssessmentDashboard = lazyWithRetry(() => import("./components/AssessmentDashboard.jsx"));
const CreateAssessment = lazyWithRetry(() => import("./components/CreateAssessment.jsx"));
const TakeAssessment = lazyWithRetry(() => import("./components/TakeAssessment.jsx"));
const PdfReport = lazyWithRetry(() => import("./components/PdfReport.jsx"));
const AuthPage = lazyWithRetry(() => import("./pages/Auth.jsx"));
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage.jsx"));
const BillingPage = lazyWithRetry(() => import("./pages/Billing.jsx"));
const AdminDashboard = lazyWithRetry(() => import("./pages/Admin/Dashboard.jsx"));
const PricingPage = lazyWithRetry(() => import("./pages/Pricing.jsx"));
const ContactPage = lazyWithRetry(() => import("./pages/Contact.jsx"));

/* ============================================================
   ✅ Custom Theme Hook with Local Persistence
============================================================ */
const useThemeMode = () => {
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem("darkMode") || "false"));

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("darkMode", JSON.stringify(newMode));
      return newMode;
    });
  };

  const theme = useMemo(() => getAppTheme(darkMode ? "dark" : "light"), [darkMode]);
  return { theme, darkMode, toggleDarkMode };
};

/* ============================================================
   ✅ Layout Wrapper
============================================================ */
const MainLayoutWrapper = ({ darkMode, toggleDarkMode, children }) => (
  <ErrorBoundary>
    <MainLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      {children}
    </MainLayout>
  </ErrorBoundary>
);

/* ============================================================
   ✅ Loading State Component
============================================================ */
const ProductionLoading = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
    <CircularProgress size={42} />
  </Box>
);

/* ============================================================
   ✅ Main Application Component
============================================================ */
export default function App() {
  const { theme, darkMode, toggleDarkMode } = useThemeMode();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSnackbar({ open: true, message: "Back online!", severity: "success" });
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSnackbar({ open: true, message: "You are offline. Some features may not work.", severity: "warning" });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Suspense fallback={<LoadingScreen fullScreen />}>
              <Routes>
                {/* 🌍 Public Pages */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/contact" element={<ContactPage />} />

                {/* 🔑 Auth Pages */}
                {["/auth", "/login"].map((path) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <AuthLayout>
                        <AuthPage />
                      </AuthLayout>
                    }
                  />
                ))}

                {/* 🧠 Protected Pages */}
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
                      <MainLayoutWrapper darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
                        <ProtectedRoute roles={roles}>
                          <Suspense fallback={<ProductionLoading />}>
                            <Component />
                          </Suspense>
                        </ProtectedRoute>
                      </MainLayoutWrapper>
                    }
                  />
                ))}

                {/* 🚫 Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>

            {/* 🔔 Snackbar Notifications */}
            <Snackbar
              open={snackbar.open}
              autoHideDuration={4000}
              onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
              <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
                {snackbar.message}
              </Alert>
            </Snackbar>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
