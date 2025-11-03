// api/scripts/seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import slugify from 'slugify';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Assessment from '../models/Assessment.js';
import Subscription from '../models/Subscription.js';

dotenv.config();

// Configuration constants
const CONFIG = {
  DEFAULT_ADMIN: {
    email: 'admin@assessly.com',
    name: 'System Administrator',
    password: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!',
    role: 'admin'
  },
  DEFAULT_ORGANIZATION: {
    name: 'Assessly Headquarters',
    description: 'Default organization for system administration',
    plan: 'enterprise'
  },
  TEST_USERS: [
    {
      name: 'Test Manager',
      email: 'manager@assessly.com',
      password: process.env.TEST_USER_PASSWORD || 'Test123!',
      role: 'manager'
    },
    {
      name: 'Test Assessor',
      email: 'assessor@assessly.com', 
      password: process.env.TEST_USER_PASSWORD || 'Test123!',
      role: 'assessor'
    },
    {
      name: 'Test Candidate',
      email: 'candidate@assessly.com',
      password: process.env.TEST_USER_PASSWORD || 'Test123!',
      role: 'candidate'
    }
  ],
  SAMPLE_ASSESSMENT: {
    title: 'Sample Technical Assessment',
    description: 'A sample assessment to demonstrate the platform capabilities',
    category: 'Technical',
    tags: ['programming', 'javascript', 'nodejs'],
    status: 'active'
  }
};

class DatabaseSeeder {
  constructor() {
    this.connection = null;
    this.stats = {
      users: 0,
      organizations: 0,
      assessments: 0,
      subscriptions: 0
    };
  }

  async connect() {
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI environment variable is required');
    }

    this.connection = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB database');
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up existing seed data...');
    
    // Only clean up seed data, not production data
    await User.deleteMany({ 
      email: { 
        $in: [
          CONFIG.DEFAULT_ADMIN.email,
          ...CONFIG.TEST_USERS.map(user => user.email)
        ]
      }
    });
    
    await Organization.deleteMany({ 
      name: CONFIG.DEFAULT_ORGANIZATION.name 
    });
    
    await Assessment.deleteMany({ 
      title: CONFIG.SAMPLE_ASSESSMENT.title 
    });

