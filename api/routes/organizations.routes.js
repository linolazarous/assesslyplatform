// api/routes/organizations.routes.js
import express from 'express';
import Organization from '../models/Organization.js';

const router = express.Router();

// Get all organizations
router.get('/', async (req, res) => {
  const orgs = await Organization.find().populate('owner', 'name email');
  res.json(orgs);
});

// Get organization by ID
router.get('/:id', async (req, res) => {
  const org = await Organization.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('members.user', 'name email');
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  res.json(org);
});

// Create organization
router.post('/', async (req, res) => {
  const org = new Organization(req.body);
  await org.save();
  res.status(201).json(org);
});

// Update organization
router.put('/:id', async (req, res) => {
  const org = await Organization.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  res.json(org);
});

// Delete organization
router.delete('/:id', async (req, res) => {
  const org = await Organization.findByIdAndDelete(req.params.id);
  if (!org) return res.status(404).json({ message: 'Organization not found' });
  res.json({ message: 'Organization deleted successfully' });
});

export default router;
