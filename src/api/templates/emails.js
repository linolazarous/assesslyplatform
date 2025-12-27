// src/api/templates/emails.js
/**
 * Email Templates (Frontend Safe)
 * Loaded as raw strings via Vite
 * DO NOT use fs/path in frontend bundles
 */

/* eslint-disable import/no-unresolved */

// Vite raw imports
import organizationInvitation from './emails/organization-invitation.hbs?raw';
import passwordReset from './emails/password-reset.hbs?raw';
import userWelcome from './emails/user-welcome.hbs?raw';

// ===================== EXPORTS =====================

export const ORGANIZATION_INVITATION_TEMPLATE = organizationInvitation;
export const PASSWORD_RESET_TEMPLATE = passwordReset;
export const USER_WELCOME_TEMPLATE = userWelcome;

// ===================== DEFAULT EXPORT =====================

export default {
  ORGANIZATION_INVITATION_TEMPLATE,
  PASSWORD_RESET_TEMPLATE,
  USER_WELCOME_TEMPLATE,
};
