import express from 'express';
import Subscription from '../models/Subscription.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// Get all subscriptions
router.get('/', asyncHandler(async (req, res) => {
  const subs = await Subscription.find().populate('organization', 'name slug');
  res.json(subs);
}));

// Get subscription by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const sub = await Subscription.findById(req.params.id).populate('organization', 'name slug');
  if (!sub) return res.status(404).json({ message: 'Subscription not found' });
  res.json(sub);
}));

// Create subscription
router.post('/', asyncHandler(async (req, res) => {
  const sub = new Subscription(req.body);
  await sub.save();
  res.status(201).json(sub);
}));

// Update subscription
router.put('/:id', asyncHandler(async (req, res) => {
  const sub = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!sub) return res.status(404).json({ message: 'Subscription not found' });
  res.json(sub);
}));

// Delete subscription
router.delete('/:id', asyncHandler(async (req, res) => {
  const sub = await Subscription.findByIdAndDelete(req.params.id);
  if (!sub) return res.status(404).json({ message: 'Subscription not found' });
  res.json({ message: 'Subscription deleted successfully' });
}));

export default router;
