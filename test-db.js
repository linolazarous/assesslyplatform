// test-db.js
import connectDB from './api/db.js';
import User from './api/models/User.js';

async function testDatabase() {
  try {
    console.log('🧪 Testing database connection...');
    await connectDB();
    
    console.log('🧪 Testing user creation...');
    const testUser = new User({
      name: 'Test User',
      email: 'test@assessly.com',
      password: 'testpassword123',
      role: 'admin'
    });
    
    await testUser.save();
    console.log('✅ Test user created successfully');
    
    console.log('🧪 Testing user retrieval...');
    const foundUser = await User.findOne({ email: 'test@assessly.com' });
    console.log('✅ User found:', foundUser ? foundUser.email : 'None');
    
    console.log('🧪 Testing password comparison...');
    const isValid = await foundUser.comparePassword('testpassword123');
    console.log('✅ Password comparison:', isValid ? 'Success' : 'Failed');
    
    // Clean up
    await User.deleteOne({ email: 'test@assessly.com' });
    console.log('✅ Test user cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();
