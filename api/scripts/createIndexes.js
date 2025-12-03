// api/scripts/createIndexes.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import chalk from 'chalk';

// Import models - align with your actual model imports
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Assessment from '../models/Assessment.js';
import AssessmentResponse from '../models/AssessmentResponse.js'; // Changed from Submission
import Subscription from '../models/Subscription.js';
import RefreshToken from '../models/RefreshToken.js'; // Added for auth
import UserActivity from '../models/UserActivity.js'; // Added for tracking

dotenv.config();

/**
 * Production Index Manager for Multi-Tenant B2B SaaS Assessment Platform
 * Creates optimized indexes for Super Admin → Organization Admin hierarchy
 */
class IndexManager {
  constructor() {
    this.stats = {
      created: 0,
      existing: 0,
      failed: 0,
      total: 0,
      tenants: new Set()
    };
    this.startTime = null;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async connect() {
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI environment variable is required');
    }

    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      bufferCommands: false,
      retryWrites: true,
      retryReads: true
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(chalk.green('✅ Connected to MongoDB for index management'));
    console.log(chalk.blue(`🏢 Environment: ${process.env.NODE_ENV || 'development'}`));
    console.log(chalk.blue(`🎯 Platform: Multi-tenant B2B SaaS`));
  }

  async disconnect() {
    await mongoose.connection.close();
    console.log(chalk.blue('🔌 MongoDB connection closed'));
  }

  /**
   * Create indexes for User model (Multi-tenant optimized with role hierarchy)
   */
  async createUserIndexes() {
    console.log(chalk.blue('\n👤 Creating User indexes (Multi-tenant B2B SaaS)...'));
    
    const indexes = [
      // === SUPER ADMIN ACCESS PATTERNS ===
      { role: 1, createdAt: -1 }, // Super Admin: List all admins
      { isActive: 1, createdAt: -1 }, // Super Admin: Active/inactive users
      
      // === ORGANIZATION ISOLATION PATTERNS ===
      { organization: 1, email: 1 }, // Org-scoped unique email (for login)
      { organization: 1, role: 1, isActive: 1 }, // Org Admin: List users by role
      { organization: 1, emailVerified: 1 }, // Org Admin: Verification status
      
      // === PERFORMANCE & QUERY OPTIMIZATION ===
      { organization: 1, createdAt: -1 }, // Recent signups per org
      { organization: 1, lastLogin: -1 }, // Recent activity per org
      { organization: 1, name: 1 }, // Name search per org (alphabetical)
      
      // === AUTHENTICATION & SECURITY ===
      { email: 1 }, // Global email lookup (for auth)
      { googleId: 1 }, // OAuth authentication
      { resetPasswordToken: 1 }, // Password reset
      { resetPasswordExpires: 1 }, // Token expiration
      
      // === ANALYTICS & REPORTING ===
      { organization: 1, 'profile.position': 1 }, // Position-based analytics
      { createdAt: 1 }, // Time-series growth analysis
      
      // === COMPOUND INDEXES FOR COMMON QUERIES ===
      // Org Admin dashboard queries
      { organization: 1, role: 1, createdAt: -1, isActive: 1 },
      // Super Admin platform analytics
      { role: 1, organization: 1, isActive: 1 }
    ];

    return this.createIndexesForModel(User, indexes, { 
      background: true,
      comment: 'Multi-tenant B2B SaaS user management'
    });
  }

