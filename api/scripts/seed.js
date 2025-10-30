// api/scripts/seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import slugify from 'slugify';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Use MONGODB_URI instead of MONGO_URI to match your environment variable
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@assessly.com' });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      await mongoose.connection.close();
      return;
    }

    // Create admin user with environment variable for password
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
    if (!adminPassword) {
      console.error('❌ ADMIN_DEFAULT_PASSWORD environment variable is required');
      process.exit(1);
    }

    const admin = new User({
      name: 'System Administrator',
      email: 'admin@assessly.com',
      password: adminPassword,
      role: 'admin',
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin user created:', admin.email);

    // Create default organization for admin - FIXED: Provide initial slug
    const organization = new Organization({
      name: 'Assessly Headquarters',
      slug: 'assessly-headquarters', // ADDED: Initial slug to pass validation
      description: 'Default organization for system administrator',
      owner: admin._id,
      subscription: {
        plan: 'enterprise',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      }
    });

    await organization.save();
    console.log('✅ Default organization created:', organization.name);

    // Update admin with organization
    admin.organization = organization._id;
    await admin.save();

    console.log('🎉 Database seeding completed successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Enhanced version with more options
const seedDatabaseWithOptions = async (options = {}) => {
  const {
    adminEmail = 'admin@assessly.com',
    adminName = 'System Administrator',
    organizationName = 'Assessly Headquarters',
    plan = 'enterprise'
  } = options;

  try {
    console.log('🌱 Starting database seeding with options...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin && !options.force) {
      console.log(`ℹ️  Admin user ${adminEmail} already exists. Use force: true to overwrite.`);
      await mongoose.connection.close();
      return;
    }

    // Delete existing admin if force mode
    if (existingAdmin && options.force) {
      await User.deleteOne({ email: adminEmail });
      console.log(`🗑️  Removed existing admin: ${adminEmail}`);
    }

    // Create admin user
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
    if (!adminPassword) {
      console.error('❌ ADMIN_DEFAULT_PASSWORD environment variable is required');
      process.exit(1);
    }

    const admin = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isActive: true
    });

    await admin.save();
    console.log(`✅ Admin user created: ${admin.email}`);

    // Create organization - FIXED: Provide initial slug
    const organization = new Organization({
      name: organizationName,
      slug: slugify(organizationName, { lower: true, strict: true }), // ADDED: Generate slug
      description: `Default organization for ${adminName}`,
      owner: admin._id,
      subscription: {
        plan: plan,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    await organization.save();
    console.log(`✅ Organization created: ${organization.name}`);

    // Update admin with organization
    admin.organization = organization._id;
    await admin.save();

    console.log('🎉 Database seeding completed successfully');
    
    return { admin, organization };
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Test data seeding function
const seedTestData = async () => {
  try {
    console.log('🧪 Seeding test data...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Create test users
    const testUsers = [
      {
        name: 'Test Manager',
        email: 'manager@assessly.com',
        password: process.env.TEST_USER_PASSWORD || 'Test123!',
        role: 'manager',
        isActive: true
      },
      {
        name: 'Test Candidate',
        email: 'candidate@assessly.com',
        password: process.env.TEST_USER_PASSWORD || 'Test123!',
        role: 'candidate',
        isActive: true
      }
    ];

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Test user created: ${user.email}`);
      } else {
        console.log(`ℹ️  Test user already exists: ${userData.email}`);
      }
    }

    console.log('🎉 Test data seeding completed');
  } catch (error) {
    console.error('❌ Test data seeding failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test-data')) {
    seedTestData();
  } else if (args.includes('--force')) {
    seedDatabaseWithOptions({ force: true });
  } else if (args.includes('--help')) {
    console.log(`
Usage: node seed.js [options]

Options:
  --help          Show this help message
  --force         Force recreation of admin user if exists
  --test-data     Seed test users (manager, candidate)
  --email         Custom admin email (default: admin@assessly.com)
  --name          Custom admin name (default: System Administrator)
  --org           Custom organization name (default: Assessly Headquarters)
  --plan          Subscription plan (default: enterprise)

Examples:
  node seed.js                                  # Basic seeding
  node seed.js --force                         # Force recreate admin
  node seed.js --test-data                     # Seed test users
  node seed.js --email custom@admin.com --name "Custom Admin"
    `);
  } else {
    // Parse custom options
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (args[i] === '--email') options.adminEmail = args[i + 1];
      if (args[i] === '--name') options.adminName = args[i + 1];
      if (args[i] === '--org') options.organizationName = args[i + 1];
      if (args[i] === '--plan') options.plan = args[i + 1];
    }
    
    seedDatabaseWithOptions(options);
  }
}

export { seedDatabase, seedDatabaseWithOptions, seedTestData };
export default seedDatabase;