    console.log('✅ Cleanup completed');
  }

  async createAdminUser(options = {}) {
    const adminConfig = { ...CONFIG.DEFAULT_ADMIN, ...options };
    
    if (!adminConfig.password) {
      throw new Error('❌ Admin password is required. Set ADMIN_DEFAULT_PASSWORD environment variable.');
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminConfig.email });
    if (existingAdmin) {
      console.log(`ℹ️  Admin user already exists: ${adminConfig.email}`);
      return existingAdmin;
    }

    const admin = new User({
      name: adminConfig.name,
      email: adminConfig.email,
      password: adminConfig.password,
      role: adminConfig.role,
      isActive: true,
      emailVerified: true,
      profile: {
        bio: 'System administrator account',
        company: 'Assessly'
      }
    });

    await admin.save();
    this.stats.users++;
    console.log(`✅ Admin user created: ${admin.email}`);

    return admin;
  }

  async createOrganization(admin, options = {}) {
    const orgConfig = { ...CONFIG.DEFAULT_ORGANIZATION, ...options };
    
    const organization = new Organization({
      name: orgConfig.name,
      slug: slugify(orgConfig.name, { lower: true, strict: true }),
      description: orgConfig.description,
      owner: admin._id,
      industry: 'Technology',
      size: '1-10',
      contact: {
        email: admin.email
      },
      members: [{
        user: admin._id,
        role: 'admin',
        joinedAt: new Date(),
        permissions: {
          createAssessments: true,
          manageUsers: true,
          viewAnalytics: true,
          manageSettings: true
        }
      }],
      settings: {
        isPublic: false,
        allowSelfRegistration: false,
        requireApproval: true
      },
      subscription: {
        plan: orgConfig.plan,
        status: 'active'
      }
    });

    await organization.save();
    this.stats.organizations++;
    console.log(`✅ Organization created: ${organization.name}`);

    return organization;
  }

  async createSubscription(organization, admin) {
    const planDetails = {
      free: { maxUsers: 10, maxAssessments: 5, price: 0 },
      basic: { maxUsers: 50, maxAssessments: 20, price: 29 },
      professional: { maxUsers: 200, maxAssessments: 100, price: 99 },
      enterprise: { maxUsers: 1000, maxAssessments: 500, price: 299 }
    };

    const plan = organization.subscription.plan;
    const details = planDetails[plan] || planDetails.enterprise;

    const subscription = new Subscription({
      organization: organization._id,
      plan: plan,
      billingCycle: 'yearly',
      status: 'active',
      price: {
        amount: details.price,
        currency: 'USD'
      },
      period: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      },
      features: {
        maxUsers: details.maxUsers,
        maxAssessments: details.maxAssessments,
        maxStorage: plan === 'enterprise' ? 10000 : 1000,
        advancedAnalytics: plan !== 'free',
        customBranding: plan === 'enterprise',
        apiAccess: plan === 'enterprise',
        prioritySupport: plan === 'enterprise'
      },
      metadata: {
        createdBy: admin._id,
        autoRenew: true
      }
    });

    await subscription.save();
    this.stats.subscriptions++;
    console.log(`✅ Subscription created: ${plan} plan`);

    return subscription;
  }

  async createSampleAssessment(organization, admin) {
    const assessment = new Assessment({
      title: CONFIG.SAMPLE_ASSESSMENT.title,
      description: CONFIG.SAMPLE_ASSESSMENT.description,
      category: CONFIG.SAMPLE_ASSESSMENT.category,
      tags: CONFIG.SAMPLE_ASSESSMENT.tags,
      status: CONFIG.SAMPLE_ASSESSMENT.status,
      createdBy: admin._id,
      organization: organization._id,
      questions: [
        {
          type: 'multiple-choice',
          question: 'What is JavaScript primarily used for?',
          points: 5,
          options: [
            { id: '1', text: 'Styling web pages', isCorrect: false },
            { id: '2', text: 'Adding interactivity to web pages', isCorrect: true },
            { id: '3', text: 'Database management', isCorrect: false },
            { id: '4', text: 'Server configuration', isCorrect: false }
          ],
          explanation: 'JavaScript is a scripting language used to create dynamic and interactive web content.',
          metadata: {
            difficulty: 'easy',
            tags: ['javascript', 'web']
          }
        },
        {
          type: 'multiple-choice',
          question: 'Which of the following is NOT a JavaScript data type?',
          points: 5,
          options: [
            { id: '1', text: 'string', isCorrect: false },
            { id: '2', text: 'boolean', isCorrect: false },
            { id: '3', text: 'integer', isCorrect: true },
            { id: '4', text: 'object', isCorrect: false }
          ],
          explanation: 'JavaScript has number type, not separate integer and float types.',
          metadata: {
            difficulty: 'medium',
            tags: ['javascript', 'data-types']
          }
        },
        {
          type: 'short-answer',
          question: 'What does the "DOM" stand for in web development?',
          points: 10,
          correctAnswer: 'Document Object Model',
          explanation: 'The DOM represents the document as nodes and objects that can be manipulated with JavaScript.',
          metadata: {
            difficulty: 'easy',
            tags: ['dom', 'web']
          }
        }
      ],
      settings: {
        duration: 30,
        attempts: 3,
        shuffleQuestions: true,
        showResults: true
      },
      totalPoints: 20,
      passingScore: 70
    });

    await assessment.save();
    this.stats.assessments++;
    console.log(`✅ Sample assessment created: ${assessment.title}`);

    return assessment;
  }

  async createTestUsers(organization) {
    const createdUsers = [];

    for (const userConfig of CONFIG.TEST_USERS) {
      const existingUser = await User.findOne({ email: userConfig.email });
      
      if (existingUser) {
        console.log(`ℹ️  Test user already exists: ${userConfig.email}`);
        createdUsers.push(existingUser);
        continue;
      }

      const user = new User({
        ...userConfig,
        isActive: true,
        emailVerified: true
      });

      await user.save();
      
      // Add user to organization
      await Organization.findByIdAndUpdate(
        organization._id,
        {
          $push: {
            members: {
              user: user._id,
              role: userConfig.role,
              joinedAt: new Date()
            }
          }
        }
      );

      this.stats.users++;
      createdUsers.push(user);
      console.log(`✅ Test user created: ${user.email} (${user.role})`);
    }

    return createdUsers;
  }

  async seedFull(options = {}) {
    const startTime = Date.now();
    
    try {
      console.log('🌱 Starting comprehensive database seeding...');
      await this.connect();

      if (options.cleanup) {
        await this.cleanup();
      }

      // Create admin user
      const admin = await this.createAdminUser(options);

      // Create organization
      const organization = await this.createOrganization(admin, options);

      // Create subscription
      const subscription = await this.createSubscription(organization, admin);

      // Create sample assessment
      const assessment = await this.createSampleAssessment(organization, admin);

      // Create test users
      const testUsers = await this.createTestUsers(organization);

      const duration = Date.now() - startTime;
      
      console.log('\n🎉 Database seeding completed successfully!');
      console.log('📊 Seeding Statistics:');
      console.log(`   👥 Users: ${this.stats.users}`);
      console.log(`   🏢 Organizations: ${this.stats.organizations}`);
      console.log(`   📝 Assessments: ${this.stats.assessments}`);
      console.log(`   💳 Subscriptions: ${this.stats.subscriptions}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);

      return {
        admin,
        organization,
        subscription,
        assessment,
        testUsers
      };

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async seedBasic() {
    return this.seedFull({ cleanup: false });
  }

  async seedTestData() {
    try {
      console.log('🧪 Seeding test data only...');
      await this.connect();

      // Find or create admin and organization first
      let admin = await User.findOne({ email: CONFIG.DEFAULT_ADMIN.email });
      let organization = await Organization.findOne({ name: CONFIG.DEFAULT_ORGANIZATION.name });

      if (!admin || !organization) {
        console.log('ℹ️  Admin or organization not found, running full seed first...');
        const result = await this.seedBasic();
        admin = result.admin;
        organization = result.organization;
      }

      const testUsers = await this.createTestUsers(organization);
      console.log('🎉 Test data seeding completed');

      return { admin, organization, testUsers };

    } catch (error) {
      console.error('❌ Test data seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Command line interface
async function handleCLI() {
  const seeder = new DatabaseSeeder();
  const args = process.argv.slice(2);

  try {
    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      return;
    }

    if (args.includes('--test-data')) {
      await seeder.seedTestData();
    } else if (args.includes('--cleanup')) {
      await seeder.connect();
      await seeder.cleanup();
      await seeder.disconnect();
    } else if (args.includes('--basic')) {
      await seeder.seedBasic();
    } else {
      // Full seed with optional cleanup
      const options = {};
      
      if (args.includes('--cleanup-first')) {
        options.cleanup = true;
      }

      // Parse custom options
      const customOptions = {};
      for (let i = 0; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        
        if (flag === '--admin-email') customOptions.email = value;
        if (flag === '--admin-name') customOptions.name = value;
        if (flag === '--org-name') customOptions.name = value;
        if (flag === '--plan') customOptions.plan = value;
      }

      await seeder.seedFull({ ...options, ...customOptions });
    }

  } catch (error) {
    console.error('❌ Seeding process failed:', error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🌱 Assessly Database Seeder

Usage: node seed.js [options]

Options:
  --help, -h              Show this help message
  --basic                 Run basic seeding (admin + organization)
  --test-data             Seed test users only
  --cleanup               Clean up all seed data
  --cleanup-first         Clean up before seeding

Customization:
  --admin-email <email>   Custom admin email
  --admin-name <name>     Custom admin name  
  --org-name <name>       Custom organization name
  --plan <plan>           Subscription plan (free|basic|professional|enterprise)

Examples:
  node seed.js                           # Full seeding
  node seed.js --basic                   # Basic seeding only
  node seed.js --test-data               # Add test users
  node seed.js --cleanup-first           # Clean up and seed fresh
  node seed.js --admin-email custom@admin.com --plan professional
  `);
}

// Export for programmatic use
export { DatabaseSeeder, CONFIG };

// Default export for backward compatibility
const seedDatabase = () => new DatabaseSeeder().seedBasic();
export default seedDatabase;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  handleCLI();
}
