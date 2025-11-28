// api/scripts/seed.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import slugify from "slugify";

import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Assessment from "../models/Assessment.js";
import Subscription from "../models/Subscription.js";

dotenv.config();

// ---------------------------------------------------------------------
// CONFIG – No hard-coded users. Multi-organization support added.
// ---------------------------------------------------------------------
const CONFIG = {
  ORGANIZATIONS: [
    {
      name: "Assessly Headquarters",
      description: "Primary enterprise organization",
      plan: "enterprise",
      seedAssessment: true
    },
    {
      name: "TechCorp Learning Division",
      description: "Technology company assessment unit",
      plan: "professional",
      seedAssessment: true
    },
    {
      name: "Global Institute of Skills",
      description: "Educational institution",
      plan: "basic",
      seedAssessment: false
    }
  ],

  SAMPLE_ASSESSMENT: {
    title: "Sample Technical Assessment",
    description: "Demonstrates platform capabilities",
    category: "Technical",
    tags: ["javascript", "programming", "nodejs"],
    status: "active"
  }
};

// ---------------------------------------------------------------------
// SEEDER CLASS
// ---------------------------------------------------------------------
class DatabaseSeeder {
  constructor() {
    this.stats = {
      organizations: 0,
      subscriptions: 0,
      assessments: 0
    };
  }

  async connect() {
    if (!process.env.MONGODB_URI) {
      throw new Error("❌ Missing MONGODB_URI");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10
    });

    console.log("✅ Connected to MongoDB");
  }

  async disconnect() {
    await mongoose.connection.close();
    console.log("🔌 DB connection closed");
  }

  //--------------------------------------------------------------------
  // UTILITY: Get admin for organization
  // Admin MUST be created via OAuth/email in the main platform.
  //--------------------------------------------------------------------
  async getAdminUser() {
    const admin = await User.findOne({ role: "admin" });

    if (!admin) {
      console.log(
        "\n⚠️ No admin user found.\n" +
        "👉 Create an admin via Google OAuth / Email-Password before running the seeder.\n"
      );
      return null;
    }

    console.log(`👤 Using admin: ${admin.email}`);
    return admin;
  }

  //--------------------------------------------------------------------
  // CREATE MULTIPLE ORGANIZATIONS
  //--------------------------------------------------------------------
  async createOrganizations(admin) {
    const created = [];

    for (const org of CONFIG.ORGANIZATIONS) {
      let existing = await Organization.findOne({ name: org.name });

      if (existing) {
        console.log(`ℹ️ Organization already exists: ${org.name}`);
        created.push(existing);
        continue;
      }

      const organization = new Organization({
        name: org.name,
        slug: slugify(org.name, { lower: true }),
        description: org.description,
        owner: admin._id,
        industry: "General",
        size: "10-50",
        contact: { email: admin.email },
        members: [
          {
            user: admin._id,
            role: "admin",
            joinedAt: new Date(),
            permissions: {
              createAssessments: true,
              manageUsers: true,
              viewAnalytics: true,
              manageSettings: true
            }
          }
        ],
        subscription: {
          plan: org.plan,
          status: "active"
        }
      });

      await organization.save();
      this.stats.organizations++;

      console.log(`🏢 Created organization: ${organization.name}`);
      created.push(organization);
    }

    return created;
  }

  //--------------------------------------------------------------------
  // SUBSCRIPTIONS
  //--------------------------------------------------------------------
  async createSubscription(organization, admin) {
    const planInfo = {
      free: { maxUsers: 10, maxAssessments: 5, price: 0 },
      basic: { maxUsers: 50, maxAssessments: 20, price: 29 },
      professional: { maxUsers: 200, maxAssessments: 100, price: 99 },
      enterprise: { maxUsers: 1000, maxAssessments: 500, price: 299 }
    };

    const plan = organization.subscription.plan;
    const details = planInfo[plan] || planInfo.basic;

    const subscription = new Subscription({
      organization: organization._id,
      plan: plan,
      billingCycle: "yearly",
      status: "active",
      price: { amount: details.price, currency: "USD" },
      period: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      features: {
        maxUsers: details.maxUsers,
        maxAssessments: details.maxAssessments,
        maxStorage: plan === "enterprise" ? 10000 : 1000,
        advancedAnalytics: plan !== "free",
        customBranding: plan === "enterprise",
        apiAccess: plan === "enterprise",
        prioritySupport: plan === "enterprise"
      },
      metadata: {
        createdBy: admin._id,
        autoRenew: true
      }
    });

    await subscription.save();
    this.stats.subscriptions++;

    console.log(`💳 Subscription created for ${organization.name}`);
    return subscription;
  }

  //--------------------------------------------------------------------
  // SAMPLE ASSESSMENTS
  //--------------------------------------------------------------------
  async createAssessment(organization, admin) {
    const exists = await Assessment.findOne({
      title: CONFIG.SAMPLE_ASSESSMENT.title,
      organization: organization._id
    });

    if (exists) {
      console.log(`📘 Assessment already exists for ${organization.name}`);
      return exists;
    }

    const assessment = new Assessment({
      ...CONFIG.SAMPLE_ASSESSMENT,
      organization: organization._id,
      createdBy: admin._id,
      totalPoints: 20,
      passingScore: 70,
      settings: {
        duration: 30,
        attempts: 3,
        shuffleQuestions: true,
        showResults: true
      }
    });

    await assessment.save();
    this.stats.assessments++;

    console.log(`📝 Sample assessment created for ${organization.name}`);
    return assessment;
  }

  //--------------------------------------------------------------------
  // FULL SEED
  //--------------------------------------------------------------------
  async seed() {
    try {
      console.log("🌱 Starting multi-organization seeding...");
      await this.connect();

      const admin = await this.getAdminUser();
      if (!admin) return;

      const organizations = await this.createOrganizations(admin);

      for (const org of organizations) {
        await this.createSubscription(org, admin);

        // Add default assessment only if enabled
        const config = CONFIG.ORGANIZATIONS.find(o => o.name === org.name);
        if (config?.seedAssessment) {
          await this.createAssessment(org, admin);
        }
      }

      console.log("\n🎉 MULTI-ORG SEED COMPLETE!");
      console.log(`🏢 Organizations:  ${this.stats.organizations}`);
      console.log(`💳 Subscriptions: ${this.stats.subscriptions}`);
      console.log(`📝 Assessments:   ${this.stats.assessments}`);

    } catch (err) {
      console.error("❌ Seeding failed:", err);
    } finally {
      await this.disconnect();
    }
  }
}

// Auto-run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  new DatabaseSeeder().seed();
}

export { DatabaseSeeder, CONFIG };
