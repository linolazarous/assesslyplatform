import connectToDatabase from '../../../src/utils/mongo';
import { stripe } from '../../../src/utils/stripe';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, displayName, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const orgsCollection = db.collection('organizations');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Hash password (you need a hashing library like 'bcrypt')
    // const hashedPassword = await hashPassword(password);

    // Create Stripe customer
    const stripeCustomer = await stripe.customers.create({
      email,
      name: displayName || email.split('@')[0],
      metadata: { uid: 'temporary-uid' } // Placeholder, as no Firebase UID
    });

    const newOrgId = new ObjectId();
    const newUserId = new ObjectId();
    
    // Create new user and organization documents
    const newUser = {
      _id: newUserId,
      email,
      password, // Replace with hashed password
      displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
      organizations: {
        [newOrgId.toHexString()]: 'admin',
      },
    };

    const newOrg = {
      _id: newOrgId,
      name: `${displayName || email.split('@')[0]}'s Organization`,
      ownerId: newUserId.toHexString(),
      members: [newUserId.toHexString()],
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: stripeCustomer.id,
      subscription: {
        plan: 'free',
        status: 'active',
        createdAt: new Date(),
      },
    };

    await orgsCollection.insertOne(newOrg);
    await usersCollection.insertOne(newUser);
    
    // Update Stripe customer metadata with the real UID
    await stripe.customers.update(stripeCustomer.id, { metadata: { uid: newUserId.toHexString() } });

    // The token creation logic is now in `pages/api/auth/login.js`
    // This endpoint should only register the user.
    return res.status(201).json({ message: 'User and organization created successfully' });

  } catch (error) {
    console.error('User creation failed:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
