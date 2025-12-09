// src/api/controllers/contact.controller.js

import chalk from "chalk";
import ContactMessage from "../models/ContactMessage.js";
import Organization from "../models/Organization.js";
import { getClientInfo } from "../utils/clientInfo.js";
import { createContactMessage, sendContactNotifications } from "../services/contact.service.js";

// Email system
import { mailer, EmailTemplates } from "../utils/mailer.js";

/**
 * SPAM Fallback Scoring (if spamUtils not present)
 */
function calculateSpamScoreInline(messageData, clientInfo) {
  let score = 0;
  const { email, message, subject } = messageData;
  const content = `${subject || ""} ${message || ""}`;

  const spamPatterns = [
    { pattern: /http(s)?:\/\//gi, score: 10 },
    { pattern: /[A-Z]{5,}/g, score: 5 },
    { pattern: /[!@#$%^&*()]{3,}/g, score: 8 },
    { pattern: /free|money|profit|earn/gi, score: 15 },
    { pattern: /viagra|cialis|pharmacy/gi, score: 25 },
    { pattern: /click here|buy now|limited time/gi, score: 12 },
  ];

  spamPatterns.forEach(({ pattern, score: s }) => {
    const matches = content.match(pattern);
    if (matches) score += matches.length * s;
  });

  if (email?.includes("+")) score += 5;
  if ((email?.split("@")[0] || "").length > 30) score += 8;
  if ((message?.length || 0) < 20) score += 10;
  if ((message?.length || 0) > 2000) score += 5;
  if (clientInfo?.location?.country && ["CN", "RU", "BR", "IN"].includes(clientInfo.location.country)) {
    score += 10;
  }
  return Math.min(score, 100);
}

/**
 * Main Contact Form Handler
 */
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
      category = "general-inquiry",
      organizationId,
      ...extra
    } = req.body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Name, email, subject and message are required",
      });
    }

    if (message.length < 10 || message.length > 10000) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Message length invalid" });
    }

    // Optional organization binding
    let organization = null;
    if (organizationId) {
      organization = await Organization.findById(organizationId).session(session);
      if (!organization) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Invalid organization" });
      }
    }

    const client = getClientInfo(req);
    const spamScore = calculateSpamScoreInline({ name, email, subject, message }, client);

    const priority = (() => {
      const urgentKeywords = ["urgent", "emergency", "critical", "broken", "not working", "down"];
      const content = (subject + " " + message).toLowerCase();
      if (urgentKeywords.some((kw) => content.includes(kw))) return "urgent";
      const map = { "technical-support": "high", billing: "high", enterprise: "high", "bug-report": "high" };
      return map[category] || "normal";
    })();

    const doc = {
      organization: organizationId || null,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      company: company?.trim() || "",
      phone: phone?.trim() || "",
      category,
      priority,
      source: "contact-form",
      metadata: {
        ipAddress: client.ip,
        userAgent: client.userAgent,
        location: client.location,
        referrer: client.referrer,
        pageUrl: client.origin,
        spamScore,
        formData: extra,
      },
    };

    const contactMessage = await createContactMessage(doc, session);

    // SPAM block flow
    if (spamScore > 80) {
      contactMessage.status = "spam";
      contactMessage.priority = "low";
      await contactMessage.save({ session });
      await session.commitTransaction();

      console.log(chalk.yellow(`🚩 SPAM Contact from ${email} (score ${spamScore})`));

      return res.status(201).json({
        success: true,
        message: "Thank you, your message has been received.",
        data: { id: contactMessage._id, status: "received" },
      });
    }

    // Notifications — do not break the user flow if emails fail
    try {
      await sendContactNotifications(contactMessage, organization);

      // + auto-reply email
      await mailer.send({
        to: email,
        ...EmailTemplates.contactConfirmation({ name, email, message }),
      });
    } catch (e) {
      console.warn(chalk.yellow("⚠️ Email send failed:"), e?.message || e);
    }

    await session.commitTransaction();

    console.log(
      chalk.green(
        `📩 Contact stored & notifications queued: ${contactMessage.email} | org:${organizationId || "none"}`
      )
    );

    return res.status(201).json({
      success: true,
      message: "Thank you for your message. We will get back to you soon.",
      data: {
        id: contactMessage._id,
        status: contactMessage.status || "received",
        priority: contactMessage.priority,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error(chalk.red("❌ Contact form error:"), err);

    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to submit message",
    });
  } finally {
    session.endSession();
  }
}
