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
const AuthPage = React.lazy(() => import("./pages/Auth")); // Import the comprehensive AuthPage
const DashboardLayout = React.lazy(() => import("./layouts/DashboardLayout"));
const AdminDashboard = React.lazy(() =>
  import("./pages/dashboard/AdminDashboard")
);
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
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/contact" element={<ContactPage />} />

                {/* Auth - Single comprehensive page with mode switching */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<AuthPage defaultMode="login" />} />
                <Route path="/register" element={<AuthPage defaultMode="signup" />} />
                <Route path="/forgot-password" element={<AuthPage defaultMode="forgot" />} />
                <Route path="/reset-password" element={<AuthPage defaultMode="reset" />} />

                {/* Protected */}
                <Route path="/dashboard" element={<DashboardLayout />}>
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
