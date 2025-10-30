import express from 'express';
import Assessment from '../models/Assessment.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// Get all assessments
router.get('/', asyncHandler(async (req, res) => {
  const assessments = await Assessment.find().populate('createdBy', 'name email');
  res.json(assessments);
}));

// Get assessment by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id).populate('createdBy', 'name email');
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
  res.json(assessment);
}));

// Create assessment
router.post('/', asyncHandler(async (req, res) => {
  const assessment = new Assessment(req.body);
  await assessment.save();
  res.status(201).json(assessment);
}));

// Update assessment
router.put('/:id', asyncHandler(async (req, res) => {
  const assessment = await Assessment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
  res.json(assessment);
}));

// Delete assessment
router.delete('/:id', asyncHandler(async (req, res) => {
  const assessment = await Assessment.findByIdAndDelete(req.params.id);
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
  res.json({ message: 'Assessment deleted successfully' });
}));

export default router;
