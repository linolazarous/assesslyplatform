// api/scripts/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import slugify from "slugify";
import chalk from "chalk";

import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Assessment from "../models/Assessment.js";
import Subscription from "../models/Subscription.js";

dotenv.config();

// ---------------------------------------------------------------------
// PRODUCTION CONFIGURATION
// ---------------------------------------------------------------------
const CONFIG = {
  // System organization for platform-level resources
  SYSTEM_ORGANIZATION: {
    name: "Assessly System",
    description: "Platform system organization for templates and default content",
    slug: "assessly-system",
    type: "system",
    plan: "enterprise"
  },

  // Default subscription plans for multi-tenant platform
  SUBSCRIPTION_PLANS: [
    {
      name: "Free",
      slug: "free",
      description: "Perfect for individuals and small teams getting started",
      price: { amount: 0, currency: "USD" },
      billingCycle: "monthly",
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
      name: "Professional",
      slug: "professional", 
      description: "Advanced features for growing teams and businesses",
      price: { amount: 49, currency: "USD" },
      billingCycle: "monthly",
      features: {
        maxUsers: 25,
        maxAssessments: 100,
        maxStorage: 1000,
        advancedAnalytics: true,
        customBranding: true,
        apiAccess: true,
        prioritySupport: false,
        ssoIntegration: false
      },
      limits: {
        questionsPerAssessment: 50,
        candidatesPerAssessment: 500,
        responseRetention: 365
      },
      isActive: true,
      isPublic: true
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "Full-featured plan for large organizations",
      price: { amount: 299, currency: "USD" },
      billingCycle: "yearly",
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
        questionsPerAssessment: 100,
        candidatesPerAssessment: 5000,
        responseRetention: 1095
      },
      isActive: true,
      isPublic: true
    }
  ],

  // Sample assessment templates for new organizations
  ASSESSMENT_TEMPLATES: [
    {
      title: "Full-Stack Developer Assessment",
      description: "Comprehensive technical assessment covering frontend, backend, database, and system design concepts. Evaluates programming skills, problem-solving ability, and architectural knowledge.",
      category: "Technical Screening",
      tags: ["javascript", "react", "nodejs", "database", "system-design"],
      status: "active",
      access: "public",
      isTemplate: true,
      questions: [
        {
          type: "multiple-choice",
          question: "Which of the following is NOT a React hook?",
          points: 5,
          options: [
            { id: "1", text: "useState", isCorrect: false },
            { id: "2", text: "useEffect", isCorrect: false },
            { id: "3", text: "useComponent", isCorrect: true },
            { id: "4", text: "useContext", isCorrect: false }
          ],
          explanation: "useComponent is not a valid React hook. The correct built-in hooks are useState, useEffect, useContext, useReducer, etc.",
          metadata: {
            difficulty: "easy",
            tags: ["react", "frontend", "hooks"],
            timeLimit: 30
          }
        },
        {
          type: "multiple-choice", 
          question: "What is the purpose of database indexing?",
          points: 8,
          options: [
            { id: "1", text: "To encrypt database contents", isCorrect: false },
            { id: "2", text: "To improve query performance", isCorrect: true },
            { id: "3", text: "To backup database files", isCorrect: false },
            { id: "4", text: "To validate data types", isCorrect: false }
          ],
          explanation: "Database indexing improves query performance by creating a data structure that allows faster data retrieval through optimized search paths.",
          metadata: {
            difficulty: "medium",
            tags: ["database", "performance", "indexing"],
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
      totalPoints: 13,
      passingScore: 70
    },
    {
      title: "Software Engineering Fundamentals",
      description: "Assessment covering core computer science principles, algorithms, data structures, and software engineering best practices.",
      category: "Computer Science", 
      tags: ["algorithms", "data-structures", "complexity", "oop"],
      status: "active",
      access: "public",
      isTemplate: true,
      questions: [
        {
          type: "multiple-choice",
          question: "What is the time complexity of binary search?",
          points: 5,
          options: [
            { id: "1", text: "O(1)", isCorrect: false },
            { id: "2", text: "O(log n)", isCorrect: true },
            { id: "3", text: "O(n)", isCorrect: false },
            { id: "4", text: "O(n log n)", isCorrect: false }
          ],
          explanation: "Binary search has O(log n) time complexity as it halves the search space with each iteration, making it very efficient for sorted arrays.",
          metadata: {
            difficulty: "easy",
            tags: ["algorithms", "complexity", "search"],
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
      totalPoints: 5,
      passingScore: 60
    }
  ]
};

// ---------------------------------------------------------------------
// PRODUCTION SEEDER CLASS
// ---------------------------------------------------------------------
class DatabaseSeeder {
  constructor() {
    this.session = null;
    this.stats = {
      systemOrganizations: 0,
      subscriptionPlans: 0,
      assessmentTemplates: 0,
      sampleOrganizations: 0
    };
  }

  async connect() {
    if (!process.env.MONGODB_URI) {
      throw new Error("❌ MONGODB_URI environment variable is required");
    }

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(chalk.green("✅ Connected to MongoDB"));
  }

  async disconnect() {
    if (this.session) {
      await this.session.endSession();
    }
    await mongoose.connection.close();
    console.log(chalk.blue("🔌 MongoDB connection closed"));
  }

  async initializeTransaction() {
    this.session = await mongoose.startSession();
    await this.session.startTransaction();
    console.log(chalk.cyan("🔧 Transaction started"));
  }

  async commitTransaction() {
    if (this.session) {
      await this.session.commitTransaction();
      await this.session.endSession();
      this.session = null;
      console.log(chalk.green("✅ Transaction committed"));
    }
  }

  async rollbackTransaction() {
    if (this.session) {
      await this.session.abortTransaction();
      await this.session.endSession();
      this.session = null;
      console.log(chalk.red("🔄 Transaction rolled back"));
    }
  }

  /**
   * Check if seeding should be skipped (already seeded)
   */
  async shouldSkipSeeding() {
    const systemOrgExists = await Organization.findOne({ 
      slug: CONFIG.SYSTEM_ORGANIZATION.slug 
    });
    
    const plansExist = await Subscription.countDocuments({ 
      isTemplate: true 
    });

    if (systemOrgExists && plansExist > 0) {
      console.log(chalk.yellow("⚠️  Seeding skipped - system data already exists"));
      return true;
    }

    return false;
  }

  /**
   * Create system organization for platform management
   */
  async createSystemOrganization() {
    try {
      console.log(chalk.blue("🏢 Creating system organization..."));

      let systemOrg = await Organization.findOne({
        slug: CONFIG.SYSTEM_ORGANIZATION.slug
      }).session(this.session);

      if (systemOrg) {
        console.log(chalk.yellow("ℹ️  System organization already exists"));
        return systemOrg;
      }

      systemOrg = await Organization.create([{
        name: CONFIG.SYSTEM_ORGANIZATION.name,
        slug: CONFIG.SYSTEM_ORGANIZATION.slug,
        description: CONFIG.SYSTEM_ORGANIZATION.description,
        type: CONFIG.SYSTEM_ORGANIZATION.type,
        industry: "Technology",
        size: "1-10",
        contact: {
          email: "system@assessly.com"
        },
        settings: {
          isPublic: false,
          allowSelfRegistration: false,
          requireApproval: true,
          allowGoogleOAuth: true,
          allowEmailPassword: true
        },
        subscription: {
          plan: CONFIG.SYSTEM_ORGANIZATION.plan,
          status: "active"
        },
        metadata: {
          totalMembers: 0,
          totalAssessments: 0,
          totalResponses: 0,
          isSystem: true
        }
      }], { session: this.session });

      this.stats.systemOrganizations++;
      console.log(chalk.green("✅ System organization created"));
      return systemOrg[0];
    } catch (error) {
      console.error(chalk.red("❌ Failed to create system organization:"), error.message);
      throw error;
    }
  }

  /**
   * Create default subscription plans
   */
  async createSubscriptionPlans() {
    try {
      console.log(chalk.blue("💳 Creating subscription plans..."));

      const existingPlans = await Subscription.find({
        slug: { $in: CONFIG.SUBSCRIPTION_PLANS.map(plan => plan.slug) }
      }).session(this.session);

      if (existingPlans.length === CONFIG.SUBSCRIPTION_PLANS.length) {
        console.log(chalk.yellow("ℹ️  Subscription plans already exist"));
        return existingPlans;
      }

      const plansWithMetadata = CONFIG.SUBSCRIPTION_PLANS.map(plan => ({
        ...plan,
        isTemplate: true,
        status: plan.isActive ? "active" : "inactive",
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          isPublic: plan.isPublic
        }
      }));

      const subscriptions = await Subscription.create(plansWithMetadata, { 
        session: this.session 
      });

      this.stats.subscriptionPlans += subscriptions.length;
      console.log(chalk.green(`✅ ${subscriptions.length} subscription plans created`));
      return subscriptions;
    } catch (error) {
      console.error(chalk.red("❌ Failed to create subscription plans:"), error.message);
      throw error;
    }
  }

  /**
   * Create assessment templates in system organization
   */
  async createAssessmentTemplates(systemOrg) {
    try {
      console.log(chalk.blue("📝 Creating assessment templates..."));

      const existingTemplates = await Assessment.find({
        organization: systemOrg._id,
        isTemplate: true
      }).session(this.session);

      if (existingTemplates.length >= CONFIG.ASSESSMENT_TEMPLATES.length) {
        console.log(chalk.yellow("ℹ️  Assessment templates already exist"));
        return existingTemplates;
      }

      const templatesWithOrg = CONFIG.ASSESSMENT_TEMPLATES.map(template => ({
        ...template,
        slug: slugify(template.title, { lower: true, strict: true }),
        organization: systemOrg._id,
        createdBy: null, // System-generated
        schedule: {
          startDate: new Date(),
          endDate: null, // No expiration for templates
          timezone: "UTC"
        },
        metadata: {
          views: 0,
          completions: 0,
          averageScore: 0,
          averageTime: 0,
          isSample: true,
          isTemplate: true
        }
      }));

      const assessments = await Assessment.create(templatesWithOrg, { 
        session: this.session 
      });

      this.stats.assessmentTemplates += assessments.length;
      console.log(chalk.green(`✅ ${assessments.length} assessment templates created`));
      return assessments;
    } catch (error) {
      console.error(chalk.red("❌ Failed to create assessment templates:"), error.message);
      throw error;
    }
  }

  /**
   * Create sample organizations for demonstration (development only)
   */
  async createSampleOrganizations() {
    if (process.env.NODE_ENV === "production") {
      console.log(chalk.yellow("⚠️  Sample organizations skipped in production"));
      return [];
    }

    try {
      console.log(chalk.blue("🏢 Creating sample organizations..."));

      const sampleOrgs = [
        {
          name: "TechCorp Solutions",
          description: "Technology consulting and software development company",
          industry: "Technology",
          size: "50-200",
          plan: "professional"
        },
        {
          name: "Global Education Institute", 
          description: "International educational institution focusing on skills development",
          industry: "Education",
          size: "200-1000",
          plan: "enterprise"
        }
      ];

      const createdOrgs = [];

      for (const orgData of sampleOrgs) {
        const slug = slugify(orgData.name, { lower: true, strict: true });
        
        let org = await Organization.findOne({ slug }).session(this.session);
        if (org) {
          console.log(chalk.yellow(`ℹ️  Sample organization already exists: ${orgData.name}`));
          createdOrgs.push(org);
          continue;
        }

        org = await Organization.create([{
          name: orgData.name,
          slug: slug,
          description: orgData.description,
          industry: orgData.industry,
          size: orgData.size,
          type: "sample",
          contact: {
            email: `contact@${slug}.com`
          },
          settings: {
            isPublic: true,
            allowSelfRegistration: false,
            requireApproval: true,
            allowGoogleOAuth: true,
            allowEmailPassword: true
          },
          subscription: {
            plan: orgData.plan,
            status: "active"
          },
          metadata: {
            totalMembers: 0,
            totalAssessments: 0,
            totalResponses: 0,
            isSample: true
          }
        }], { session: this.session });

        this.stats.sampleOrganizations++;
        console.log(chalk.green(`✅ Sample organization created: ${orgData.name}`));
        createdOrgs.push(org[0]);
      }

      return createdOrgs;
    } catch (error) {
      console.error(chalk.red("❌ Failed to create sample organizations:"), error.message);
      throw error;
    }
  }

  /**
   * Main seeding method
   */
  async seed() {
    const startTime = Date.now();

    try {
      console.log(chalk.cyan("\n🌱 Starting production database seeding..."));
      
      await this.connect();
      await this.initializeTransaction();

      // Check if we should skip seeding
      if (await this.shouldSkipSeeding()) {
        await this.rollbackTransaction();
        return { 
          success: true, 
          skipped: true, 
          message: "Seeding skipped - system data already exists" 
        };
      }

      // Execute seeding steps
      const systemOrg = await this.createSystemOrganization();
      const subscriptionPlans = await this.createSubscriptionPlans();
      const assessmentTemplates = await this.createAssessmentTemplates(systemOrg);
      const sampleOrgs = await this.createSampleOrganizations();

      await this.commitTransaction();

      const duration = Date.now() - startTime;

      // Summary
      console.log(chalk.magenta("\n🎉 Production seeding completed successfully!"));
      console.log(chalk.blue("📊 Seeding Statistics:"));
      console.log(`   🏢 System Organizations: ${this.stats.systemOrganizations}`);
      console.log(`   💳 Subscription Plans: ${this.stats.subscriptionPlans}`);
      console.log(`   📝 Assessment Templates: ${this.stats.assessmentTemplates}`);
      console.log(`   🎯 Sample Organizations: ${this.stats.sampleOrganizations}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);

      console.log(chalk.green("\n🚀 Platform Ready For:"));
      console.log(`   🔐 Google OAuth registration`);
      console.log(`   📧 Email/password registration`); 
      console.log(`   🏢 Multi-tenant organization creation`);
      console.log(`   💰 Multiple subscription tiers`);
      console.log(`   📊 Assessment template library`);

      return {
        success: true,
        systemOrg,
        subscriptionPlans, 
        assessmentTemplates,
        sampleOrgs,
        stats: this.stats,
        duration
      };

    } catch (error) {
      await this.rollbackTransaction();
      console.error(chalk.red("\n❌ Seeding failed:"), error.message);
      
      return {
        success: false,
        error: error.message,
        stats: this.stats
      };
    } finally {
      await this.disconnect();
    }
  }
}

// CLI execution handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const seeder = new DatabaseSeeder();
  
  seeder.seed()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(chalk.red("❌ Unhandled seeding error:"), error);
      process.exit(1);
    });
}

export { DatabaseSeeder, CONFIG };
