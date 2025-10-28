import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Minimal components for testing
function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Home Page - Working!</h1>
      <nav>
        <Link to="/dashboard" style={{ marginRight: '10px' }}>Dashboard</Link>
        <Link to="/create">Create</Link>
      </nav>
    </div>
  );
}

function Dashboard() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard Page - Different Content!</h1>
      <p>If you see this, routing is working.</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

function Create() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Create Assessment Page</h1>
      <p>Another different page.</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

function MinimalApp() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create" element={<Create />} />
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default MinimalApp;
