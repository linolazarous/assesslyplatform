import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles"; // Import ThemeProvider

// Contexts & Layouts
import { AuthProvider } from "./contexts/AuthContext.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";
import { getAppTheme } from "./styles/theme.jsx"; // Import theme factory
import LoadingScreen from "./components/ui/LoadingScreen.jsx"; // Assuming path and name
import ProtectedRoute from "./components/common/ProtectedRoute.jsx"; // FIX: Alias path

// Lazy-loaded components (MUST use relative paths or defined aliases)
// Assuming root alias `@` is defined in vite.config.js as "@/src"
const AssessmentDashboard = lazy(() => import("./components/AssessmentDashboard.jsx"));
const CreateAssessment = lazy(() => import("./components/CreateAssessment.jsx"));
const TakeAssessment = lazy(() => import("./components/TakeAssessment.jsx"));
const PdfReport = lazy(() => import("./components/PdfReport.jsx"));
const AuthPage = lazy(() => import("./pages/Auth.jsx")); // Renamed to AuthPage to avoid conflict
const LandingScreen = lazy(() => import("./pages/Landing/LandingScreen.jsx")); // Assuming correct path
const BillingPage = lazy(() => import("./pages/Billing.jsx"));
const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard.jsx"));


// State to manage dark mode (usually handled by a custom hook/context)
const [darkMode, setDarkMode] = React.useState(false);
const toggleDarkMode = () => setDarkMode(prev => !prev);
const theme = getAppTheme(darkMode ? 'dark' : 'light');

function App() {
  return (
    <Router>
      {/* 1. Theme Provider must wrap the entire app */}
      <ThemeProvider theme={theme}>
        {/* 2. Auth Provider provides global user state */}
        <AuthProvider>
          {/* 3. Suspense for handling lazy loading fallback */}
          <Suspense fallback={<LoadingScreen fullScreen />}>
            <Routes>

              {/* Public/Landing Route - Uses MainLayout but without Sidebar */}
              <Route path="/" element={<MainLayout><LandingScreen /></MainLayout>} />
              
              {/* Auth Route - Uses AuthLayout (Centered Box) */}
              <Route path="/auth" element={<AuthLayout><AuthPage /></AuthLayout>} />
              <Route path="/login" element={<AuthLayout><AuthPage /></AuthLayout>} />

              {/* Protected Routes that use the standard Dashboard Layout (Header + Sidebar) */}
              <Route element={<MainLayout toggleDarkMode={toggleDarkMode} />}>
                
                {/* Standard User Routes */}
                <Route
                  path="/dashboard"
                  element={<ProtectedRoute><AssessmentDashboard /></ProtectedRoute>}
                />
                <Route
                  path="/create"
                  element={<ProtectedRoute><CreateAssessment /></ProtectedRoute>}
                />
                <Route
                  path="/take/:id"
                  element={<ProtectedRoute><TakeAssessment /></ProtectedRoute>}
                />
                <Route
                  path="/report/:id"
                  element={<ProtectedRoute><PdfReport /></ProtectedRoute>}
                />
                <Route
                  path="/billing"
                  element={<ProtectedRoute><BillingPage /></ProtectedRoute>}
                />
                
                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>}
                />

                {/* Catch-all route */}
                <Route path="*" element={<div>404 Not Found</div>} />
              </Route>

            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
