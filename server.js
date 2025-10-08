import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, 'dist')));

// Import and use your API routes
// You'll need to adapt these to work with Express

// Example API route structure - you'll need to adapt your existing API routes
app.use('/api/search', async (req, res) => {
  // Adapt your src/pages/api/search.js logic here
  try {
    // Your search API logic
    res.json({ results: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/admin/login', async (req, res) => {
  // Adapt your src/pages/api/admin/login.js logic here
  try {
    // Your login logic
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/organizations', async (req, res) => {
  // Adapt your src/pages/api/organizations/index.js logic here
  try {
    // Your organizations logic
    res.json({ organizations: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle client-side routing - must be after API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
