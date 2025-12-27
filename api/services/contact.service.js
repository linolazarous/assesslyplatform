// src/api/services/contact.service.js
import chalk from 'chalk';
import mailer, { EmailTemplates } from '../utils/mailer.js';
import ContactMessage from '../models/ContactMessage.js';
import Organization from '../models/Organization.js';

export async function createContactMessage(doc, session = null) {
  const contact = new ContactMessage(doc);
  if (session) return contact.save({ session });
  return contact.save();
}

export async function sendContactNotifications(contactMessage, organization) {
  const supportEmail = process.env.SUPPORT_EMAIL || 'assesslyinc@gmail.com';
  const adminEmail = process.env.ADMIN_EMAIL || supportEmail;

  // Support team notification
  try {
    const supportTemplate = EmailTemplates.contactNotification({ contactMessage, organization, type: 'support' });
    await mailer.sendMail({ to: supportEmail, ...supportTemplate, priority: contactMessage.priority === 'urgent' ? 'high' : 'normal', category: 'contact-form' });
  } catch (err) {
    console.warn(chalk.yellow('⚠️ Support notification failed:'), err?.message || err);
  }

  // Admin alert for high priority
  if (contactMessage.priority === 'urgent' || contactMessage.priority === 'high') {
    try {
      const adminTemplate = EmailTemplates.contactNotification({ contactMessage, organization, type: 'admin' });
      await mailer.sendMail({ to: adminEmail, ...adminTemplate, priority: 'high', category: 'contact-alert' });
    } catch (err) {
      console.warn(chalk.yellow('⚠️ Admin notification failed:'), err?.message || err);
    }
  }

  // Auto-responder to user
  try {
    const autoTemplate = EmailTemplates.contactAutoResponder({
      name: contactMessage.name,
      subject: contactMessage.subject,
      category: contactMessage.category,
      expectedResponseTime: contactMessage.expectedResponseTime || '24-48 hours'
    });
    await mailer.sendMail({ to: contactMessage.email, ...autoTemplate, priority: 'low', category: 'auto-responder' });
  } catch (err) {
    console.warn(chalk.yellow('⚠️ Auto-responder failed:'), err?.message || err);
  }
}
