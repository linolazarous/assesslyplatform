// frontend/src/App.jsx
import React, { Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";

// Page imports
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

// Legal and Compliance Pages
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import SecurityOverview from "./pages/legal/SecurityOverview";
import GDPRCompliance from "./pages/legal/GDPRCompliance";
import SOC2Info from "./pages/legal/SOC2Info";

// Navigation & Layout Components
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";

// Auth & Protection
import ProtectedRoute from "./components/ProtectedRoute";

// Optional: Loading fallback (shows while chunks are loading)
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading Assessly Platform...</p>
    </div>
  </div>
);

function App() {
  return (
    <React.StrictMode>
      <div className="App min-h-screen flex flex-col">
        <BrowserRouter
          // basename="/app"   // ← Uncomment & change ONLY if deploying under subpath (e.g. yourdomain.com/app/)
          basename="/"         // Default for root deployment (Render Static Site)
        >
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Pages with Navigation & Footer */}
              <Route
                path="/"
                element={
                  <>
                    <Navigation />
                    <main className="flex-grow">
                      <Home />
                    </main>
                    <Footer />
                  </>
                }
              />

              <Route
                path="/privacy"
                element={
                  <>
                    <Navigation />
                    <main className="flex-grow">
                      <PrivacyPolicy />
                    </main>
                    <Footer />
                  </>
                }
              />

              <Route
                path="/terms"
                element={
                  <>
                    <Navigation />
                    <main className="flex-grow">
                      <TermsOfService />
                    </main>
                    <Footer />
                  </>
                }
              />

              <Route
                path="/security"
                element={
                  <>
                    <Navigation />
                    <main className="flex-grow">
                      <SecurityOverview />
                    </main>
                    <Footer />
                  </>
                }
              />

              <Route
                path="/gdpr-compliance"
                element={
                  <>
                    <Navigation />
                    <main className="flex-grow">
                      <GDPRCompliance />
                    </main>
                    <Footer />
                  </>
                }
              />

              <Route
                path="/soc-2"
                element={
                  <>
                    <Navigation />
                    <main className="flex-grow">
                      <SOC2Info />
                    </main>
                    <Footer />
                  </>
                }
              />

              {/* Auth Pages (no Navigation/Footer) */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Dashboard Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Example protected sub-routes */}
              <Route
                path="/dashboard/billing"
                element={
                  <ProtectedRoute requireVerifiedEmail={true}>
                    <div className="min-h-screen bg-gray-50 flex flex-col">
                      <Navigation />
                      <main className="flex-grow pt-16">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                          <h1 className="text-3xl font-bold text-gray-900 mb-6">
                            Billing & Subscription
                          </h1>
                          <div className="bg-white rounded-lg shadow p-6">
                            <p>Billing page - requires verified email</p>
                          </div>
                        </div>
                      </main>
                      <Footer />
                    </div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/advanced-analytics"
                element={
                  <ProtectedRoute requirePlan="professional">
                    <div className="min-h-screen bg-gray-50 flex flex-col">
                      <Navigation />
                      <main className="flex-grow pt-16">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                          <h1 className="text-3xl font-bold text-gray-900 mb-6">
                            Advanced Analytics
                          </h1>
                          <div className="bg-white rounded-lg shadow p-6">
                            <p>Advanced analytics - requires professional plan</p>
                          </div>
                        </div>
                      </main>
                      <Footer />
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* Catch-all 404 */}
              <Route
                path="*"
                element={
                  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
                    <div className="text-center px-4">
                      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        404 - Page Not Found
                      </h1>
                      <p className="text-lg text-gray-600 mb-8">
                        The page you're looking for doesn't exist.
                      </p>
                      <a
                        href="/"
                        className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg"
                      >
                        Go Back Home
                      </a>
                    </div>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster position="top-right" richColors />
      </div>
    </React.StrictMode>
  );
}

export default App;
