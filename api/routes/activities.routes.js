// api/routes/activities.routes.js
import express from 'express';
import UserActivity from '../models/UserActivity.js';

const router = express.Router();

// Get recent activities
router.get('/', async (req, res) => {
  const { userId, limit = 50 } = req.query;
  const activities = userId
    ? await UserActivity.getRecentActivities(userId, parseInt(limit))
    : await UserActivity.find().sort({ createdAt: -1 }).limit(100);
  res.json(activities);
});

// Get activity by ID
router.get('/:id', async (req, res) => {
  const activity = await UserActivity.findById(req.params.id)
    .populate('user', 'name email')
    .populate('organization', 'name slug');
  if (!activity) return res.status(404).json({ message: 'Activity not found' });
  res.json(activity);
});

// Create activity
router.post('/', async (req, res) => {
  const activity = new UserActivity(req.body);
  await activity.save();
  res.status(201).json(activity);
});

export default router;
