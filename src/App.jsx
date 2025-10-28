import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

// Simple loading component
function SimpleLoading() {
  return <div style={{ padding: '20px' }}>Loading...</div>;
}

// Test components
function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Home Page - Testing Components</h1>
      <nav>
        <Link to="/dashboard" style={{ marginRight: '10px' }}>Dashboard</Link>
        <Link to="/create">Create</Link>
      </nav>
    </div>
  );
}

// Test version - gradually add your components
function TestApp() {
  return (
    <Router>
      <Suspense fallback={<SimpleLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          
          {/* Test Dashboard with basic version first */}
          <Route path="/dashboard" element={
            <div style={{ padding: '20px' }}>
              <h1>Dashboard - Basic Version</h1>
              <p>If this works, the issue is in AssessmentDashboard component</p>
              <Link to="/">Back to Home</Link>
            </div>
          } />
          
          {/* Test Create with basic version */}
          <Route path="/create" element={
            <div style={{ padding: '20px' }}>
              <h1>Create - Basic Version</h1>
              <p>If this works, the issue is in CreateAssessment component</p>
              <Link to="/">Back to Home</Link>
            </div>
          } />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default TestApp;
