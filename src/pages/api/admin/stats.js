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
    
    // Use MongoDB's `estimatedDocumentCount` for quick stats
    const [assessments, users, organizations, completions] = await Promise.all([
      db.collection('assessments').estimatedDocumentCount(),
      db.collection('users').countDocuments({ active: true }),
      db.collection('organizations').estimatedDocumentCount(),
      db.collection('assessmentResponses').estimatedDocumentCount()
    ]);

    return res.status(200).json({
      assessments,
      activeUsers: users,
      organizations,
      completions
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
