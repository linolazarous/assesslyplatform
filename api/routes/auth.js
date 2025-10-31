// api/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // You'll need to create this model

const router = express.Router();

// JWT Secret - use environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key-for-development';

// ✅ Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // For now, create a simple admin user if none exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create default admin user if no users exist
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        user = await User.create({
          email: 'admin@assessly.com',
          password: hashedPassword,
          role: 'admin',
          name: 'Admin User'
        });
      } else {
        return res.status(401).json({ 
          message: 'Invalid email or password' 
        });
      }
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

// ✅ Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, role = 'assessor', name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        message: 'Email, password, and name are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'User already exists with this email' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      role,
      name
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

// ✅ Get user profile (protected route)
router.get('/profile', async (req, res) => {
  try {
    // This would require authentication middleware
    // For now, return a simple response
    res.json({ 
      message: 'Profile endpoint - authentication required' 
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

export default router;
