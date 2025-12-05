import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import chalk from 'chalk';

import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import Organization from '../models/Organization.js';
import mailer from '../utils/mailer.js';
import { EmailTemplates } from '../utils/mailer.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXP = process.env.ACCESS_TOKEN_EXP || '15m';
const REFRESH_TOKEN_EXP = process.env.REFRESH_TOKEN_EXP || '30d';
const REFRESH_TOKEN_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'assessly_refresh_token';
const FRONTEND_URL = process.env.FRONTEND_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error(chalk.red('❌ JWT secrets not configured'));
  if (NODE_ENV === 'production') throw new Error('JWT_SECRET and JWT_REFRESH_SECRET are required');
}

/* ---------- Utility Functions ---------- */

function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

function getClientDevice(req) {
  const userAgent = req.get('User-Agent') || '';
  let type = 'unknown';
  if (/mobile/i.test(userAgent)) type = 'mobile';
  else if (/tablet/i.test(userAgent)) type = 'tablet';
  else if (/desktop|windows|macintosh|linux/i.test(userAgent)) type = 'desktop';
  return { userAgent, type, ip: getClientIp(req) };
}

function generateAccessToken(user) {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    organization: user.organization?.toString(),
    permissions: user.permissions
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP, issuer: 'assessly-platform', audience: 'assessly-users' });
}

function generateRefreshToken(user) {
  const payload = { id: user._id.toString(), version: user.security?.passwordChangedAt?.getTime() || 1 };
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXP, issuer: 'assessly-platform', audience: 'assessly-users' });
}

function getCookieOptions(req) {
  const isProd = NODE_ENV === 'production';
  const secure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isProd && secure,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    domain: isProd ? new URL(FRONTEND_URL).hostname : undefined
  };
}

function validatePassword(password) {
  const minLength = 8;
  if (!password || password.length < minLength) return { isValid: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { isValid: false, message: 'Password must contain an uppercase letter' };
  if (!/[a-z]/.test(password)) return { isValid: false, message: 'Password must contain a lowercase letter' };
  if (!/\d/.test(password)) return { isValid: false, message: 'Password must contain a number' };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { isValid: false, message: 'Password must contain a special character' };
  return { isValid: true };
}

async function logAuthActivity(user, action, metadata = {}) {
  try { console.log(chalk.blue(`🔐 Auth Activity: ${user.email} - ${action}`), { userId: user._id, organization: user.organization, ...metadata }); }
  catch (error) { console.error(chalk.red('Failed to log auth activity:'), error); }
}

/* ---------- Controllers ---------- */

export async function register(req, res) {
  const session = await User.startSession();
  try {
    await session.startTransaction();
    const { name, email, password, organizationName, timezone='UTC', language='en' } = req.body;
    if (!name || !email || !password || !organizationName) throw new Error('Missing required fields');

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) throw new Error(passwordValidation.message);

    const existingUser = await User.findOne({ email: email.toLowerCase() }).session(session);
    if (existingUser) return res.status(409).json({ success:false, message:'Email already exists' });

    const organization = await new Organization({
      name: organizationName.trim(),
      description:`Organization for ${name.trim()}`,
      owner:null,
      settings:{ allowSelfRegistration:true, allowGoogleOAuth:true, allowEmailPassword:true },
      subscription:{ plan:'free', status:'active' }
    }).save({ session });

    const user = await new User({
      name:name.trim(), email:email.toLowerCase(), password,
      organization:organization._id, role:'org_admin',
      preferences:{ language, timezone },
      metadata:{ signupSource:'direct', timezone, locale:language }
    }).save({ session });

    organization.owner = user._id;
    organization.members.push({ user:user._id, role:'org_admin', joinedAt:new Date() });
    await organization.save({ session });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const deviceInfo = getClientDevice(req);
    await new RefreshToken({
      user:user._id, organization:user.organization, token:refreshToken,
      expires:new Date(Date.now()+30*24*60*60*1000),
      device:{ name:deviceInfo.userAgent.substring(0,100), type:deviceInfo.type, userAgent:deviceInfo.userAgent },
      location:{ ip:deviceInfo.ip },
      security:{ fingerprint:crypto.createHash('md5').update(deviceInfo.userAgent).digest('hex') }
    }).save({ session });

    try { await mailer.sendMail({ to:user.email, ...EmailTemplates.welcome({ name:user.name, dashboardUrl:`${FRONTEND_URL}/dashboard`, supportEmail:'assesslyinc@gmail.com' }) }); } 
    catch(e){ console.warn(chalk.yellow('Welcome email failed'), e.message); }

    await session.commitTransaction();
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getCookieOptions(req));
    await logAuthActivity(user,'registration',{ organization:organization._id, device:deviceInfo });

    res.status(201).json({ success:true, message:'Account created', data:{ user:user.toJSON(), organization:{ id:organization._id, name:organization.name, slug:organization.slug }, accessToken, expiresIn:ACCESS_TOKEN_EXP } });
  } catch (error) {
    await session.abortTransaction();
    console.error(chalk.red('❌ Registration error:'), error);
    res.status(500).json({ success:false, message:error.message || 'Registration failed' });
  } finally { session.endSession(); }
}