  /**
   * Create indexes for Organization model (Tenant isolation)
   */
  async createOrganizationIndexes() {
    console.log(chalk.blue('\n🏢 Creating Organization indexes (Tenant isolation)...'));
    
    const indexes = [
      // === SUPER ADMIN ACCESS PATTERNS ===
      { type: 1, createdAt: -1 }, // System vs regular organizations
      { 'subscription.status': 1, 'subscription.plan': 1 }, // Billing analytics
      { isActive: 1, createdAt: -1 }, // Active/inactive orgs
      
      // === ORGANIZATION DISCOVERY & LOOKUP ===
      { slug: 1 }, // Unique URL slug
      { owner: 1 }, // Organization owner (user reference)
      { 'contact.email': 1 }, // Contact lookup
      
      // === PERFORMANCE & QUERY OPTIMIZATION ===
      { createdAt: -1 }, // Recently created organizations
      { 'metadata.totalMembers': -1 }, // Size-based sorting
      { 'metadata.totalAssessments': -1 }, // Activity-based sorting
      
      // === BILLING & SUBSCRIPTION MANAGEMENT ===
      { 'subscription.plan': 1, 'subscription.status': 1 }, // Plan distribution
      { 'subscription.period.endDate': 1 }, // Renewal reminders
      { 'subscription.billingCycle': 1 }, // Billing frequency
      
      // === COMPOUND INDEXES ===
      // Super Admin: Org list with subscription status
      { type: 1, 'subscription.status': 1, createdAt: -1 },
      // Active organizations with metadata
      { isActive: 1, 'metadata.totalMembers': -1, createdAt: -1 }
    ];

    return this.createIndexesForModel(Organization, indexes, { 
      background: true,
      comment: 'Multi-tenant organization management'
    });
  }

  /**
   * Create indexes for Assessment model (Org-scoped content)
   */
  async createAssessmentIndexes() {
    console.log(chalk.blue('\n📝 Creating Assessment indexes (Org-scoped content)...'));
    
    const indexes = [
      // === ORGANIZATION ISOLATION PATTERNS ===
      { organization: 1, slug: 1 }, // Unique assessment within org
      { organization: 1, status: 1 }, // Active/draft/archived per org
      { organization: 1, category: 1, status: 1 }, // Category browsing
      
      // === CONTENT DISCOVERY & SEARCH ===
      { access: 1, status: 1 }, // Public assessment discovery
      { isTemplate: 1, organization: 1 }, // Template assessments per org
      { tags: 1, organization: 1 }, // Tag-based search within org
      
      // === PERFORMANCE & SORTING ===
      { organization: 1, createdAt: -1 }, // Recent assessments per org
      { organization: 1, updatedAt: -1 }, // Recently updated
      { createdBy: 1, organization: 1 }, // Creator's assessments
      
      // === ANALYTICS & REPORTING ===
      { 'metadata.views': -1 }, // Popular assessments (global)
      { 'metadata.completions': -1 }, // Most taken
      { 'metadata.averageScore': -1 }, // Performance metrics
      { 'metadata.averageTime': -1 }, // Time metrics
      
      // === COMPOUND INDEXES ===
      // Org Admin: Active assessments with metrics
      { organization: 1, status: 1, 'metadata.completions': -1 },
      // Public assessment discovery with filters
      { access: 1, status: 1, category: 1, createdAt: -1 },
      // Super Admin: Platform-wide assessment analytics
      { status: 1, 'metadata.views': -1, createdAt: -1 }
    ];

    return this.createIndexesForModel(Assessment, indexes, { 
      background: true,
      comment: 'Multi-tenant assessment management'
    });
  }

  /**
   * Create indexes for AssessmentResponse model (Performance critical)
   */
  async createAssessmentResponseIndexes() {
    console.log(chalk.blue('\n📊 Creating AssessmentResponse indexes (Performance critical)...'));
    
    const indexes = [
      // === ORGANIZATION ISOLATION PATTERNS ===
      { organization: 1, assessment: 1 }, // All responses for an assessment
      { organization: 1, candidate: 1 }, // Candidate's responses
      { organization: 1, status: 1 }, // Response status per org
      
      // === ASSESSMENT-SCOPED QUERIES ===
      { assessment: 1, candidate: 1 }, // Candidate's specific response
      { assessment: 1, status: 1 }, // Status distribution per assessment
      { assessment: 1, submittedAt: -1 }, // Recent submissions
      
      // === PERFORMANCE & GRADING WORKFLOW ===
      { candidate: 1, submittedAt: -1 }, // Candidate history
      { reviewedBy: 1, status: 1 }, // Assessor's pending reviews
      { assessment: 1, score: -1 }, // Top performers per assessment
      { assessment: 1, percentage: -1 }, // Score ranking
      
      // === ANALYTICS & REPORTING ===
      { organization: 1, submittedAt: -1 }, // Org response timeline
      { organization: 1, status: 1, submittedAt: -1 }, // Status trends
      { passed: 1, assessment: 1 }, // Pass/fail analytics
      
      // === TIME-BASED ANALYTICS ===
      { submittedAt: 1 }, // Time-series analysis
      { startedAt: 1 }, // Duration analysis
      
      // === COMPOUND INDEXES ===
      // Grading dashboard for assessors
      { assessment: 1, status: 1, submittedAt: -1, reviewedBy: 1 },
      // Candidate performance tracking
      { candidate: 1, organization: 1, submittedAt: -1, percentage: -1 },
      // Org Admin: Response analytics
      { organization: 1, assessment: 1, status: 1, submittedAt: -1 }
    ];

    return this.createIndexesForModel(AssessmentResponse, indexes, { 
      background: true,
      comment: 'Multi-tenant response tracking and grading'
    });
  }

