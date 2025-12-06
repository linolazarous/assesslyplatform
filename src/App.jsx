// src/App.jsx
import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline, Snackbar, Alert } from "@mui/material";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingScreen from "./components/common/LoadingScreen";

// Auth context
import { AuthProvider } from "./context/AuthContext";

// Theme hook + theme
import { useThemeMode } from "./hooks/useThemeMode";

// Lazy loaded pages
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const PricingPage = React.lazy(() => import("./pages/Pricing"));
const ContactPage = React.lazy(() => import("./pages/Contact"));
const Login = React.lazy(() => import("./pages/auth/Login"));
const Register = React.lazy(() => import("./pages/auth/Register"));
const DashboardLayout = React.lazy(() => import("./layouts/DashboardLayout"));
const AdminDashboard = React.lazy(() => import("./pages/dashboard/AdminDashboard"));
const NotFound = React.lazy(() => import("./pages/errors/NotFound"));

export default function App() {
  const { theme } = useThemeMode();

  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Global App Error listener
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
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/contact" element={<ContactPage />} />

                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<AdminDashboard />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>

            {/* Global Snackbar */}
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
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

