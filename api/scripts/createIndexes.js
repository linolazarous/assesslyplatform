// api/scripts/createIndexes.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import chalk from 'chalk';

// Import models
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import Subscription from '../models/Subscription.js';
import Activity from '../models/Activity.js';

dotenv.config();

/**
 * Production Index Manager for Multi-Tenant Assessment Platform
 * Creates optimized indexes for performance and query efficiency
 */
class IndexManager {
  constructor() {
    this.stats = {
      created: 0,
      existing: 0,
      failed: 0,
      total: 0
    };
    this.startTime = null;
  }

  async connect() {
    if (!process.env.MONGODB_URI) {
      throw new Error('❌ MONGODB_URI environment variable is required');
    }

    const options = {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(chalk.green('✅ Connected to MongoDB'));
  }

  async disconnect() {
    await mongoose.connection.close();
    console.log(chalk.blue('🔌 MongoDB connection closed'));
  }

  /**
   * Create indexes for User model (multi-tenant optimized)
   */
  async createUserIndexes() {
    console.log(chalk.blue('👤 Creating User indexes...'));
    
    const indexes = [
      // Primary query patterns
      { email: 1 }, // Unique email per organization
      { organization: 1, email: 1 }, // Org-scoped email lookup
      { organization: 1, role: 1 }, // Role-based queries
      { organization: 1, isActive: 1 }, // Active users per org
      
      // Authentication and lookup
      { googleId: 1 }, // OAuth lookup
      { emailVerified: 1 }, // Verification status
      { lastLogin: -1 }, // Recent activity
      
      // Performance indexes
      { organization: 1, createdAt: -1 }, // Recent users per org
      { organization: 1, name: 1 }, // Name search per org
      
      // Compound indexes for common queries
      { organization: 1, role: 1, isActive: 1 },
      { organization: 1, createdAt: -1, isActive: 1 }
    ];

    return this.createIndexesForModel(User, indexes, { 
      background: true,
      unique: false // Handle unique constraints in schema
    });
  }

  /**
   * Create indexes for Organization model
   */
  async createOrganizationIndexes() {
    console.log(chalk.blue('🏢 Creating Organization indexes...'));
    
    const indexes = [
      // Primary lookups
      { slug: 1 }, // Unique slug for URLs
      { owner: 1 }, // Organization owner
      
      // Query patterns
      { type: 1 }, // System vs regular orgs
      { 'subscription.plan': 1 }, // Plan-based queries
      { 'subscription.status': 1 }, // Subscription status
      
      // Performance
      { createdAt: -1 }, // Recent organizations
      { 'settings.isPublic': 1 }, // Public org discovery
      
      // Analytics and reporting
      { 'metadata.totalMembers': -1 }, // Popular organizations
      { 'metadata.totalAssessments': -1 }
    ];

    return this.createIndexesForModel(Organization, indexes, { 
      background: true 
    });
  }

  /**
   * Create indexes for Assessment model (multi-tenant optimized)
   */
  async createAssessmentIndexes() {
    console.log(chalk.blue('📝 Creating Assessment indexes...'));
    
    const indexes = [
      // Primary query patterns
      { organization: 1, slug: 1 }, // Org-scoped assessment lookup
      { organization: 1, status: 1 }, // Active assessments per org
      { organization: 1, category: 1 }, // Category browsing
      
      // Content discovery
      { access: 1, status: 1 }, // Public assessment discovery
      { isTemplate: 1 }, // Template assessments
      { tags: 1 }, // Tag-based search
      
      // Performance and sorting
      { organization: 1, createdAt: -1 }, // Recent assessments
      { organization: 1, updatedAt: -1 }, // Recently updated
      { createdBy: 1 }, // Creator lookup
      
      // Analytics and reporting
      { 'metadata.views': -1 }, // Popular assessments
      { 'metadata.completions': -1 },
      { 'metadata.averageScore': -1 },
      
      // Compound indexes for complex queries
      { organization: 1, status: 1, createdAt: -1 },
      { organization: 1, category: 1, status: 1 },
      { access: 1, status: 1, createdAt: -1 }
    ];

    return this.createIndexesForModel(Assessment, indexes, { 
      background: true 
    });
  }

  /**
   * Create indexes for Submission model (performance critical)
   */
  async createSubmissionIndexes() {
    console.log(chalk.blue('📊 Creating Submission indexes...'));
    
    const indexes = [
      // Primary query patterns
      { assessment: 1, candidateEmail: 1 }, // Candidate submissions
      { assessment: 1, status: 1 }, // Status-based queries
      { organization: 1, assessment: 1 }, // Org-scoped submissions
      
      // Performance and sorting
      { assessment: 1, submittedAt: -1 }, // Recent submissions
      { candidateEmail: 1, submittedAt: -1 }, // Candidate history
      { createdBy: 1 }, // Assessor lookup
      
      // Grading and review workflow
      { status: 1, submittedAt: -1 }, // Pending reviews
      { assessment: 1, score: -1 }, // Top performers
      
      // Analytics and reporting
      { organization: 1, submittedAt: -1 }, // Org analytics
      { assessment: 1, status: 1, submittedAt: -1 },
      
      // Time-based analytics
      { submittedAt: 1 }, // Time-series analysis
      { organization: 1, status: 1, submittedAt: 1 }
    ];

    return this.createIndexesForModel(Submission, indexes, { 
      background: true 
    });
  }

  /**
   * Create indexes for Subscription model
   */
  async createSubscriptionIndexes() {
    console.log(chalk.blue('💳 Creating Subscription indexes...'));
    
    const indexes = [
      // Primary lookups
      { organization: 1 }, // Org subscription
      { plan: 1 }, // Plan-based queries
      { status: 1 }, // Active/inactive subscriptions
      
      // Billing and renewal
      { 'period.endDate': 1 }, // Upcoming renewals
      { billingCycle: 1 }, // Billing frequency
      
      // Analytics
      { createdAt: -1 }, // Recent subscriptions
      { plan: 1, status: 1 }, // Plan distribution
      
      // Compound indexes
      { status: 1, 'period.endDate': 1 } // Expiring subscriptions
    ];

    return this.createIndexesForModel(Subscription, indexes, { 
      background: true 
    });
  }

  /**
   * Create indexes for Activity model (audit logging)
   */
  async createActivityIndexes() {
    console.log(chalk.blue('📈 Creating Activity indexes...'));
    
    const indexes = [
      // Primary query patterns
      { organization: 1, createdAt: -1 }, // Org activity timeline
      { user: 1, createdAt: -1 }, // User activity history
      { action: 1, createdAt: -1 }, // Action-type analysis
      
      // Performance and cleanup
      { createdAt: 1 }, // TTL and archiving
      { organization: 1, user: 1, createdAt: -1 },
      
      // Security and monitoring
      { ipAddress: 1, createdAt: -1 }, // Security analysis
      { userAgent: 1 } // Client analytics
    ];

    return this.createIndexesForModel(Activity, indexes, { 
      background: true,
      expireAfterSeconds: 90 * 24 * 60 * 60 // 90 days TTL
    });
  }

  /**
   * Generic index creation method with error handling
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

          await Model.collection.createIndex(indexSpec, {
            background: true,
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
   * Validate index performance
   */
  async validateIndexes() {
    console.log(chalk.blue('\n🔍 Validating index performance...'));
    
    const models = [
      { name: 'User', model: User },
      { name: 'Organization', model: Organization },
      { name: 'Assessment', model: Assessment },
      { name: 'Submission', model: Submission },
      { name: 'Subscription', model: Subscription },
      { name: 'Activity', model: Activity }
    ];

    for (const { name, model } of models) {
      try {
        const stats = await model.collection.stats();
        const indexes = await model.collection.indexes();
        
        console.log(chalk.cyan(`\n📊 ${name} Collection:`));
        console.log(`   Documents: ${stats.count.toLocaleString()}`);
        console.log(`   Indexes: ${indexes.length}`);
        console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Storage: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
        
        // Check for missing critical indexes
        if (indexes.length < 3) {
          console.log(chalk.yellow(`   ⚠️  Low index count for ${name}`));
        }
      } catch (error) {
        console.log(chalk.red(`   ❌ Validation failed for ${name}: ${error.message}`));
      }
    }
  }

  /**
   * Main index creation method
   */
  async createAllIndexes() {
    this.startTime = Date.now();
    
    try {
      console.log(chalk.cyan('\n🚀 Starting production index creation...'));
      console.log(chalk.gray('   Indexes will be created in the background'));
      
      await this.connect();

      // Create indexes for all models
      const results = await Promise.all([
        this.createUserIndexes(),
        this.createOrganizationIndexes(),
        this.createAssessmentIndexes(),
        this.createSubmissionIndexes(),
        this.createSubscriptionIndexes(),
        this.createActivityIndexes()
      ]);

      // Validate results
      await this.validateIndexes();

      const duration = Date.now() - this.startTime;
      
      // Summary
      console.log(chalk.magenta('\n🎉 Index creation completed!'));
      console.log(chalk.blue('📊 Index Statistics:'));
      console.log(`   ✅ Created: ${this.stats.created}`);
      console.log(`   ⏩ Existing: ${this.stats.existing}`);
      console.log(`   ❌ Failed: ${this.stats.failed}`);
      console.log(`   📋 Total: ${this.stats.total}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);

      if (this.stats.failed > 0) {
        console.log(chalk.yellow('\n⚠️  Some indexes failed to create. Check logs above.'));
      }

      return {
        success: this.stats.failed === 0,
        stats: this.stats,
        results,
        duration
      };

    } catch (error) {
      console.error(chalk.red('\n❌ Index creation failed:'), error.message);
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
  const indexManager = new IndexManager();
  
  indexManager.createAllIndexes()
    .then(result => {
      if (result.success) {
        console.log(chalk.green('\n✨ All indexes created successfully!'));
        process.exit(0);
      } else {
        console.log(chalk.red('\n💥 Index creation completed with errors'));
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(chalk.red('❌ Unhandled error:'), error);
      process.exit(1);
    });
}

export { IndexManager };