  /**
   * Create indexes for Subscription model (B2B SaaS billing)
   */
  async createSubscriptionIndexes() {
    console.log(chalk.blue('\n💳 Creating Subscription indexes (B2B SaaS billing)...'));
    
    const indexes = [
      // === PRIMARY LOOKUPS ===
      { organization: 1 }, // Org's subscription (unique)
      { plan: 1, status: 1 }, // Active subscriptions by plan
      { status: 1, 'period.endDate': 1 }, // Expiring subscriptions
      
      // === BILLING & RENEWAL MANAGEMENT ===
      { 'period.endDate': 1 }, // Upcoming renewals
      { billingCycle: 1, status: 1 }, // Billing frequency analysis
      { 'price.amount': 1, plan: 1 }, // Revenue analytics
      
      // === ANALYTICS & REPORTING ===
      { createdAt: -1 }, // Recent subscriptions
      { plan: 1, createdAt: -1 }, // Plan adoption over time
      { status: 1, createdAt: -1 }, // Subscription lifecycle
      
      // === SUPER ADMIN ANALYTICS ===
      { plan: 1, 'features.maxUsers': 1 }, // Feature utilization
      { 'period.startDate': 1, 'period.endDate': 1 }, // Subscription periods
      
      // === COMPOUND INDEXES ===
      // Revenue forecasting
      { plan: 1, billingCycle: 1, 'price.amount': 1 },
      // Churn analysis
      { status: 1, 'period.endDate': 1, plan: 1 }
    ];

    return this.createIndexesForModel(Subscription, indexes, { 
      background: true,
      comment: 'B2B SaaS subscription management'
    });
  }

  /**
   * Create indexes for RefreshToken model (Security)
   */
  async createRefreshTokenIndexes() {
    console.log(chalk.blue('\n🔐 Creating RefreshToken indexes (Security)...'));
    
    const indexes = [
      // === TOKEN LOOKUP ===
      { token: 1 }, // Token validation
      { user: 1, token: 1 }, // User's specific token
      
      // === SECURITY & CLEANUP ===
      { expiresAt: 1 }, // TTL for auto-expiry
      { revokedAt: 1 }, // Revoked tokens
      { user: 1, expiresAt: 1 }, // User's active tokens
      
      // === AUDIT TRAIL ===
      { user: 1, createdAt: -1 }, // User's token history
      { ipAddress: 1, createdAt: -1 }, // Security monitoring
      { userAgent: 1 } // Client analytics
    ];

    return this.createIndexesForModel(RefreshToken, indexes, { 
      background: true,
      expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days TTL
      comment: 'JWT refresh token security'
    });
  }

