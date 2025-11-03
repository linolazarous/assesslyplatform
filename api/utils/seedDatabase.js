import chalk from 'chalk';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Subscription from '../models/Subscription.js';
import Assessment from '../models/Assessment.js';

/**
 * Database seeder utility with comprehensive error handling and logging
 * Safe to run multiple times — will skip if data already exists
 */
class DatabaseSeeder {
  constructor() {
    this.session = null;
    this.stats = {
      users: 0,
      organizations: 0,
      subscriptions: 0,
      assessments: 0
    };
  }

  async initialize() {
    this.session = await mongoose.startSession();
    await this.session.startTransaction();
    console.log(chalk.cyan('🔧 Database seeder initialized with transaction'));
  }

  async commit() {
    if (this.session) {
      await this.session.commitTransaction();
      await this.session.endSession();
      console.log(chalk.green('✅ Transaction committed successfully'));
    }
  }

  async rollback() {
    if (this.session) {
      await this.session.abortTransaction();
      await this.session.endSession();
      console.log(chalk.red('🔄 Transaction rolled back'));
    }
  }

  async shouldSkipSeeding() {
    try {
      // Check if admin user already exists
      const existingAdmin = await User.findOne({ role: 'admin' }).session(this.session);
      if (existingAdmin) {
        console.log(chalk.yellow('⚠️  Seed skipped — admin user already exists.'));
        return true;
      }

      // Check if database has significant data
      const userCount = await User.estimatedDocumentCount().session(this.session);
      const orgCount = await Organization.estimatedDocumentCount().session(this.session);

      if (userCount > 5 || orgCount > 2) {
        console.log(chalk.yellow(`⚠️  Seed skipped — existing data detected (${userCount} users, ${orgCount} orgs).`));
        return true;
      }

      return false;
    } catch (error) {
      console.error(chalk.red('❌ Error checking database state:'), error.message);
      throw error;
    }
  }

  async createDefaultOrganization() {
    try {
      console.log(chalk.blue('🏢 Creating default organization...'));
      
      const organization = await Organization.create([{
        name: 'Assessly Headquarters',
        slug: 'assessly-headquarters',
        description: 'Default organization for system administration and testing',
        industry: 'Technology',
        size: '1-10',
        contact: {
          email: 'admin@assessly.com'
        },
        settings: {
          isPublic: false,
          allowSelfRegistration: false,
          requireApproval: true
        },
        subscription: {
          plan: 'enterprise',
          status: 'active'
        },
        metadata: {
          totalMembers: 1,
          totalAssessments: 0,
          totalResponses: 0
        }
      }], { session: this.session });

      this.stats.organizations++;
      console.log(chalk.green('✅ Default organization created'));
      return organization[0];
    } catch (error) {
      console.error(chalk.red('❌ Failed to create organization:'), error.message);
      throw error;
    }
  }

