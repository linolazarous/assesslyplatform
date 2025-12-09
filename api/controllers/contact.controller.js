// src/api/controllers/contact.controller.js
import chalk from 'chalk';
import ContactMessage from '../models/ContactMessage.js';
import Organization from '../models/Organization.js';
import { getClientInfo } from '../utils/clientInfo.js';
import { calculateSpamScore as calcSpam } from '../utils/spamUtils.js'; // optional; inline fallback below
import { createContactMessage, sendContactNotifications } from '../services/contact.service.js';

/**
 * If you do not have a spamUtils module, keep the inline calculateSpamScore function
 * (we kept original logic inlined below as fallback).
 */
function calculateSpamScoreInline(messageData, clientInfo) {
  let score = 0;
  const { name, email, message, subject } = messageData;
  const spamPatterns = [
    { pattern: /http(s)?:\/\//gi, score: 10 },
    { pattern: /[A-Z]{5,}/g, score: 5 },
    { pattern: /[!@#$%^&*()]{3,}/g, score: 8 },
    { pattern: /free|money|profit|earn/gi, score: 15 },
    { pattern: /viagra|cialis|pharmacy/gi, score: 25 },
    { pattern: /click here|buy now|limited time/gi, score: 12 }
  ];
  const content = `${subject || ''} ${message || ''}`;
  spamPatterns.forEach(({ pattern, score: s }) => {
    const matches = content.match(pattern);
    if (matches) score += matches.length * s;
  });
  if (email?.includes('+')) score += 5;
  if ((email?.split('@')[0] || '').length > 30) score += 8;
  if ((message?.length || 0) < 20) score += 10;
  if ((message?.length || 0) > 2000) score += 5;
  if (clientInfo?.location?.country && ['CN', 'RU', 'BR', 'IN'].includes(clientInfo.location.country)) score += 10;
  return Math.min(100, score);
}

/* Submit contact form */
export async function submitContactForm(req, res) {
  const session = await ContactMessage.startSession();
  try {
    await session.startTransaction();

    const {
      name,
      email,
      subject,
      message,
      company,
      phone,
      category = 'general-inquiry',
      organizationId,
      ...additionalFields
    } = req.body;

    // validations
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Name, email, subject and message are required' });
    }

    if (message.length < 10 || message.length > 10000) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Message length invalid' });
    }

    let organization = null;
    if (organizationId) {
      organization = await Organization.findById(organizationId).session(session);
      if (!organization) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Invalid organization' });
      }
    }

    const clientInfo = getClientInfo(req);
    const spamScore = calculateSpamScoreInline({ name, email, subject, message }, clientInfo);
    const priority = (() => {
      const urgentKeywords = ['urgent', 'emergency', 'critical', 'broken', 'not working', 'down'];
      const hasUrgent = urgentKeywords.some(k => (subject + ' ' + message).toLowerCase().includes(k));
      if (hasUrgent) return 'urgent';
      const map = { 'technical-support': 'high', 'billing': 'high', 'enterprise': 'high', 'bug-report': 'high' };
      return map[category] || 'normal';
    })();

    const contactDoc = {
      organization: organizationId || null,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      company: company?.trim() || '',
      phone: phone?.trim() || '',
      category,
      priority,
      source: 'contact-form',
      metadata: {
        ipAddress: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        location: clientInfo.location,
        referrer: clientInfo.referrer,
        pageUrl: clientInfo.origin,
        spamScore,
        formData: additionalFields
      }
    };

    const contactMessage = await createContactMessage(contactDoc, session);

    if (spamScore > 80) {
      contactMessage.status = 'spam';
      contactMessage.priority = 'low';
      await contactMessage.save({ session });
      await session.commitTransaction();
      console.log(chalk.yellow(`🚩 Contact marked spam: ${email} (score ${spamScore})`));
      return res.status(201).json({ success: true, message: 'Thank you, your message has been received.', data: { id: contactMessage._id, status: 'received' } });
    }

    // send notifications but don't fail request if email errors
    try {
      await sendContactNotifications(contactMessage, organization);
    } catch (e) {
      console.warn(chalk.yellow('⚠️ Notification emails error:'), e?.message || e);
    }

    await session.commitTransaction();

    console.log(chalk.green(`📧 Contact saved: ${contactMessage.email} org:${organizationId || 'none'}`));

    return res.status(201).json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon.',
      data: { id: contactMessage._id, status: contactMessage.status || 'received', priority: contactMessage.priority }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error(chalk.red('❌ Contact form error:'), err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    return res.status(500).json({ success: false, message: 'Failed to submit message' });
  } finally {
    session.endSession();
  }
}

/* The rest of controller functions (getContactMessages, getContactMessage, updateContactMessage, getContactStats, assignContactMessage)
   remain largely the same as your original implementation but should call services where relevant.
   For brevity and to avoid duplication, keep the implementations you already have for listing, fetching and updating,
   but call createContactMessage and sendContactNotifications where appropriate (already used above). */
