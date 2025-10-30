import express from 'express';
import AssessmentResponse from '../models/AssessmentResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// Get all responses
router.get('/', asyncHandler(async (req, res) => {
  const responses = await AssessmentResponse.find().populate('candidate', 'name email');
  res.json(responses);
}));

// Get response by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const response = await AssessmentResponse.findById(req.params.id).populate('candidate', 'name email');
  if (!response) return res.status(404).json({ message: 'Response not found' });
  res.json(response);
}));

// Create response
router.post('/', asyncHandler(async (req, res) => {
  const response = new AssessmentResponse(req.body);
  await response.save();
  res.status(201).json(response);
}));

// Update response
router.put('/:id', asyncHandler(async (req, res) => {
  const response = await AssessmentResponse.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!response) return res.status(404).json({ message: 'Response not found' });
  res.json(response);
}));

// Delete response
router.delete('/:id', asyncHandler(async (req, res) => {
  const response = await AssessmentResponse.findByIdAndDelete(req.params.id);
  if (!response) return res.status(404).json({ message: 'Response not found' });
  res.json({ message: 'Response deleted successfully' });
}));

export default router;
