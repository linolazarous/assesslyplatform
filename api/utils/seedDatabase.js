import chalk from 'chalk';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

/**
 * Seeds the database with initial data if necessary.
 * Safe to run multiple times — will skip if data already exists.
 */
export async function seedDatabase() {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(chalk.cyan('\n🌱 Starting database seeding...'));

    // ─────────────────────────────────────────────
    // 1️⃣  Check if admin user already exists
    // ─────────────────────────────────────────────
    const existingAdmin = await User.findOne({ role: 'admin' }).session(session);
    if (existingAdmin) {
      console.log(chalk.yellow('⚠️  Seed skipped — admin user already exists.'));
      await session.endSession();
      return;
    }

    // ─────────────────────────────────────────────
    // 2️⃣  Check if database is not empty
    // ─────────────────────────────────────────────
    const userCount = await User.estimatedDocumentCount().session(session);
    const orgCount = await Organization.estimatedDocumentCount().session(session);

    if (userCount > 0 || orgCount > 0) {
      console.log(
        chalk.yellow(
          `⚠️  Seed skipped — existing data detected (${userCount} users, ${orgCount} orgs).`
        )
      );
      await session.endSession();
      return;
    }

    // ─────────────────────────────────────────────
    // 3️⃣  Create Default Organization
    // ─────────────────────────────────────────────
    const org = await Organization.create(
      [
        {
          name: 'Assessly Headquarters',
          slug: 'assessly-headquarters',
          subscription: { plan: 'professional', status: 'active' },
        },
      ],
      { session }
    );

    // ─────────────────────────────────────────────
    // 4️⃣  Create Admin User
    // ─────────────────────────────────────────────
    const admin = await User.create(
      [
        {
          name: 'System Admin',
          email: 'admin@assessly.com',
          password: 'Admin@123', // Model pre-save will hash
          role: 'admin',
          organization: org[0]._id,
          emailVerified: true,
        },
      ],
      { session }
    );

    // Link admin as owner
    org[0].owner = admin[0]._id;
    await org[0].save({ session });

    // ─────────────────────────────────────────────
    // 5️⃣  Commit Transaction
    // ─────────────────────────────────────────────
    await session.commitTransaction();
    session.endSession();

    console.log(chalk.green('✅ Admin user created:'), chalk.bold(admin[0].email));
    console.log(chalk.green('✅ Default organization created:'), chalk.bold(org[0].name));
    console.log(chalk.magenta('🎉 Database seeding completed successfully\n'));
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(chalk.red('❌ Database seeding failed:'), err.message);
  }
}
