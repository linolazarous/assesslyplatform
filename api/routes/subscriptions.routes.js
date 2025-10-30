// api/routes/subscriptions.routes.js
import express from 'express';
import Subscription from '../models/Subscription.js';

const router = express.Router();

// Get all subscriptions
router.get('/', async (req, res) => {
  const subs = await Subscription.find().populate('organization');
  res.json(subs);
});

// Get one subscription
router.get('/:id', async (req, res) => {
  const sub = await Subscription.findById(req.params.id).populate('organization');
  if (!sub) return res.status(404).json({ message: 'Subscription not found' });
  res.json(sub);
});

// Create subscription
router.post('/', async (req, res) => {
  const sub = new Subscription(req.body);
  await sub.save();
  res.status(201).json(sub);
});

// Update subscription
router.put('/:id', async (req, res) => {
  const updated = await Subscription.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Subscription not found' });
  res.json(updated);
});

// Delete subscription
router.delete('/:id', async (req, res) => {
  const deleted = await Subscription.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Subscription not found' });
  res.json({ message: 'Subscription deleted successfully' });
});

export default router;
