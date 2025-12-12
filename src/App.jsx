import React, { useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import GlobalProvider from "./context/GlobalProvider";
import GlobalErrorHandler from "./components/ErrorBoundary/GlobalErrorHandler";

import HomeLayout from "./components/Layouts/HomeLayout";
import DashboardLayout from "./components/Layouts/DashboardLayout";

import PublicRoute from "./components/Routes/PublicRoute";
import PrivateRoute from "./components/Routes/PrivateRoute";

import TokenManager from "./utils/TokenManager";

// Lazy pages
const LandingPage = React.lazy(() => import("./pages/Landing/LandingPage"));
const LoginPage = React.lazy(() => import("./pages/Auth/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/Auth/RegisterPage"));
const DashboardHome = React.lazy(() => import("./pages/Dashboard/DashboardHome"));
const NotFound = React.lazy(() => import("./pages/NotFound/NotFound"));

const SuspenseFallback = () => (
  <div style={{ padding: "20px", textAlign: "center" }}>
    <p>Loading...</p>
  </div>
);

export default function App() {
  // Background token check (non-blocking, non-redirecting)
  useEffect(() => {
    const interval = setInterval(() => {
      const token = TokenManager.getToken();
      if (token && TokenManager.isTokenExpired()) {
        TokenManager.clearAll();
        // No redirect → let protected components handle it
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <GlobalProvider>
      <GlobalErrorHandler>
        <Router>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>

              {/* Public Landing Page */}
              <Route element={<HomeLayout />}>
                <Route path="/" element={<LandingPage />} />
              </Route>

              {/* Public Auth Pages */}
              <Route
                path="/auth/*"
                element={
                  <PublicRoute restricted>
                    <Routes>
                      <Route path="login" element={<LoginPage />} />
                      <Route path="register" element={<RegisterPage />} />
                    </Routes>
                  </PublicRoute>
                }
              />

              {/* Private Dashboard Pages */}
              <Route
                path="/dashboard/*"
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<DashboardHome />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />

            </Routes>
          </Suspense>
        </Router>

        <Toaster position="top-right" />
      </GlobalErrorHandler>
    </GlobalProvider>
  );
}
