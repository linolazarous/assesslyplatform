// api/utils/seedDatabase.js
import User from '../models/User.js';
import Organization from '../models/Organization.js';

export async function seedDatabase() {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('🌱 Seed skipped — admin user already exists.');
      return;
    }

    console.log('🌱 Starting database seeding...');

    const org = await Organization.create({
      name: 'Assessly Headquarters',
      slug: 'assessly-headquarters',
      owner: null, // will assign later after creating admin
      subscription: { plan: 'professional', status: 'active' }
    });

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@assessly.com',
      password: 'Admin@123',
      role: 'admin',
      organization: org._id,
      emailVerified: true
    });

    org.owner = admin._id;
    await org.save();

    console.log('✅ Admin user created:', admin.email);
    console.log('✅ Default organization created:', org.name);
    console.log('🎉 Database seeding completed successfully');
  } catch (err) {
    console.error('❌ Database seeding failed:', err);
  }
}
