/**
 * Email Service for Assessly Platform
 * Frontend API wrapper for email functionality
 */

import api from './api'; // Your existing axios instance

class EmailService {
  /**
   * Send assessment invitation email via backend API
   * @param {Object} data - Email data
   * @returns {Promise<Object>} API response
   */
  async sendAssessmentInvite(data) {
    try {
      const response = await api.post('/assessments/invite', data);
      return response.data;
    } catch (error) {
      console.error('Error sending assessment invite:', error);
      throw error;
    }
  }

  /**
   * Send password reset email via backend API
   * @param {Object} data - Email data
   * @returns {Promise<Object>} API response
   */
  async sendPasswordReset(data) {
    try {
      const response = await api.post('/auth/reset-password', {
        email: data.email,
        resetUrl: data.resetUrl
      });
      return response.data;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email via backend API
   * @param {Object} data - Email data
   * @returns {Promise<Object>} API response
   */
  async sendWelcomeEmail(data) {
    try {
      const response = await api.post('/users/welcome-email', {
        userId: data.userId,
        userName: data.userName,
        email: data.email
      });
      return response.data;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  /**
   * Send assessment completion notification via backend API
   * @param {Object} data - Email data
   * @returns {Promise<Object>} API response
   */
  async sendAssessmentComplete(data) {
    try {
      const response = await api.post('/assessments/complete-notification', {
        assessmentId: data.assessmentId,
        userId: data.userId,
        score: data.score,
        totalPoints: data.totalPoints
      });
      return response.data;
    } catch (error) {
      console.error('Error sending assessment complete email:', error);
      throw error;
    }
  }

  /**
   * Send subscription change notification via backend API
   * @param {Object} data - Email data
   * @returns {Promise<Object>} API response
   */
  async sendSubscriptionChange(data) {
    try {
      const response = await api.post('/subscriptions/change-notification', {
        subscriptionId: data.subscriptionId,
        newPlan: data.newPlan,
        userId: data.userId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending subscription change email:', error);
      throw error;
    }
  }

  /**
   * Generic email sending via backend API
   * @param {string} templateName - Template to use
   * @param {Object} data - Email data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} API response
   */
  async sendEmail(templateName, data, options = {}) {
    try {
      const response = await api.post('/email/send', {
        template: templateName,
        data: data,
        options: options
      });
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;
