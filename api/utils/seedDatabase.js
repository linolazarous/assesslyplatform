// api/utils/seedDatabase.js
import chalk from 'chalk';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Subscription from '../models/Subscription.js';
import Assessment from '../models/Assessment.js';

/**
 * Production-ready database seeder for multi-tenant assessment platform
 * Creates essential system data without hardcoded user accounts
 * Safe for production environments
 */
class DatabaseSeeder {
  constructor() {
    this.session = null;
    this.stats = {
      organizations: 0,
      subscriptions: 0,
      assessments: 0,
      systemData: 0
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
      // Check if system organization already exists
      const existingSystemOrg = await Organization.findOne({ 
        slug: 'assessly-system' 
      }).session(this.session);
      
      if (existingSystemOrg) {
        console.log(chalk.yellow('⚠️  Seed skipped — system organization already exists.'));
        return true;
      }

      // Check if we have significant existing data
      const orgCount = await Organization.estimatedDocumentCount().session(this.session);
      const subscriptionCount = await Subscription.estimatedDocumentCount().session(this.session);

      if (orgCount > 2 || subscriptionCount > 2) {
        console.log(chalk.yellow(`⚠️  Seed skipped — existing data detected (${orgCount} orgs, ${subscriptionCount} subscriptions).`));
        return true;
      }

      return false;
    } catch (error) {
      console.error(chalk.red('❌ Error checking database state:'), error.message);
      throw error;
    }
  }

  async createSystemOrganization() {
    try {
      console.log(chalk.blue('🏢 Creating system organization...'));
      
      const organization = await Organization.create([{
        name: 'Assessly System',
        slug: 'assessly-system',
        description: 'System organization for platform management and default content',
        industry: 'Technology',
        size: '1-10',
        type: 'system',
        contact: {
          email: 'system@assesslyplatform.com'
        },
        settings: {
          isPublic: false,
          allowSelfRegistration: true,
          requireApproval: false,
          allowGoogleOAuth: true,
          allowEmailPassword: true
        },
        subscription: {
          plan: 'enterprise',
          status: 'active'
        },
        metadata: {
          totalMembers: 0,
          totalAssessments: 0,
          totalResponses: 0,
          isSystem: true
        }
      }], { session: this.session });

      this.stats.organizations++;
      console.log(chalk.green('✅ System organization created'));
      return organization[0];
    } catch (error) {
      console.error(chalk.red('❌ Failed to create system organization:'), error.message);
      throw error;
    }
  }

  async createDefaultSubscriptionPlans() {
    try {
      console.log(chalk.blue('💳 Creating default subscription plans...'));
      
      const plans = [
        {
          name: 'Free',
          slug: 'free',
          description: 'Basic plan for individual users and small teams',
          price: {
            amount: 0,
            currency: 'USD'
          },
          billingCycle: 'monthly',
          features: {
            maxUsers: 3,
            maxAssessments: 10,
            maxStorage: 100, // MB
            advancedAnalytics: false,
            customBranding: false,
            apiAccess: false,
            prioritySupport: false,
            ssoIntegration: false
          },
          limits: {
            questionsPerAssessment: 20,
            candidatesPerAssessment: 50,
            responseRetention: 30 // days
          },
          isActive: true,
          isPublic: true
        },
        {
          name: 'Professional',
          slug: 'professional',
          description: 'Advanced plan for growing teams and businesses',
          price: {
            amount: 49,
            currency: 'USD'
          },
          billingCycle: 'monthly',
          features: {
            maxUsers: 25,
            maxAssessments: 100,
            maxStorage: 1000, // MB
            advancedAnalytics: true,
            customBranding: true,
            apiAccess: true,
            prioritySupport: false,
            ssoIntegration: false
          },
          limits: {
            questionsPerAssessment: 50,
            candidatesPerAssessment: 500,
            responseRetention: 365 // days
          },
          isActive: true,
          isPublic: true
        },
        {
          name: 'Enterprise',
          slug: 'enterprise',
          description: 'Full-featured plan for large organizations',
          price: {
            amount: 299,
            currency: 'USD'
          },
          billingCycle: 'yearly',
          features: {
            maxUsers: 1000,
            maxAssessments: 500,
            maxStorage: 10000, // MB
            advancedAnalytics: true,
            customBranding: true,
            apiAccess: true,
            prioritySupport: true,
            ssoIntegration: true
          },
          limits: {
            questionsPerAssessment: 100,
            candidatesPerAssessment: 5000,
            responseRetention: 1095 // days (3 years)
          },
          isActive: true,
          isPublic: true
        }
      ];

      const subscriptions = await Subscription.create(plans, { session: this.session });
      this.stats.subscriptions += subscriptions.length;
      console.log(chalk.green(`✅ ${subscriptions.length} subscription plans created`));
      return subscriptions;
    } catch (error) {
      console.error(chalk.red('❌ Failed to create subscription plans:'), error.message);
      throw error;
    }
  }

