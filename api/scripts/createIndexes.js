// api/scripts/createIndexes.js
import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../db.js'; // adjust path if needed
import mongoose from 'mongoose';

import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';

const ensureIndexes = async () => {
  try {
    await connectDB();

    console.log('Creating indexes (background)...');

    await Promise.all([
      User.createIndexes(),
      Organization.createIndexes(),
      Assessment.createIndexes(),
      Submission.createIndexes()
    ]);

    console.log('✅ Index creation triggered');
  } catch (err) {
    console.error('❌ Index creation error:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

ensureIndexes();