export async function login(req,res){
  try {
    const { email,password }=req.body;
    if(!email||!password) return res.status(400).json({ success:false, message:'Email and password required' });

    const user=await User.findOne({ email:email.toLowerCase() }).select('+password +security +isActive').populate('organization','name slug settings');
    if(!user) return res.status(401).json({ success:false, message:'Invalid email or password' });
    if(!user.isActive) return res.status(403).json({ success:false, message:'Account deactivated' });
    if(user.isLocked) return res.status(423).json({ success:false, message:'Account locked' });

    if(!await user.comparePassword(password)) { await user.incrementLoginAttempts(); return res.status(401).json({ success:false, message:'Invalid email or password' }); }
    await user.resetLoginAttempts();

    user.lastLogin=new Date(); user.lastActivity=new Date(); user.loginCount=(user.loginCount||0)+1; await user.save();

    const accessToken=generateAccessToken(user);
    const refreshToken=generateRefreshToken(user);
    const deviceInfo=getClientDevice(req);

    await new RefreshToken({
      user:user._id, organization:user.organization, token:refreshToken,
      expires:new Date(Date.now()+30*24*60*60*1000),
      device:{ name:deviceInfo.userAgent.substring(0,100), type:deviceInfo.type, userAgent:deviceInfo.userAgent },
      location:{ ip:deviceInfo.ip },
      security:{ fingerprint:crypto.createHash('md5').update(deviceInfo.userAgent).digest('hex') }
    }).save();

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getCookieOptions(req));
    await logAuthActivity(user,'login',{ device:deviceInfo });

    res.json({ success:true, message:'Login successful', data:{ user:user.toJSON(), organization:user.organization, accessToken, expiresIn:ACCESS_TOKEN_EXP } });
  } catch(e){ console.error(chalk.red('❌ Login error:'),e); res.status(500).json({ success:false,message:'Login failed' }); }
}

export async function refreshToken(req,res){
  try {
    const token=req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]||req.body.refreshToken;
    if(!token) return res.status(401).json({ success:false, message:'Refresh token required' });

    let decoded;
    try{ decoded=jwt.verify(token,JWT_REFRESH_SECRET); } catch{ return res.status(401).json({ success:false,message:'Invalid or expired refresh token' }); }

    const user=await User.findById(decoded.id).select('+security').populate('organization','name slug settings');
    if(!user||!user.isActive) return res.status(401).json({ success:false,message:'User not found or inactive' });
    if(user.changedPasswordAfter(decoded.iat)) return res.status(401).json({ success:false,message:'Password changed. Please login again.' });

    const newAccessToken=generateAccessToken(user);
    const newRefreshToken=generateRefreshToken(user);
    const deviceInfo=getClientDevice(req);

    await RefreshToken.findOneAndUpdate({ token }, { $set:{ replacedByToken:newRefreshToken, revokedAt:new Date(), reasonRevoked:'refreshed', revokedByIp:deviceInfo.ip } });
    await new RefreshToken({ user:user._id, organization:user.organization, token:newRefreshToken, expires:new Date(Date.now()+30*24*60*60*1000), device:{ name:deviceInfo.userAgent.substring(0,100), type:deviceInfo.type, userAgent:deviceInfo.userAgent }, location:{ ip:deviceInfo.ip }, security:{ fingerprint:crypto.createHash('md5').update(deviceInfo.userAgent).digest('hex') } }).save();

    res.cookie(REFRESH_TOKEN_COOKIE_NAME,newRefreshToken,getCookieOptions(req));
    res.json({ success:true,message:'Token refreshed', data:{ accessToken:newAccessToken, expiresIn:ACCESS_TOKEN_EXP } });
  } catch(e){ console.error(chalk.red('❌ Refresh token error:'),e); res.status(500).json({ success:false,message:'Failed to refresh token' }); }
}

