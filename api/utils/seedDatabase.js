import chalk from 'chalk';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

/**
 * Seeds the database with initial data if necessary.
 * Safe to run multiple times — will skip if data already exists.
 */
export async function seedDatabase() {
  try {
    console.log(chalk.cyan('\n🌱 Starting database seeding...'));

    // ─────────────────────────────────────────────
    // 1️⃣  Check if admin user already exists
    // ─────────────────────────────────────────────
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(chalk.yellow('⚠️  Seed skipped — admin user already exists.'));
      return;
    }

    // ─────────────────────────────────────────────
    // 2️⃣  Check if database is not empty
    // ─────────────────────────────────────────────
    const userCount = await User.estimatedDocumentCount();
    const orgCount = await Organization.estimatedDocumentCount();

    if (userCount > 0 || orgCount > 0) {
      console.log(
        chalk.yellow(
          `⚠️  Seed skipped — existing data detected (${userCount} users, ${orgCount} orgs).`
        )
      );
      return;
    }

    // ─────────────────────────────────────────────
    // 3️⃣  Create Default Organization
    // ─────────────────────────────────────────────
    const org = await Organization.create({
      name: 'Assessly Headquarters',
      slug: 'assessly-headquarters',
      subscription: { plan: 'professional', status: 'active' },
    });

    // ─────────────────────────────────────────────
    // 4️⃣  Create Admin User
    // ─────────────────────────────────────────────
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@assessly.com',
      password: 'Admin@123', // You can later require manual password reset
      role: 'admin',
      organization: org._id,
      emailVerified: true,
    });

    // Link admin as owner
    org.owner = admin._id;
    await org.save();

    // ─────────────────────────────────────────────
    // 5️⃣  Log results
    // ─────────────────────────────────────────────
    console.log(chalk.green('✅ Admin user created:'), chalk.bold(admin.email));
    console.log(chalk.green('✅ Default organization created:'), chalk.bold(org.name));
    console.log(chalk.magenta('🎉 Database seeding completed successfully\n'));
  } catch (err) {
    console.error(chalk.red('❌ Database seeding failed:'), err.message);
  }
}
