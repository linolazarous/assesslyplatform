// api/scripts/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import slugify from "slugify";
import chalk from "chalk";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Assessment from "../models/Assessment.js";
import Subscription from "../models/Subscription.js";
import AssessmentResponse from "../models/AssessmentResponse.js";

dotenv.config();

// ---------------------------------------------------------------------
// MULTI-TENANT B2B SAAS CONFIGURATION
// ---------------------------------------------------------------------
const CONFIG = {
  // SUPER ADMINISTRATOR (Platform Owner/Developer)
  SUPER_ADMIN: {
    email: process.env.SUPER_ADMIN_EMAIL || "superadmin@assessly.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123",
    name: "Assessly Platform Admin",
    role: "super_admin"
  },

  // SYSTEM ORGANIZATION for platform-level resources
  SYSTEM_ORGANIZATION: {
    name: "Assessly Platform System",
    description: "System organization for platform management, templates, and default content",
    slug: "assessly-system",
    type: "system",
    plan: "enterprise",
    ownerEmail: "system@assessly.com"
  },

  // DEFAULT SUBSCRIPTION PLANS for B2B SaaS
  SUBSCRIPTION_PLANS: [
    {
      name: "Free Tier",
      slug: "free",
      description: "Perfect for individuals and small teams getting started with assessments",
      price: { amount: 0, currency: "USD" },
      billingCycle: "monthly",
      features: {
        maxUsers: 3,
        maxAssessments: 10,
        maxStorage: 100,
        advancedAnalytics: false,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
        ssoIntegration: false,
        multiTenant: true,
        bulkImport: false,
        customReports: false
      },
      limits: {
        questionsPerAssessment: 20,
        candidatesPerAssessment: 50,
        responseRetention: 30,
        apiRateLimit: 100,
        concurrentAssessments: 5
      },
      isActive: true,
      isPublic: true,
      displayOrder: 1,
      recommendedFor: "Individuals & Small Teams"
    },
    {
      name: "Professional",
      slug: "professional", 
      description: "Advanced features for growing teams and businesses with multiple assessors",
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
        ssoIntegration: false,
        multiTenant: true,
        bulkImport: true,
        customReports: true
      },
      limits: {
        questionsPerAssessment: 50,
        candidatesPerAssessment: 500,
        responseRetention: 365,
        apiRateLimit: 1000,
        concurrentAssessments: 20
      },
      isActive: true,
      isPublic: true,
      displayOrder: 2,
      recommendedFor: "Growing Businesses"
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "Full-featured plan for large organizations with multiple departments and teams",
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
        ssoIntegration: true,
        multiTenant: true,
        bulkImport: true,
        customReports: true
      },
      limits: {
        questionsPerAssessment: 100,
        candidatesPerAssessment: 5000,
        responseRetention: 1095,
        apiRateLimit: 10000,
        concurrentAssessments: 100
      },
      isActive: true,
      isPublic: true,
      displayOrder: 3,
      recommendedFor: "Large Enterprises"
    }
  ],

  // SAMPLE ORGANIZATIONS for demonstration (multi-tenant)
  SAMPLE_ORGANIZATIONS: [
    {
      name: "TechCorp Solutions Inc.",
      description: "Technology consulting and software development company specializing in enterprise solutions",
      industry: "Technology & Software",
      size: "201-500",
      plan: "enterprise",
      users: [
        { 
          email: "admin@techcorp.com", 
          password: "Admin@123", 
          name: "Sarah Johnson", 
          role: "org_admin" 
        },
        { 
          email: "assessor@techcorp.com", 
          password: "Assessor@123", 
          name: "Michael Chen", 
          role: "assessor" 
        },
        { 
          email: "hr@techcorp.com", 
          password: "HR@123", 
          name: "David Wilson", 
          role: "assessor" 
        }
      ]
    },
    {
      name: "Global Education Institute",
      description: "International educational institution focusing on skills development and certification",
      industry: "Education & Training",
      size: "501-1000",
      plan: "professional",
      users: [
        { 
          email: "dean@gei.edu", 
          password: "Dean@123", 
          name: "Dr. Emily Rodriguez", 
          role: "org_admin" 
        },
        { 
          email: "faculty@gei.edu", 
          password: "Faculty@123", 
          name: "Prof. James Wilson", 
          role: "assessor" 
        }
      ]
    },
    {
      name: "HealthFirst Medical Group",
      description: "Healthcare provider network with multiple clinics and training facilities",
      industry: "Healthcare",
      size: "1001-5000",
      plan: "enterprise",
      users: [
        { 
          email: "admin@healthfirst.com", 
          password: "Admin@123", 
          name: "Dr. Robert Miller", 
          role: "org_admin" 
        },
        { 
          email: "training@healthfirst.com", 
          password: "Training@123", 
          name: "Nurse Jennifer Lee", 
          role: "assessor" 
        }
      ]
    }
  ],

  // ASSESSMENT TEMPLATES for multi-tenant platform
  ASSESSMENT_TEMPLATES: [
    {
      title: "Full-Stack Developer Technical Assessment",
      description: "Comprehensive technical evaluation covering frontend (React), backend (Node.js), database (MongoDB), and system design concepts. Includes coding challenges and architecture questions.",
      category: "Technical Screening",
      tags: ["javascript", "react", "nodejs", "mongodb", "system-design", "api-design"],
      status: "active",
      access: "organization",
      isTemplate: true,
      questions: [
        {
          type: "multiple-choice",
          question: "In React, what is the key difference between controlled and uncontrolled components?",
          description: "Understanding React component patterns",
          points: 10,
          options: [
            { id: "1", text: "Controlled components manage their own state, uncontrolled components are managed by parent", isCorrect: false },
            { id: "2", text: "Controlled components are managed by React state, uncontrolled components store state in the DOM", isCorrect: true },
            { id: "3", text: "Uncontrolled components use hooks, controlled components use classes", isCorrect: false },
            { id: "4", text: "There is no difference in modern React", isCorrect: false }
          ],
          explanation: "Controlled components have their state managed by React (via useState), while uncontrolled components store their state in the DOM and use refs to access values.",
          metadata: {
            difficulty: "medium",
            tags: ["react", "frontend", "state-management"],
            timeLimit: 60,
            topic: "React Fundamentals"
          }
        },
        {
          type: "single-choice",
          question: "What is the primary advantage of using indexes in MongoDB?",
          description: "Database performance optimization",
          points: 8,
          options: [
            { id: "1", text: "Data encryption", isCorrect: false },
            { id: "2", text: "Improved query performance", isCorrect: true },
            { id: "3", text: "Automatic backups", isCorrect: false },
            { id: "4", text: "Schema validation", isCorrect: false }
          ],
          explanation: "Indexes significantly improve query performance by creating optimized data structures that allow faster data retrieval, similar to a book index.",
          metadata: {
            difficulty: "medium",
            tags: ["mongodb", "database", "performance"],
            timeLimit: 45,
            topic: "Database Optimization"
          }
        }
      ],
      settings: {
        duration: 90,
        attempts: 2,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        allowBacktracking: false,
        requireFullScreen: true,
        webcamMonitoring: false,
        disableCopyPaste: true
      },
      totalPoints: 18,
      passingScore: 70,
      metadata: {
        estimatedTime: "90 minutes",
        difficulty: "intermediate",
        targetRole: "Senior Developer",
        industry: "Technology"
      }
    },
    {
      title: "Project Management Fundamentals",
      description: "Assessment covering core project management principles, methodologies (Agile/Waterfall), risk management, and team leadership concepts.",
      category: "Business & Management",
      tags: ["project-management", "agile", "leadership", "risk-management", "scrum"],
      status: "active",
      access: "public",
      isTemplate: true,
      questions: [
        {
          type: "multiple-choice",
          question: "Which of the following are key principles of Agile methodology? (Select all that apply)",
          description: "Understanding Agile fundamentals",
          points: 12,
          options: [
            { id: "1", text: "Customer collaboration over contract negotiation", isCorrect: true },
            { id: "2", text: "Comprehensive documentation over working software", isCorrect: false },
            { id: "3", text: "Responding to change over following a plan", isCorrect: true },
            { id: "4", text: "Following a strict project timeline", isCorrect: false },
            { id: "5", text: "Individuals and interactions over processes and tools", isCorrect: true }
          ],
          explanation: "The Agile Manifesto emphasizes: Individuals and interactions over processes and tools, Working software over comprehensive documentation, Customer collaboration over contract negotiation, and Responding to change over following a plan.",
          metadata: {
            difficulty: "easy",
            tags: ["agile", "methodology", "project-management"],
            timeLimit: 75,
            topic: "Agile Principles"
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
      totalPoints: 12,
      passingScore: 65,
      metadata: {
        estimatedTime: "60 minutes",
        difficulty: "beginner",
        targetRole: "Project Manager",
        industry: "All Industries"
      }
    }
  ]
};

// ---------------------------------------------------------------------
// MULTI-TENANT B2B SAAS SEEDER CLASS
// ---------------------------------------------------------------------
class MultiTenantSaaSSeeder {
  constructor() {
    this.session = null;
    this.superAdmin = null;
    this.systemOrg = null;
    this.stats = {
      superAdminCreated: false,
      systemOrganizations: 0,
      subscriptionPlans: 0,
      assessmentTemplates: 0,
      sampleOrganizations: 0,
      organizationAdmins: 0,
      assessors: 0,
      candidates: 0
    };
    this.isProduction = process.env.NODE_ENV === "production";
  }

  async connect() {
    if (!process.env.MONGODB_URI) {
      throw new Error("❌ MONGODB_URI environment variable is required for multi-tenant SaaS");
    }

    const options = {
      maxPoolSize: 15,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(chalk.green("✅ Connected to MongoDB for multi-tenant SaaS seeding"));
    console.log(chalk.blue(`🏢 Environment: ${this.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`));
    console.log(chalk.blue(`🎯 Platform: Multi-tenant B2B SaaS Assessment Platform`));
  }

  async disconnect() {
    if (this.session) {
      await this.session.endSession();
      this.session = null;
    }
    await mongoose.connection.close();
    console.log(chalk.blue("🔌 MongoDB connection closed"));
  }

  /**
   * Check if seeding should be skipped
   */
  async shouldSkipSeeding() {
    // Check for existing Super Admin
    const superAdminExists = await User.findOne({ 
      email: CONFIG.SUPER_ADMIN.email,
      role: 'super_admin'
    });
    
    // Check for system organization
    const systemOrgExists = await Organization.findOne({ 
      slug: CONFIG.SYSTEM_ORGANIZATION.slug,
      type: 'system'
    });

    if (superAdminExists && systemOrgExists) {
      console.log(chalk.yellow("⚠️  Multi-tenant SaaS seeding skipped - platform already initialized"));
      console.log(chalk.yellow("   Super Admin and System Organization already exist"));
      return true;
    }

    return false;
  }

  /**
   * Create SUPER ADMINISTRATOR (Platform Owner/Developer)
   */
  async createSuperAdministrator() {
    try {
      console.log(chalk.blue("\n👑 Creating Super Administrator (Platform Owner)..."));

      let superAdmin = await User.findOne({
        email: CONFIG.SUPER_ADMIN.email,
        role: 'super_admin'
      }).session(this.session);

      if (superAdmin) {
        console.log(chalk.yellow("ℹ️  Super Administrator already exists"));
        this.superAdmin = superAdmin;
        return superAdmin;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(CONFIG.SUPER_ADMIN.password, salt);

      superAdmin = await User.create([{
        email: CONFIG.SUPER_ADMIN.email,
        password: hashedPassword,
        name: CONFIG.SUPER_ADMIN.name,
        role: CONFIG.SUPER_ADMIN.role,
        isActive: true,
        emailVerified: true,
        profile: {
          avatar: null,
          bio: "Platform Super Administrator with full system access",
          company: "Assessly Platform",
          position: "Platform Administrator",
          timezone: "UTC"
        },
        preferences: {
          notifications: {
            email: true,
            push: false
          },
          language: "en",
          theme: "light"
        },
        lastLogin: new Date(),
        metadata: {
          isSuperAdmin: true,
          createdBy: "system",
          permissions: ["*"] // All permissions
        }
      }], { session: this.session });

      this.stats.superAdminCreated = true;
      this.superAdmin = superAdmin[0];
      
      console.log(chalk.green("✅ Super Administrator created successfully"));
      console.log(chalk.gray(`   Email: ${CONFIG.SUPER_ADMIN.email}`));
      console.log(chalk.gray(`   Role: ${CONFIG.SUPER_ADMIN.role}`));
      
      return superAdmin[0];
    } catch (error) {
      console.error(chalk.red("❌ Failed to create Super Administrator:"), error.message);
      throw error;
    }
  }

  /**
   * Create SYSTEM ORGANIZATION for platform management
   */
  async createSystemOrganization() {
    try {
      console.log(chalk.blue("\n🏢 Creating System Organization (Platform Management)..."));

      let systemOrg = await Organization.findOne({
        slug: CONFIG.SYSTEM_ORGANIZATION.slug,
        type: 'system'
      }).session(this.session);

      if (systemOrg) {
        console.log(chalk.yellow("ℹ️  System Organization already exists"));
        this.systemOrg = systemOrg;
        return systemOrg;
      }

      systemOrg = await Organization.create([{
        name: CONFIG.SYSTEM_ORGANIZATION.name,
        slug: CONFIG.SYSTEM_ORGANIZATION.slug,
        description: CONFIG.SYSTEM_ORGANIZATION.description,
        type: CONFIG.SYSTEM_ORGANIZATION.type,
        industry: "SaaS Platform",
        size: "system",
        contact: {
          email: CONFIG.SYSTEM_ORGANIZATION.ownerEmail,
          phone: null,
          website: "https://assesslyplatform.com"
        },
        settings: {
          isPublic: false,
          allowSelfRegistration: false,
          requireApproval: true,
          allowGoogleOAuth: true,
          allowEmailPassword: true,
          multiTenant: true,
          autoApprove: false
        },
        subscription: {
          plan: CONFIG.SYSTEM_ORGANIZATION.plan,
          status: "active",
          billingCycle: "yearly",
          price: { amount: 0, currency: "USD" },
          period: {
            startDate: new Date(),
            endDate: null // Never expires
          },
          features: {
            maxUsers: 10000,
            maxAssessments: 10000,
            maxStorage: 100000,
            advancedAnalytics: true,
            customBranding: true,
            apiAccess: true,
            prioritySupport: true,
            ssoIntegration: true
          }
        },
        metadata: {
          totalMembers: 1,
          totalAssessments: 0,
          totalResponses: 0,
          isSystem: true,
          platformVersion: process.env.API_VERSION || "1.0.0",
          createdAt: new Date()
        },
        createdBy: this.superAdmin?._id,
        createdAt: new Date(),
        updatedAt: new Date()
      }], { session: this.session });

      this.stats.systemOrganizations++;
      this.systemOrg = systemOrg[0];
      
      console.log(chalk.green("✅ System Organization created"));
      console.log(chalk.gray(`   Slug: ${CONFIG.SYSTEM_ORGANIZATION.slug}`));
      console.log(chalk.gray(`   Type: ${CONFIG.SYSTEM_ORGANIZATION.type}`));
      
      return systemOrg[0];
    } catch (error) {
      console.error(chalk.red("❌ Failed to create System Organization:"), error.message);
      throw error;
    }
  }

  /**
   * Create B2B SUBSCRIPTION PLANS
   */
  async createSubscriptionPlans() {
    try {
      console.log(chalk.blue("\n💳 Creating B2B SaaS Subscription Plans..."));

      const existingPlans = await Subscription.find({
        slug: { $in: CONFIG.SUBSCRIPTION_PLANS.map(plan => plan.slug) },
        isTemplate: true
      }).session(this.session);

      if (existingPlans.length === CONFIG.SUBSCRIPTION_PLANS.length) {
        console.log(chalk.yellow("ℹ️  Subscription plans already exist"));
        return existingPlans;
      }

      const plansWithDetails = CONFIG.SUBSCRIPTION_PLANS.map(plan => ({
        ...plan,
        isTemplate: true,
        isActive: plan.isActive,
        status: "active",
        createdBy: this.superAdmin?._id,
        organization: this.systemOrg?._id,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          isPublic: plan.isPublic,
          displayOrder: plan.displayOrder,
          recommendedFor: plan.recommendedFor
        }
      }));

      const subscriptions = await Subscription.create(plansWithDetails, { 
        session: this.session 
      });

      this.stats.subscriptionPlans += subscriptions.length;
      console.log(chalk.green(`✅ ${subscriptions.length} B2B SaaS subscription plans created`));
      console.log(chalk.gray(`   Plans: ${subscriptions.map(s => s.name).join(', ')}`));
      
      return subscriptions;
    } catch (error) {
      console.error(chalk.red("❌ Failed to create subscription plans:"), error.message);
      throw error;
    }
  }

  /**
   * Create ASSESSMENT TEMPLATES for multi-tenant platform
   */
  async createAssessmentTemplates() {
    try {
      console.log(chalk.blue("\n📝 Creating Multi-tenant Assessment Templates..."));

      if (!this.systemOrg) {
        throw new Error("System Organization required for assessment templates");
      }

      const existingTemplates = await Assessment.find({
        organization: this.systemOrg._id,
        isTemplate: true
      }).session(this.session);

      if (existingTemplates.length >= CONFIG.ASSESSMENT_TEMPLATES.length) {
        console.log(chalk.yellow("ℹ️  Assessment templates already exist"));
        return existingTemplates;
      }

      const templatesWithDetails = CONFIG.ASSESSMENT_TEMPLATES.map(template => ({
        ...template,
        slug: slugify(template.title, { lower: true, strict: true }),
        organization: this.systemOrg._id,
        createdBy: this.superAdmin?._id,
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
          isTemplate: true,
          templateCategory: template.category,
          estimatedTime: template.metadata?.estimatedTime,
          difficulty: template.metadata?.difficulty,
          targetRole: template.metadata?.targetRole,
          industry: template.metadata?.industry,
          createdAt: new Date()
        },
        totalPoints: template.questions.reduce((sum, q) => sum + q.points, 0)
      }));

      const assessments = await Assessment.create(templatesWithDetails, { 
        session: this.session 
      });

      this.stats.assessmentTemplates += assessments.length;
      console.log(chalk.green(`✅ ${assessments.length} multi-tenant assessment templates created`));
      console.log(chalk.gray(`   Templates: ${assessments.map(a => a.title).join(', ')}`));
      
      return assessments;
    } catch (error) {
      console.error(chalk.red("❌ Failed to create assessment templates:"), error.message);
      throw error;
    }
  }

  /**
   * Create SAMPLE ORGANIZATIONS with users (multi-tenant demonstration)
   */
  async createSampleOrganizations() {
    // Skip in production unless explicitly enabled
    if (this.isProduction && process.env.ENABLE_SAMPLE_DATA !== "true") {
      console.log(chalk.yellow("⚠️  Sample organizations skipped in production (set ENABLE_SAMPLE_DATA=true to enable)"));
      return [];
    }

    try {
      console.log(chalk.blue("\n🏢 Creating Sample Organizations (Multi-tenant Demonstration)..."));

      const createdOrgs = [];

      for (const orgData of CONFIG.SAMPLE_ORGANIZATIONS) {
        const slug = slugify(orgData.name, { lower: true, strict: true });
        
        let org = await Organization.findOne({ slug }).session(this.session);
        if (org) {
          console.log(chalk.yellow(`ℹ️  Sample organization already exists: ${orgData.name}`));
          createdOrgs.push(org);
          continue;
        }

        // Create organization
        org = await Organization.create([{
          name: orgData.name,
          slug: slug,
          description: orgData.description,
          industry: orgData.industry,
          size: orgData.size,
          type: "sample",
          contact: {
            email: orgData.users[0].email,
            phone: null,
            website: `https://${slug}.com`
          },
          settings: {
            isPublic: true,
            allowSelfRegistration: false,
            requireApproval: true,
            allowGoogleOAuth: true,
            allowEmailPassword: true,
            multiTenant: true
          },
          subscription: {
            plan: orgData.plan,
            status: "active",
            billingCycle: orgData.plan === "enterprise" ? "yearly" : "monthly"
          },
          metadata: {
            totalMembers: orgData.users.length,
            totalAssessments: 0,
            totalResponses: 0,
            isSample: true,
            createdAt: new Date()
          },
          createdBy: this.superAdmin?._id
        }], { session: this.session });

        const organization = org[0];
        
        // Create organization users
        for (const userData of orgData.users) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(userData.password, salt);
          
          await User.create([{
            email: userData.email,
            password: hashedPassword,
            name: userData.name,
            role: userData.role,
            isActive: true,
            emailVerified: true,
            organization: organization._id,
            organizations: [{
              organization: organization._id,
              role: userData.role,
              joinedAt: new Date(),
              isActive: true
            }],
            profile: {
              avatar: null,
              bio: `${userData.role} at ${orgData.name}`,
              company: orgData.name,
              position: userData.role === "org_admin" ? "Administrator" : "Assessor",
              timezone: "UTC"
            },
            lastLogin: new Date(),
            metadata: {
              isSampleUser: true,
              createdBy: "system",
              organization: orgData.name
            }
          }], { session: this.session });

          // Update stats
          if (userData.role === "org_admin") {
            this.stats.organizationAdmins++;
          } else if (userData.role === "assessor") {
            this.stats.assessors++;
          } else if (userData.role === "candidate") {
            this.stats.candidates++;
          }
        }

        this.stats.sampleOrganizations++;
        console.log(chalk.green(`✅ Sample organization created: ${orgData.name}`));
        console.log(chalk.gray(`   Users: ${orgData.users.length} (${orgData.users.map(u => `${u.name} (${u.role})`).join(', ')})`));
        
        createdOrgs.push(organization);
      }

      return createdOrgs;
    } catch (error) {
      console.error(chalk.red("❌ Failed to create sample organizations:"), error.message);
      throw error;
    }
  }

  /**
   * Link Super Admin to System Organization
   */
  async linkSuperAdminToSystemOrg() {
    try {
      if (!this.superAdmin || !this.systemOrg) {
        console.log(chalk.yellow("⚠️  Cannot link Super Admin - missing admin or organization"));
        return;
      }

      // Check if already linked
      const alreadyLinked = this.superAdmin.organizations?.some(
        org => org.organization.toString() === this.systemOrg._id.toString()
      );

      if (alreadyLinked) {
        console.log(chalk.yellow("ℹ️  Super Admin already linked to System Organization"));
        return;
      }

      // Add system organization to Super Admin's organizations
      await User.findByIdAndUpdate(
        this.superAdmin._id,
        {
          $addToSet: {
            organizations: {
              organization: this.systemOrg._id,
              role: "super_admin",
              joinedAt: new Date(),
              isActive: true,
              permissions: ["*"]
            }
          },
          organization: this.systemOrg._id
        },
        { session: this.session }
      );

      console.log(chalk.green("✅ Super Admin linked to System Organization"));
    } catch (error) {
      console.error(chalk.red("❌ Failed to link Super Admin:"), error.message);
      throw error;
    }
  }

  /**
   * Main seeding method for multi-tenant B2B SaaS
   */
  async seed() {
    const startTime = Date.now();

    try {
      console.log(chalk.cyan("\n🌱 Starting Multi-tenant B2B SaaS Database Seeding..."));
      console.log(chalk.gray("   Architecture: Super Admin → Organization Admin hierarchy"));
      console.log(chalk.gray("   Model: Multi-tenant B2B SaaS Assessment Platform"));
      
      await this.connect();

      // Check if we should skip seeding
      if (await this.shouldSkipSeeding()) {
        console.log(chalk.yellow("\n⚠️  Seeding skipped - Multi-tenant platform already initialized"));
        return { 
          success: true, 
          skipped: true, 
          message: "Multi-tenant SaaS platform already seeded" 
        };
      }

      // Start session for transaction
      this.session = await mongoose.startSession();
      await this.session.startTransaction();
      console.log(chalk.cyan("🔧 Multi-tenant transaction started"));

      // Execute seeding in proper order
      await this.createSuperAdministrator();
      await this.createSystemOrganization();
      await this.createSubscriptionPlans();
      await this.createAssessmentTemplates();
      await this.createSampleOrganizations();
      await this.linkSuperAdminToSystemOrg();

      // Commit transaction
      await this.session.commitTransaction();
      console.log(chalk.green("✅ Multi-tenant transaction committed"));

      const duration = Date.now() - startTime;

      // Summary
      console.log(chalk.magenta("\n🎉 Multi-tenant B2B SaaS Seeding Completed Successfully!"));
      console.log(chalk.blue("📊 Platform Statistics:"));
      console.log(`   👑 Super Admin: ${this.stats.superAdminCreated ? 'Created' : 'Exists'}`);
      console.log(`   🏢 System Organization: ${this.stats.systemOrganizations}`);
      console.log(`   💳 Subscription Plans: ${this.stats.subscriptionPlans}`);
      console.log(`   📝 Assessment Templates: ${this.stats.assessmentTemplates}`);
      console.log(`   🏢 Sample Organizations: ${this.stats.sampleOrganizations}`);
      console.log(`   👥 Organization Admins: ${this.stats.organizationAdmins}`);
      console.log(`   👨‍🏫 Assessors: ${this.stats.assessors}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);

      console.log(chalk.green("\n🚀 Multi-tenant Platform Ready For:"));
      console.log(`   🔐 Super Admin access (${CONFIG.SUPER_ADMIN.email})`);
      console.log(`   🏢 Organization creation and management`);
      console.log(`   💰 B2B subscription management (Free/Professional/Enterprise)`);
      console.log(`   📊 Multi-tenant assessment templates`);
      console.log(`   👥 Role-based access control (Super Admin → Org Admin → Assessor → Candidate)`);

      // Security note
      console.log(chalk.yellow("\n⚠️  IMPORTANT:"));
      console.log(chalk.yellow(`   • Change Super Admin password immediately: ${CONFIG.SUPER_ADMIN.email}`));
      console.log(chalk.yellow(`   • Update environment variables for production`));
      console.log(chalk.yellow(`   • Review and customize subscription plans as needed`));

      return {
        success: true,
        architecture: "Multi-tenant B2B SaaS",
        hierarchy: "Super Admin → Organization Admin → Assessor → Candidate",
        superAdmin: {
          email: CONFIG.SUPER_ADMIN.email,
          role: CONFIG.SUPER_ADMIN.role
        },
        systemOrganization: {
          name: CONFIG.SYSTEM_ORGANIZATION.name,
          slug: CONFIG.SYSTEM_ORGANIZATION.slug
        },
        subscriptionPlans: CONFIG.SUBSCRIPTION_PLANS.map(p => p.name),
        stats: this.stats,
        duration
      };

    } catch (error) {
      // Rollback transaction on error
      if (this.session) {
        await this.session.abortTransaction();
        console.log(chalk.red("🔄 Multi-tenant transaction rolled back due to error"));
      }
      
      console.error(chalk.red("\n❌ Multi-tenant SaaS seeding failed:"), error.message);
      console.error(chalk.red("   Platform initialization incomplete"));
      
      return {
        success: false,
        architecture: "Multi-tenant B2B SaaS",
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
  const seeder = new MultiTenantSaaSSeeder();
  
  console.log(chalk.bold.magenta("\n🔧 Assessly Platform - Multi-tenant B2B SaaS Seeder"));
  console.log(chalk.gray("==================================================="));
  
  seeder.seed()
    .then(result => {
      if (result.success) {
        if (result.skipped) {
          console.log(chalk.yellow.bold("\n⚠️  Seeding skipped - platform already initialized"));
        } else {
          console.log(chalk.green.bold("\n✨ Multi-tenant B2B SaaS platform seeded successfully!"));
          console.log(chalk.gray("   Ready for production deployment"));
        }
        process.exit(0);
      } else {
        console.log(chalk.red.bold("\n💥 Multi-tenant SaaS seeding failed"));
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(chalk.red("❌ Unhandled seeding error:"), error);
      process.exit(1);
    });
}

export { MultiTenantSaaSSeeder, CONFIG };