export async function logout(req,res){
  try {
    const token=req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]||req.body.refreshToken;
    const deviceInfo=getClientDevice(req);

    if(token) await RefreshToken.findOneAndUpdate({ token }, { $set:{ revokedAt:new Date(), reasonRevoked:'logout', revokedByIp:deviceInfo.ip } });
    if(req.user?.id) await logAuthActivity({ _id:req.user.id, email:req.user.email },'logout',{ device:deviceInfo });

    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME,{ path:'/api/v1/auth', httpOnly:true, secure:NODE_ENV==='production', sameSite:NODE_ENV==='production'?'none':'lax' });
    res.json({ success:true,message:'Logged out successfully' });
  } catch(e){ console.error(chalk.red('❌ Logout error:'),e); res.status(500).json({ success:false,message:'Logout failed' }); }
}

export async function profile(req,res){
  try {
    const user=await User.findById(req.user.id).populate('organization','name slug settings subscription').select('-security -__v');
    if(!user) return res.status(404).json({ success:false,message:'User not found' });
    res.json({ success:true,data:{ user:user.toJSON() } });
  } catch(e){ console.error(chalk.red('❌ Profile error:'),e); res.status(500).json({ success:false,message:'Failed to get profile' }); }
}

export async function updateProfile(req,res){
  try {
    const { name, preferences, profile }=req.body;
    const updateData={};
    if(name?.trim()) updateData.name=name.trim();
    if(preferences) updateData.preferences=preferences;
    if(profile) updateData.profile=profile;

    const user=await User.findByIdAndUpdate(req.user.id,{$set:updateData},{ new:true, runValidators:true }).populate('organization','name slug settings').select('-security -__v');
    if(!user) return res.status(404).json({ success:false,message:'User not found' });
    res.json({ success:true,message:'Profile updated', data:{ user:user.toJSON() } });
  } catch(e){ console.error(chalk.red('❌ Update profile error:'),e); res.status(500).json({ success:false,message:'Failed to update profile' }); }
}

export async function changePassword(req,res){
  try {
    const { currentPassword,newPassword }=req.body;
    if(!currentPassword||!newPassword) return res.status(400).json({ success:false,message:'Current and new password required' });
    const passwordValidation=validatePassword(newPassword);
    if(!passwordValidation.isValid) return res.status(400).json({ success:false,message:passwordValidation.message });

    const user=await User.findById(req.user.id).select('+password +security');
    if(!user) return res.status(404).json({ success:false,message:'User not found' });
    if(!await user.comparePassword(currentPassword)) return res.status(401).json({ success:false,message:'Current password incorrect' });

    user.password=newPassword; await user.save();
    await RefreshToken.revokeAllForUser(user.organization,user._id,'password_change',user._id);
    await logAuthActivity(user,'password_change');
    res.json({ success:true,message:'Password changed successfully' });
  } catch(e){ console.error(chalk.red('❌ Change password error:'),e); res.status(500).json({ success:false,message:'Failed to change password' }); }
}

export default { register, login, refreshToken, logout, profile, updateProfile, changePassword };
