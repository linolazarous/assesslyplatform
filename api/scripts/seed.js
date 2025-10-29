// api/scripts/seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@assessly.com' });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      await mongoose.connection.close();
      return;
    }

    // Create admin user
    const admin = new User({
      name: 'System Administrator',
      email: 'admin@assessly.com',
      password: process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeThis123!', // Secure default
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Admin user created:', admin.email);

    // Create default organization for admin
    const organization = new Organization({
      name: 'Assessly Headquarters',
      slug: 'assessly-hq',
      owner: admin._id,
      subscription: {
        plan: 'enterprise',
        status: 'active'
      }
    });

    await organization.save();
    console.log('✅ Default organization created');

    // Update admin with organization
    admin.organization = organization._id;
    await admin.save();

    console.log('🎉 Database seeding completed successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;
