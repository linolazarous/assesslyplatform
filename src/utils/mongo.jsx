// src/utils/mongo.jsx (SERVER-SIDE CODE - DO NOT IMPORT IN FRONTEND)
import { MongoClient } from 'mongodb';

// Cache the connection to reuse across requests
let cachedClient = null;
let cachedDb = null;

/**
 * Establishes and caches a connection to the MongoDB database.
 * NOTE: This relies on process.env.MONGO_URI being set in the Node environment.
 */
const connectToDatabase = async () => {
  // Check if we have a cached connection
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Ensure MONGO_URI is available
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set.');
  }

  // If not, create a new connection
  const client = await MongoClient.connect(process.env.MONGO_URI, {
    // The driver handles options automatically in modern versions
  });

  // Extract the database name from the URI or set a default
  const dbName = new URL(process.env.MONGO_URI).pathname.substring(1) || 'assesslyplatform';
  const db = client.db(dbName); 

  // Cache the client and db
  cachedClient = client;
  cachedDb = db;

  return { client, db };
};

export default connectToDatabase;
