// api/routes/userActivities.js
import express from 'express';
import UserActivity from '../models/UserActivity.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// Get recent activities
router.get('/', asyncHandler(async (req, res) => {
  const activities = await UserActivity.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('user', 'name email')
    .populate('organization', 'name slug');
  res.json(activities);
}));

// Get activity by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const activity = await UserActivity.findById(req.params.id)
    .populate('user', 'name email')
    .populate('organization', 'name slug');
  if (!activity) return res.status(404).json({ message: 'Activity not found' });
  res.json(activity);
}));

// Create activity
router.post('/', asyncHandler(async (req, res) => {
  const activity = new UserActivity(req.body);
  await activity.save();
  res.status(201).json(activity);
}));

// Delete activity
router.delete('/:id', asyncHandler(async (req, res) => {
  const activity = await UserActivity.findByIdAndDelete(req.params.id);
  if (!activity) return res.status(404).json({ message: 'Activity not found' });
  res.json({ message: 'Activity deleted successfully' });
}));

export default router;