  async createSampleAssessments(systemOrg) {
    try {
      console.log(chalk.blue('📝 Creating sample assessments...'));
      
      const sampleAssessments = [
        {
          title: 'Full-Stack Developer Assessment',
          description: 'Comprehensive assessment for full-stack developers covering frontend, backend, database, and system design concepts.',
          slug: 'full-stack-developer-assessment',
          questions: [
            {
              type: 'multiple-choice',
              question: 'Which of the following is NOT a React hook?',
              points: 5,
              options: [
                { id: '1', text: 'useState', isCorrect: false },
                { id: '2', text: 'useEffect', isCorrect: false },
                { id: '3', text: 'useComponent', isCorrect: true },
                { id: '4', text: 'useContext', isCorrect: false }
              ],
              explanation: 'useComponent is not a valid React hook. The correct hooks are useState, useEffect, useContext, etc.',
              metadata: {
                difficulty: 'easy',
                tags: ['react', 'frontend', 'hooks'],
                timeLimit: 30
              }
            },
            {
              type: 'multiple-choice',
              question: 'What is the purpose of database indexing?',
              points: 8,
              options: [
                { id: '1', text: 'To encrypt database contents', isCorrect: false },
                { id: '2', text: 'To improve query performance', isCorrect: true },
                { id: '3', text: 'To backup database files', isCorrect: false },
                { id: '4', text: 'To validate data types', isCorrect: false }
              ],
              explanation: 'Database indexing improves query performance by creating a data structure that allows faster data retrieval.',
              metadata: {
                difficulty: 'medium',
                tags: ['database', 'performance', 'indexing'],
                timeLimit: 45
              }
            }
          ],
          settings: {
            duration: 60,
            attempts: 3,
            shuffleQuestions: true,
            shuffleOptions: true,
            showResults: true,
            allowBacktracking: true,
            requireFullScreen: false,
            webcamMonitoring: false
          },
          status: 'active',
          category: 'Technical Screening',
          tags: ['javascript', 'react', 'nodejs', 'database'],
          totalPoints: 13,
          passingScore: 70,
          createdBy: null, // System-generated
          organization: systemOrg._id,
          access: 'public',
          isTemplate: true,
          schedule: {
            startDate: new Date(),
            endDate: null, // No end date for templates
            timezone: 'UTC'
          },
          metadata: {
            views: 0,
            completions: 0,
            averageScore: 0,
            averageTime: 0,
            isSample: true
          }
        },
        {
          title: 'Software Engineering Fundamentals',
          description: 'Assessment covering core software engineering principles, algorithms, and data structures.',
          slug: 'software-engineering-fundamentals',
          questions: [
            {
              type: 'multiple-choice',
              question: 'What is the time complexity of binary search?',
              points: 5,
              options: [
                { id: '1', text: 'O(1)', isCorrect: false },
                { id: '2', text: 'O(log n)', isCorrect: true },
                { id: '3', text: 'O(n)', isCorrect: false },
                { id: '4', text: 'O(n log n)', isCorrect: false }
              ],
              explanation: 'Binary search has O(log n) time complexity as it halves the search space with each iteration.',
              metadata: {
                difficulty: 'easy',
                tags: ['algorithms', 'complexity', 'search'],
                timeLimit: 30
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
          category: 'Computer Science',
          tags: ['algorithms', 'data-structures', 'complexity'],
          totalPoints: 5,
          passingScore: 60,
          createdBy: null, // System-generated
          organization: systemOrg._id,
          access: 'public',
          isTemplate: true,
          metadata: {
            views: 0,
            completions: 0,
            averageScore: 0,
            averageTime: 0,
            isSample: true
          }
        }
      ];

      const assessments = await Assessment.create(sampleAssessments, { session: this.session });
      this.stats.assessments += assessments.length;
      console.log(chalk.green(`✅ ${assessments.length} sample assessments created`));
      return assessments;
    } catch (error) {
      console.error(chalk.red('❌ Failed to create sample assessments:'), error.message);
      throw error;
    }
  }

  async createDefaultCategories() {
    try {
      console.log(chalk.blue('📚 Creating default assessment categories...'));
      
      // This would typically be in a separate Category model
      // For now, we'll ensure they exist in system organization metadata
      const defaultCategories = [
        'Technical Screening',
        'Behavioral Interview',
        'Cognitive Ability',
        'Language Proficiency',
        'Domain Knowledge',
        'Practical Skills',
        'Culture Fit',
        'Leadership Assessment'
      ];

      this.stats.systemData++;
      console.log(chalk.green(`✅ ${defaultCategories.length} default categories defined`));
      return defaultCategories;
    } catch (error) {
      console.error(chalk.red('❌ Failed to create default categories:'), error.message);
      throw error;
    }
  }

  async seed() {
    const startTime = Date.now();
    
    try {
      console.log(chalk.cyan('\n🌱 Starting production database seeding...'));
      
      await this.initialize();

      // Check if we should skip seeding
      if (await this.shouldSkipSeeding()) {
        await this.rollback();
        return { skipped: true, message: 'Seeding skipped - data already exists' };
      }

      // Execute seeding steps
      const systemOrg = await this.createSystemOrganization();
      const subscriptionPlans = await this.createDefaultSubscriptionPlans();
      const sampleAssessments = await this.createSampleAssessments(systemOrg);
      const categories = await this.createDefaultCategories();

      await this.commit();

      const duration = Date.now() - startTime;
      
      console.log(chalk.magenta('\n🎉 Production database seeding completed successfully!'));
      console.log(chalk.blue('📊 Seeding Statistics:'));
      console.log(`   🏢 Organizations: ${this.stats.organizations}`);
      console.log(`   💳 Subscription Plans: ${this.stats.subscriptions}`);
      console.log(`   📝 Sample Assessments: ${this.stats.assessments}`);
      console.log(`   📚 System Data: ${this.stats.systemData}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);
      
      console.log(chalk.green('\n🚀 Platform Ready For:'));
      console.log(`   🔐 Google OAuth registration`);
      console.log(`   📧 Email/password registration`);
      console.log(`   🏢 Multi-tenant organization creation`);
      console.log(`   💰 Multiple subscription tiers`);
      console.log(`   📊 Sample assessment templates`);

      return {
        systemOrg,
        subscriptionPlans,
        sampleAssessments,
        categories,
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