  async createSubscription(organization) {
    try {
      console.log(chalk.blue('💳 Creating subscription...'));
      
      const subscription = await Subscription.create([{
        organization: organization._id,
        plan: 'enterprise',
        billingCycle: 'yearly',
        status: 'active',
        price: {
          amount: 299,
          currency: 'USD'
        },
        period: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        },
        features: {
          maxUsers: 1000,
          maxAssessments: 500,
          maxStorage: 10000,
          advancedAnalytics: true,
          customBranding: true,
          apiAccess: true,
          prioritySupport: true,
          ssoIntegration: true
        },
        limits: {
          currentUsers: 1,
          currentAssessments: 0,
          currentStorage: 0
        },
        metadata: {
          createdBy: null, // Will be set after admin creation
          autoRenew: true,
          notes: 'Default enterprise subscription for system organization'
        }
      }], { session: this.session });

      this.stats.subscriptions++;
      console.log(chalk.green('✅ Subscription created'));
      return subscription[0];
    } catch (error) {
      console.error(chalk.red('❌ Failed to create subscription:'), error.message);
      throw error;
    }
  }

  async createAdminUser(organization) {
    try {
      console.log(chalk.blue('👑 Creating admin user...'));
      
      // Use environment variable for admin password with fallback
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456';
      
      if (!adminPassword || adminPassword.length < 8) {
        throw new Error('Admin password must be at least 8 characters long. Set ADMIN_DEFAULT_PASSWORD environment variable.');
      }

      const admin = await User.create([{
        name: 'System Administrator',
        email: 'admin@assessly.com',
        password: adminPassword,
        role: 'admin',
        organization: organization._id,
        isActive: true,
        emailVerified: true,
        lastLogin: new Date(),
        profile: {
          bio: 'System administrator account with full platform access',
          company: 'Assessly',
          position: 'System Administrator'
        },
        preferences: {
          notifications: {
            email: true,
            push: true
          },
          language: 'en',
          timezone: 'UTC'
        }
      }], { session: this.session });

      this.stats.users++;
      console.log(chalk.green('✅ Admin user created'));
      return admin[0];
    } catch (error) {
      console.error(chalk.red('❌ Failed to create admin user:'), error.message);
      throw error;
    }
  }

  async createSampleAssessment(organization, admin) {
    try {
      console.log(chalk.blue('📝 Creating sample assessment...'));
      
      const assessment = await Assessment.create([{
        title: 'Sample Technical Assessment',
        description: 'A comprehensive technical assessment covering programming fundamentals, problem-solving, and system design principles. This assessment helps evaluate candidates\' technical capabilities and problem-solving approach.',
        slug: 'sample-technical-assessment',
        questions: [
          {
            type: 'multiple-choice',
            question: 'What is the time complexity of accessing an element in an array by index?',
            description: 'Consider the average case scenario for array access operations.',
            points: 5,
            options: [
              { id: '1', text: 'O(1)', isCorrect: true },
              { id: '2', text: 'O(n)', isCorrect: false },
              { id: '3', text: 'O(log n)', isCorrect: false },
              { id: '4', text: 'O(n²)', isCorrect: false }
            ],
            explanation: 'Array access by index is a constant time operation O(1) because arrays provide direct memory addressing.',
            metadata: {
              difficulty: 'easy',
              tags: ['algorithms', 'data-structures', 'complexity'],
              timeLimit: 30
            }
          },
          {
            type: 'multiple-choice',
            question: 'Which HTTP status code indicates a successful creation of a resource?',
            points: 5,
            options: [
              { id: '1', text: '200 OK', isCorrect: false },
              { id: '2', text: '201 Created', isCorrect: true },
              { id: '3', text: '204 No Content', isCorrect: false },
              { id: '4', text: '400 Bad Request', isCorrect: false }
            ],
            explanation: 'HTTP 201 Created is returned when a new resource is successfully created, typically in response to a POST request.',
            metadata: {
              difficulty: 'medium',
              tags: ['http', 'web-development', 'api'],
              timeLimit: 30
            }
          },
          {
            type: 'short-answer',
            question: 'Explain the concept of "database indexing" and its benefits.',
            points: 10,
            correctAnswer: 'Database indexing is a data structure technique that improves the speed of data retrieval operations. Benefits include faster query performance, efficient data access, and reduced I/O operations.',
            explanation: 'Indexes work like a book index, allowing the database to find data without scanning the entire table. They trade off storage space for improved read performance.',
            metadata: {
              difficulty: 'medium',
              tags: ['database', 'performance', 'indexing'],
              timeLimit: 120
            }
          }
        ],
        settings: {
          duration: 45,
          attempts: 2,
          shuffleQuestions: true,
          shuffleOptions: true,
          showResults: true,
          allowBacktracking: true,
          requireFullScreen: false,
          webcamMonitoring: false
        },
        status: 'active',
        category: 'Technical Screening',
        tags: ['programming', 'algorithms', 'database', 'web'],
        totalPoints: 20,
        passingScore: 70,
        createdBy: admin._id,
        organization: organization._id,
        access: 'private',
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          timezone: 'UTC'
        },
        metadata: {
          views: 0,
          completions: 0,
          averageScore: 0,
          averageTime: 0
        }
      }], { session: this.session });

      this.stats.assessments++;
      console.log(chalk.green('✅ Sample assessment created'));
      return assessment[0];
    } catch (error) {
      console.error(chalk.red('❌ Failed to create sample assessment:'), error.message);
      throw error;
    }
  }

  async updateOrganizationWithAdmin(organization, admin) {
    try {
      // Set organization owner
      organization.owner = admin._id;
      
      // Add admin as organization member
      organization.members.push({
        user: admin._id,
        role: 'admin',
        joinedAt: new Date(),
        permissions: {
          createAssessments: true,
          manageUsers: true,
          viewAnalytics: true,
          manageSettings: true
        }
      });

      await organization.save({ session: this.session });
      console.log(chalk.green('✅ Organization updated with admin ownership'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to update organization:'), error.message);
      throw error;
    }
  }

  async seed() {
    const startTime = Date.now();
    
    try {
      console.log(chalk.cyan('\n🌱 Starting comprehensive database seeding...'));
      
      await this.initialize();

      // Check if we should skip seeding
      if (await this.shouldSkipSeeding()) {
        await this.rollback();
        return { skipped: true };
      }

      // Execute seeding steps
      const organization = await this.createDefaultOrganization();
      const subscription = await this.createSubscription(organization);
      const admin = await this.createAdminUser(organization);
      const assessment = await this.createSampleAssessment(organization, admin);
      await this.updateOrganizationWithAdmin(organization, admin);

      // Update subscription with admin reference
      subscription.metadata.createdBy = admin._id;
      await subscription.save({ session: this.session });

      await this.commit();

      const duration = Date.now() - startTime;
      
      console.log(chalk.magenta('\n🎉 Database seeding completed successfully!'));
      console.log(chalk.blue('📊 Seeding Statistics:'));
      console.log(`   👥 Users: ${this.stats.users}`);
      console.log(`   🏢 Organizations: ${this.stats.organizations}`);
      console.log(`   📝 Assessments: ${this.stats.assessments}`);
      console.log(`   💳 Subscriptions: ${this.stats.subscriptions}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);
      console.log(chalk.green('\n🔑 Admin Credentials:'));
      console.log(`   📧 Email: admin@assessly.com`);
      console.log(`   🔐 Password: ${process.env.ADMIN_DEFAULT_PASSWORD ? '*** (from environment)' : 'Admin@123456 (default)'}`);
      console.log(chalk.yellow('\n⚠️  Remember to change the admin password after first login!'));

      return {
        admin,
        organization,
        subscription,
        assessment,
        stats: this.stats,
        duration
      };

    } catch (error) {
      await this.rollback();
      console.error(chalk.red('\n❌ Database seeding failed:'), error.message);
      throw error;
    }
  }
}

/**
 * Main seeding function for backward compatibility
 */
export async function seedDatabase() {
  const seeder = new DatabaseSeeder();
  return await seeder.seed();
}

export default seedDatabase;
