import connectToDatabase from '../../../src/utils/mongo';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password, role } = req.body;

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the new user
    const newUser = {
      email,
      password: hashedPassword,
      role: role || 'candidate', // Default to 'candidate' if no role is provided
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    // Create a JWT token for the new user
    const token = jwt.sign({ userId: result.insertedId, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: { id: result.insertedId, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
