import express from "express";
import ContactMessage from "../models/ContactMessage.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Contact form and message management
 */

/**
 * @swagger
 * /api/v1/contact:
 *   post:
 *     summary: Submit contact form
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 100
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *               company:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message submitted successfully
 *       400:
 *         description: Validation error
 */
router.post("/", asyncHandler(async (req, res) => {
  const { name, email, subject, message, company, phone } = req.body;
  
  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'All required fields must be provided: name, email, subject, message'
    });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  
  const contactMessage = new ContactMessage({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    subject: subject.trim(),
    message: message.trim(),
    company: company?.trim(),
    phone: phone?.trim(),
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  await contactMessage.save();
  
  res.status(201).json({
    success: true,
    data: { id: contactMessage._id },
    message: 'Thank you for your message. We will get back to you soon.'
  });
}));

/**
 * @swagger
 * /api/v1/contact:
 *   get:
 *     summary: Get contact messages (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, in-progress, resolved, spam]
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 */
router.get("/", protect, authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  
  const [messages, total] = await Promise.all([
    ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ContactMessage.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: messages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @swagger
 * /api/v1/contact/{id}:
 *   get:
 *     summary: Get contact message by ID (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 */
router.get("/:id", protect, authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  res.json({
    success: true,
    data: message
  });
}));

/**
 * @swagger
 * /api/v1/contact/{id}:
 *   patch:
 *     summary: Update message status (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, in-progress, resolved, spam]
 *               responseNote:
 *                 type: string
 *                 maxLength: 1000
 *               assignedTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated successfully
 */
router.patch("/:id", protect, authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const { status, responseNote, assignedTo } = req.body;
  
  const updateData = {};
  if (status) updateData.status = status;
  if (responseNote) updateData.responseNote = responseNote;
  if (assignedTo) updateData.assignedTo = assignedTo;
  
  if (status === 'resolved') {
    updateData.resolvedAt = new Date();
  }
  
  const updatedMessage = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  
  if (!updatedMessage) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  res.json({
    success: true,
    data: updatedMessage,
    message: 'Message updated successfully'
  });
}));

/**
 * @swagger
 * /api/v1/contact/{id}:
 *   delete:
 *     summary: Delete contact message (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted successfully
 */
router.delete("/:id", protect, authorizeRoles('admin'), asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);
  
  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Message deleted successfully'
  });
}));

export default router;
