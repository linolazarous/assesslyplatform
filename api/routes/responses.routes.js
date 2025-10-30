// api/routes/responses.routes.js
import express from 'express';
import AssessmentResponse from '../models/AssessmentResponse.js';

const router = express.Router();

// Get all responses
router.get('/', async (req, res) => {
  const responses = await AssessmentResponse.find().populate('assessment candidate');
  res.json(responses);
});

// Get response by ID
router.get('/:id', async (req, res) => {
  const response = await AssessmentResponse.findById(req.params.id).populate('assessment candidate');
  if (!response) return res.status(404).json({ message: 'Response not found' });
  res.json(response);
});

// Submit new response
router.post('/', async (req, res) => {
  const response = new AssessmentResponse(req.body);
  await response.save();
  res.status(201).json(response);
});

// Update response (e.g., grading)
router.put('/:id', async (req, res) => {
  const updated = await AssessmentResponse.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'Response not found' });
  res.json(updated);
});

// Delete response
router.delete('/:id', async (req, res) => {
  const deleted = await AssessmentResponse.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Response not found' });
  res.json({ message: 'Response deleted successfully' });
});

export default router;
