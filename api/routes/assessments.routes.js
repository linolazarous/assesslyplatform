// api/routes/assessments.routes.js
import express from 'express';
import Assessment from '../models/Assessment.js';

const router = express.Router();

// Get all assessments
router.get('/', async (req, res) => {
  const assessments = await Assessment.find().populate('createdBy organization');
  res.json(assessments);
});

// Get one assessment
router.get('/:id', async (req, res) => {
  const assessment = await Assessment.findById(req.params.id)
    .populate('createdBy organization');
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
  res.json(assessment);
});

// Create new assessment
router.post('/', async (req, res) => {
  const assessment = new Assessment(req.body);
  await assessment.save();
  res.status(201).json(assessment);
});

// Update assessment
router.put('/:id', async (req, res) => {
  const updated = await Assessment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Assessment not found' });
  res.json(updated);
});

// Delete assessment
router.delete('/:id', async (req, res) => {
  const deleted = await Assessment.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Assessment not found' });
  res.json({ message: 'Assessment deleted successfully' });
});

// Activate assessment
router.patch('/:id/activate', async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });

  if (!assessment.canActivate())
    return res.status(400).json({ message: 'Assessment cannot be activated yet' });

  assessment.status = 'active';
  await assessment.save();
  res.json({ message: 'Assessment activated', assessment });
});

export default router;
