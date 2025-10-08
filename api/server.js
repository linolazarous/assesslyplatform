import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Import API routes
import searchRoutes from './api/search.js';
import adminLoginRoutes from './api/admin/login.js';
import organizationsRoutes from './api/organizations/index.js';

// Use API routes
app.use('/api/search', searchRoutes);
app.use('/api/admin/login', adminLoginRoutes);
app.use('/api/organizations', organizationsRoutes);

// Add billing routes if they exist
// import billingRoutes from './api/billing/index.js';
// app.use('/api/billing', billingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Handle client-side routing - must be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