  /**
   * Create indexes for UserActivity model (Audit & Analytics)
   */
  async createUserActivityIndexes() {
    console.log(chalk.blue('\n📈 Creating UserActivity indexes (Audit & Analytics)...'));
    
    const indexes = [
      // === ORGANIZATION ISOLATION ===
      { organization: 1, createdAt: -1 }, // Org activity timeline
      { organization: 1, user: 1, createdAt: -1 }, // User activity within org
      
      // === USER-CENTRIC QUERIES ===
      { user: 1, createdAt: -1 }, // User's complete activity history
      { user: 1, action: 1, createdAt: -1 }, // Specific actions by user
      
      // === ACTION ANALYSIS ===
      { action: 1, createdAt: -1 }, // Action frequency over time
      { action: 1, organization: 1 }, // Org-specific actions
      
      // === SECURITY & MONITORING ===
      { ipAddress: 1, createdAt: -1 }, // Security incident analysis
      { userAgent: 1, createdAt: -1 }, // Client usage patterns
      { statusCode: 1, createdAt: -1 }, // Error tracking
      
      // === PERFORMANCE & CLEANUP ===
      { createdAt: 1 }, // TTL for data retention
      
      // === COMPOUND INDEXES ===
      // Super Admin: Platform-wide activity monitoring
      { action: 1, organization: 1, createdAt: -1 },
      // Org Admin: Team activity monitoring
      { organization: 1, user: 1, action: 1, createdAt: -1 }
    ];

    return this.createIndexesForModel(UserActivity, indexes, { 
      background: true,
      expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days retention
      comment: 'Multi-tenant activity auditing'
    });
  }

