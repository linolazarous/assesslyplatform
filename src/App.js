// src/App.js
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, CircularProgress, Box } from "@mui/material";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Pages
import LandingScreen from "./pages/Landing/LandingScreen";
import Dashboard from "./pages/Admin/Dashboard";
import Billing from "./pages/Billing";
import SearchPage from "./pages/SearchPage";
import LandingPage from "./pages/LandingPage";

/**
 * Simple route guard to protect private routes (Dashboard, Billing)
 */
const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) return <Navigate to="/" replace />;
  return children;
};

/**
 * Root Application Component
 */
function App() {
  useEffect(() => {
    document.title = "Assessly | Modern Assessment Platform";
  }, []);

  return (
    <AuthProvider>
      <Router>
        <CssBaseline />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingScreen />} />
          <Route path="/home" element={<LandingPage />} />

          {/* Search Page (public or limited access) */}
          <Route path="/search" element={<SearchPage />} />

          {/* Private Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/organization/:orgId/billing"
            element={
              <PrivateRoute>
                <Billing />
              </PrivateRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
