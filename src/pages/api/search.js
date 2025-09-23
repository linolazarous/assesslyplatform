// pages/api/search.js

import connectToDatabase from '../../../src/utils/mongo';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { searchTerm, userId, type, limitCount = 20 } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.userId !== userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { db } = await connectToDatabase();

    let results = [];
    if (type === 'assessments') {
      const searchTermLower = searchTerm.toLowerCase();
      // MongoDB query for assessments
      results = await db.collection('assessments').find({
        organizationId: userId,
        $or: [
          { title: { $regex: searchTermLower, $options: 'i' } },
          { description: { $regex: searchTermLower, $options: 'i' } },
          { tags: { $in: [searchTermLower] } }
        ]
      }).limit(limitCount).toArray();

    } else if (type === 'questions') {
      const searchTermLower = searchTerm.toLowerCase();
      // MongoDB aggregation pipeline for questions
      results = await db.collection('assessments').aggregate([
        { $match: { organizationId: userId } },
        { $unwind: '$questions' },
        { $match: { 'questions.text': { $regex: searchTermLower, $options: 'i' } } },
        { $limit: limitCount },
        { $project: {
          _id: 0,
          id: '$questions.id',
          assessmentId: '$_id',
          assessmentTitle: '$title',
          text: '$questions.text'
        }}
      ]).toArray();
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error('API search error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
