// frontend/src/App.jsx
import React from "react";
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

// Navigation Components
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";

// Auth Components
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public Pages with Navigation & Footer */}
          <Route path="/" element={
            <>
              <Navigation />
              <Home />
              <Footer />
            </>
          } />
          
          <Route path="/privacy" element={
            <>
              <Navigation />
              <PrivacyPolicy />
              <Footer />
            </>
          } />
          
          <Route path="/terms" element={
            <>
              <Navigation />
              <TermsOfService />
              <Footer />
            </>
          } />
          
          <Route path="/security" element={
            <>
              <Navigation />
              <SecurityOverview />
              <Footer />
            </>
          } />
          
          <Route path="/gdpr-compliance" element={
            <>
              <Navigation />
              <GDPRCompliance />
              <Footer />
            </>
          } />
          
          <Route path="/soc-2" element={
            <>
              <Navigation />
              <SOC2Info />
              <Footer />
            </>
          } />
          
          {/* Auth Pages (without Navigation & Footer) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Dashboard Pages */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Example of protected routes with additional requirements */}
          <Route 
            path="/dashboard/billing" 
            element={
              <ProtectedRoute requireVerifiedEmail={true}>
                <div className="min-h-screen bg-gray-50">
                  <Navigation />
                  <div className="pt-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <h1 className="text-3xl font-bold text-gray-900 mb-6">Billing & Subscription</h1>
                      <div className="bg-white rounded-lg shadow p-6">
                        <p>Billing page - requires verified email</p>
                      </div>
                    </div>
                  </div>
                  <Footer />
                </div>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/dashboard/advanced-analytics" 
            element={
              <ProtectedRoute requirePlan="professional">
                <div className="min-h-screen bg-gray-50">
                  <Navigation />
                  <div className="pt-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                      <h1 className="text-3xl font-bold text-gray-900 mb-6">Advanced Analytics</h1>
                      <div className="bg-white rounded-lg shadow p-6">
                        <p>Advanced analytics - requires professional plan</p>
                      </div>
                    </div>
                  </div>
                  <Footer />
                </div>
              </ProtectedRoute>
            } 
          />
          
          {/* 404 Fallback */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
                <a 
                  href="/" 
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Go Back Home
                </a>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
