import connectToDatabase from '../../../src/utils/mongo';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { db } = await connectToDatabase();
    const assessments = await db.collection('assessments')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return res.status(200).json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
