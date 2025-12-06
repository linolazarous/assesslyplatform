// src/App.jsx
import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline, Snackbar, Alert } from "@mui/material";
import ErrorBoundary from "./ErrorBoundary";
import LoadingScreen from "./components/ui/LoadingScreen";

import { AuthProvider } from "./contexts/AuthContext";

// Theme hook & theme generator
import useThemeMode from "./hooks/useThemeMode";
import createTheme from "./styles/theme";

// Lazy pages
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const PricingPage = React.lazy(() => import("./pages/Pricing"));
const ContactPage = React.lazy(() => import("./pages/Contact"));
const AuthPage = React.lazy(() => import("./pages/Auth"));
const MainLayout = React.lazy(() => import("./layouts/MainLayout")); // Changed from DashboardLayout
const AuthLayout = React.lazy(() => import("./layouts/AuthLayout")); // Added AuthLayout
const AdminDashboard = React.lazy(() => import("./pages/Admin/Dashboard"));
const NotFound = React.lazy(() => import("./pages/errors/NotFound"));

export default function App() {
  const { mode } = useThemeMode();
  const theme = createTheme(mode);

  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const handleSnackbarClose = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    const handleError = (event) => {
      console.error("🚨 Application Error:", event.error);
      setSnackbar({
        open: true,
        severity: "error",
        message: event.error?.message || "Unexpected error occurred!",
      });
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Suspense fallback={<LoadingScreen fullScreen />}>
              <Routes>
                {/* Public Routes with MainLayout */}
                <Route element={<MainLayout />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                </Route>

                {/* Auth Routes with AuthLayout */}
                <Route element={<AuthLayout />}>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/login" element={<AuthPage defaultMode="login" />} />
                  <Route path="/register" element={<AuthPage defaultMode="signup" />} />
                  <Route path="/forgot-password" element={<AuthPage defaultMode="forgot" />} />
                  <Route path="/reset-password" element={<AuthPage defaultMode="reset" />} />
                </Route>

                {/* Protected Dashboard Routes - Use MainLayout or create a DashboardLayout */}
                <Route path="/dashboard" element={<MainLayout />}> {/* Or create a DashboardLayout */}
                  <Route index element={<AdminDashboard />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>

            {/* Snackbar */}
            <Snackbar
              open={snackbar.open}
              autoHideDuration={4000}
              onClose={handleSnackbarClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "center",
              }}
            >
              <Alert
                severity={snackbar.severity}
                onClose={handleSnackbarClose}
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
