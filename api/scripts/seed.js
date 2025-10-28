// api/scripts/seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@assessly.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const admin = new User({
      name: 'System Administrator',
      email: 'admin@assessly.com',
      password: 'admin123', // Change this in production!
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Admin user created:', admin.email);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedAdmin();
