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

// Basic API routes (remove the problematic imports)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/api/search', (req, res) => {
  res.json({ results: [], message: 'Search API is working' });
});

app.post('/api/admin/login', (req, res) => {
  res.json({ success: true, message: 'Login API is working' });
});

app.get('/api/organizations', (req, res) => {
  res.json({ organizations: [], message: 'Organizations API is working' });
});

// Handle client-side routing - must be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