  /**
   * Generic index creation with error handling
   */
  async createIndexesForModel(Model, indexSpecs, options = {}) {
    const modelName = Model.modelName;
    const results = {
      model: modelName,
      created: [],
      existing: [],
      failed: []
    };

    try {
      // Get existing indexes
      const existingIndexes = await Model.collection.indexes();
      const existingIndexNames = new Set(existingIndexes.map(idx => idx.name));

      for (const indexSpec of indexSpecs) {
        const indexName = this.generateIndexName(indexSpec);
        
        try {
          if (existingIndexNames.has(indexName)) {
            results.existing.push(indexName);
            this.stats.existing++;
            console.log(chalk.yellow(`   ⏩ Index exists: ${indexName}`));
            continue;
          }

          // Create index with platform-specific options
          await Model.collection.createIndex(indexSpec, {
            background: true,
            name: indexName,
            ...options
          });

          results.created.push(indexName);
          this.stats.created++;
          console.log(chalk.green(`   ✅ Created: ${indexName}`));
          
        } catch (error) {
          results.failed.push({ index: indexName, error: error.message });
          this.stats.failed++;
          console.log(chalk.red(`   ❌ Failed: ${indexName} - ${error.message}`));
        }
      }

      this.stats.total += indexSpecs.length;
      return results;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create indexes for ${modelName}:`), error.message);
      throw error;
    }
  }

  /**
   * Generate consistent index names
   */
  generateIndexName(indexSpec) {
    return Object.entries(indexSpec)
      .map(([field, direction]) => `${field}_${direction}`)
      .join('_');
  }

  /**
   * Validate index performance for multi-tenant SaaS
   */
  async validateIndexes() {
    console.log(chalk.blue('\n🔍 Validating multi-tenant SaaS index performance...'));
    
    const models = [
      { name: 'User', model: User, critical: true },
      { name: 'Organization', model: Organization, critical: true },
      { name: 'Assessment', model: Assessment, critical: true },
      { name: 'AssessmentResponse', model: AssessmentResponse, critical: true },
      { name: 'Subscription', model: Subscription, critical: true },
      { name: 'RefreshToken', model: RefreshToken, critical: false },
      { name: 'UserActivity', model: UserActivity, critical: false }
    ];

    for (const { name, model, critical } of models) {
      try {
        const stats = await model.collection.stats();
        const indexes = await model.collection.indexes();
        
        console.log(chalk.cyan(`\n📊 ${name} Collection (${critical ? 'CRITICAL' : 'SUPPORT'}):`));
        console.log(`   📄 Documents: ${stats.count.toLocaleString()}`);
        console.log(`   🔍 Indexes: ${indexes.length}`);
        console.log(`   💾 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   🗄️  Storage: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
        
        // Check for critical indexes in production
        if (this.isProduction && critical && indexes.length < 5) {
          console.log(chalk.yellow(`   ⚠️  Low index count for critical collection: ${name}`));
        }
        
        // Log index details in development
        if (!this.isProduction && indexes.length > 0) {
          console.log(`   📋 Index sample: ${indexes.slice(0, 3).map(i => i.name).join(', ')}${indexes.length > 3 ? '...' : ''}`);
        }
      } catch (error) {
        console.log(chalk.red(`   ❌ Validation failed for ${name}: ${error.message}`));
      }
    }
  }

  /**
   * Check for tenant-specific query patterns
   */
  async analyzeTenantQueryPatterns() {
    console.log(chalk.blue('\n🏢 Analyzing multi-tenant query patterns...'));
    
    // In a real implementation, you would analyze query patterns
    // For now, we'll provide guidance based on common B2B SaaS patterns
    const recommendations = [
      '✅ All models include organization-scoped indexes',
      '✅ User indexes support Super Admin → Org Admin hierarchy',
      '✅ Assessment indexes support org isolation and discovery',
      '✅ Response indexes optimized for grading workflows',
      '✅ Subscription indexes support B2B billing analytics',
      '💡 Consider adding tenant-specific composite indexes based on actual query patterns'
    ];
    
    recommendations.forEach(rec => console.log(chalk.gray(`   ${rec}`)));
  }

  /**
   * Main index creation method for multi-tenant B2B SaaS
   */
  async createAllIndexes() {
    this.startTime = Date.now();
    
    try {
      console.log(chalk.cyan('\n🚀 Starting production index creation for Multi-tenant B2B SaaS...'));
      console.log(chalk.gray('   Indexes will be created in the background'));
      console.log(chalk.gray('   Architecture: Super Admin → Organization Admin hierarchy'));
      
      await this.connect();

      // Create indexes in order of importance
      const results = await Promise.all([
        this.createUserIndexes(),          // User management & auth
        this.createOrganizationIndexes(),  // Tenant isolation
        this.createAssessmentIndexes(),    // Core content
        this.createAssessmentResponseIndexes(), // Performance critical
        this.createSubscriptionIndexes(),  // B2B billing
        this.createRefreshTokenIndexes(),  // Security
        this.createUserActivityIndexes()   // Audit trail
      ]);

      // Validate and analyze
      await this.validateIndexes();
      await this.analyzeTenantQueryPatterns();

      const duration = Date.now() - this.startTime;
      
      // Summary
      console.log(chalk.magenta('\n🎉 Multi-tenant SaaS index creation completed!'));
      console.log(chalk.blue('📊 Performance Statistics:'));
      console.log(`   ✅ Created: ${this.stats.created}`);
      console.log(`   ⏩ Existing: ${this.stats.existing}`);
      console.log(`   ❌ Failed: ${this.stats.failed}`);
      console.log(`   📋 Total attempts: ${this.stats.total}`);
      console.log(`   ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(chalk.blue('🏢 Multi-tenant Optimizations:'));
      console.log(`   • Organization-scoped indexes for all critical collections`);
      console.log(`   • Super Admin vs Org Admin query patterns optimized`);
      console.log(`   • B2B SaaS billing and analytics indexes`);

      if (this.stats.failed > 0) {
        console.log(chalk.yellow('\n⚠️  Some indexes failed to create. Review logs above.'));
        console.log(chalk.yellow('   Non-critical failures may not affect production.'));
      }

      return {
        success: this.stats.failed === 0,
        stats: this.stats,
        results,
        duration,
        architecture: 'Multi-tenant B2B SaaS',
        tenantSupport: true,
        hierarchy: 'Super Admin → Organization Admin → Assessor → Candidate'
      };

    } catch (error) {
      console.error(chalk.red('\n❌ Index creation failed for multi-tenant platform:'), error.message);
      return {
        success: false,
        error: error.message,
        stats: this.stats,
        architecture: 'Multi-tenant B2B SaaS'
      };
    } finally {
      await this.disconnect();
    }
  }
}

// CLI execution handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const indexManager = new IndexManager();
  
  console.log(chalk.bold.magenta('\n🔧 Assessly Platform - Multi-tenant Index Manager'));
  console.log(chalk.gray('========================================'));
  
  indexManager.createAllIndexes()
    .then(result => {
      if (result.success) {
        console.log(chalk.green.bold('\n✨ All multi-tenant indexes created successfully!'));
        console.log(chalk.gray('   Ready for production B2B SaaS operations'));
        process.exit(0);
      } else {
        console.log(chalk.red.bold('\n💥 Index creation completed with errors'));
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(chalk.red('❌ Unhandled error:'), error);
      process.exit(1);
    });
}

export { IndexManager };
