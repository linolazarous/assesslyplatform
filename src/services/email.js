/**
 * Email Service for Assessly Platform
 * Frontend API wrapper - calls backend for email functionality
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com/api/v1';

const emailService = {
  async sendEmail(template, data) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ template, data })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Email service error:', error);
      
      // Mock response for development
      if (import.meta.env.MODE === 'development') {
        console.log(`Dev: Mock email sent for ${template}`, data);
        return { 
          success: true, 
          message: 'Mock email sent (dev mode)',
          mode: 'development'
        };
      }
      
      throw error;
    }
  },

  async sendAssessmentInvite(data) {
    return this.sendEmail('assessment-invite', data);
  },

  async sendPasswordReset(data) {
    return this.sendEmail('reset-password', data);
  },

  async sendWelcomeEmail(data) {
    return this.sendEmail('welcome', data);
  },

  async sendAssessmentComplete(data) {
    return this.sendEmail('assessment-complete', data);
  },

  async sendSubscriptionChange(data) {
    return this.sendEmail('subscription-change', data);
  }
};

export default emailService;
