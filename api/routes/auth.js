// api/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendMail, verificationEmailTemplate, passwordResetEmailTemplate } from '../utils/mailer.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';
const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES || '7d';

// Helper to sign JWT access token
const signAccessToken = (user) => jwt.sign({ userId: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

// -----------------
// Register & send verification
// -----------------
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'candidate' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user = new User({ name, email, password, role, isVerified: false });
    const verificationToken = user.createEmailVerificationToken(); // returns unhashed token
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL || process.env.BACKEND_URL}/auth/verify?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    // send verification email
    try {
      await sendMail({
        to: user.email,
        subject: 'Verify your Assessly account',
        html: verificationEmailTemplate({ name: user.name, verifyUrl })
      });
    } catch (mailErr) {
      console.error('Failed to send verification email:', mailErr);
      // do not fail registration because of email; inform user
      return res.status(201).json({ message: 'User created but verification email failed to send. Contact support.', user: user.toJSON() });
    }

    res.status(201).json({ message: 'Registration successful. Verification email sent.', user: user.toJSON() });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -----------------
// Verify email route (GET)
 // -----------------
router.get('/verify', async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ message: 'Invalid verification link' });

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ email, emailVerificationToken: hashed, emailVerificationExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Verification token is invalid or has expired' });

    user.isVerified = true;
    user.clearEmailVerification();
    await user.save();

    // Optionally auto-login: issue token
    const accessToken = signAccessToken(user);
    res.json({ message: 'Email verified successfully', accessToken, user: user.toJSON() });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -----------------
// Forgot password => send email with reset token
// -----------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found for that email' });

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || process.env.BACKEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your Assessly password',
        html: passwordResetEmailTemplate({ name: user.name, resetUrl })
      });
      res.json({ message: 'Password reset email sent' });
    } catch (mailErr) {
      console.error('Failed to send password reset email:', mailErr);
      user.clearPasswordReset();
      await user.save({ validateBeforeSave: false });
      res.status(500).json({ message: 'Failed to send reset email' });
    }
  } catch (err) {
    console.error('Forgot-password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -----------------
// Reset password (POST) - token in body
// -----------------
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) return res.status(400).json({ message: 'Token, email and new password required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ email, passwordResetToken: hashed, passwordResetExpires: { $gt: Date.now() } }).select('+password');
    if (!user) return res.status(400).json({ message: 'Reset token is invalid or has expired' });

    user.password = password; // pre-save middleware will hash
    user.clearPasswordReset();
    await user.save();

    // Optionally return tokens to auto-login
    const accessToken = signAccessToken(user);
    res.json({ message: 'Password reset successful', accessToken });
  } catch (err) {
    console.error('Reset-password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// -----------------
// LOGIN (ensure verified)
 // -----------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password +isVerified');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // If you require verified accounts to login:
    if (user.isVerified === false) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const accessToken = signAccessToken(user);
    res.json({ message: 'Login successful', accessToken, user: user.toJSON() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
