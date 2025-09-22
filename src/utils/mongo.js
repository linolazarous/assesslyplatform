import { MongoClient } from 'mongodb';

// Cache the connection to reuse across requests
let cachedClient = null;
let cachedDb = null;

const connectToDatabase = async () => {
  // Check if we have a cached connection
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // If not, create a new connection
  const client = await MongoClient.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db('assesslyplatform'); // Replace with your database name

  // Cache the client and db
  cachedClient = client;
  cachedDb = db;

  return { client, db };
};

export default connectToDatabase;
