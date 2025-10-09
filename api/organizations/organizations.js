import connectToDatabase from '../../../src/utils/mongo';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { orgId } = req.params; // Changed from req.query to req.params
  const token = req.headers.authorization?.split(' ')[1];

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { db } = await connectToDatabase();
    const orgsCollection = db.collection('organizations');

    // Security: Check if user has access to this organization
    const userOrgRole = decoded.orgs?.[orgId];
    if (!userOrgRole) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const orgData = await orgsCollection.findOne({ _id: new ObjectId(orgId) });
    if (!orgData) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Exclude sensitive data before sending
    const sanitizedData = {
      id: orgData._id,
      name: orgData.name,
      members: orgData.members,
      stripeCustomerId: orgData.stripeCustomerId,
      subscription: orgData.subscription,
      createdAt: orgData.createdAt,
    };

    return res.status(200).json(sanitizedData);
  } catch (error) {
    console.error('Error fetching organization data:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
