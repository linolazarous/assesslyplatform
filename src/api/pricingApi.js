// src/api/pricingApi.js
import api from './api';

/**
 * Pricing API Service
 * Handles pricing plans, comparisons, and plan-related operations
 */
const pricingApi = {
  // ===================== PLANS & PRICING =====================
  
  /**
   * Get all pricing plans
   */
  getPlans: async (params = {}) => {
    try {
      const response = await api.get('/pricing/plans', { params });
      return response.data;
    } catch (error) {
      console.error('Get plans error:', error);
      throw error;
    }
  },
  
  /**
   * Get plan by ID
   */
  getPlan: async (planId) => {
    try {
      const response = await api.get(`/pricing/plans/${planId}`);
      return response.data;
    } catch (error) {
      console.error('Get plan error:', error);
      throw error;
    }
  },
  
  /**
   * Get plan comparison data
   */
  getPlanComparison: async (params = {}) => {
    try {
      const response = await api.get('/pricing/comparison', { params });
      return response.data;
    } catch (error) {
      console.error('Get plan comparison error:', error);
      throw error;
    }
  },
  
  /**
   * Get featured plans
   */
  getFeaturedPlans: async () => {
    try {
      const response = await api.get('/pricing/featured');
      return response.data;
    } catch (error) {
      console.error('Get featured plans error:', error);
      throw error;
    }
  },
  
  /**
   * Get recommended plan based on usage
   */
  getUsageRecommendation: async (organizationId) => {
    try {
      const response = await api.get(`/pricing/recommendations/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get usage recommendation error:', error);
      throw error;
    }
  },
  
  // ===================== PLAN FEATURES =====================
  
  /**
   * Get all plan features
   */
  getPlanFeatures: async () => {
    try {
      const response = await api.get('/pricing/features');
      return response.data;
    } catch (error) {
      console.error('Get plan features error:', error);
      throw error;
    }
  },
  
  /**
   * Get feature by ID
   */
  getFeature: async (featureId) => {
    try {
      const response = await api.get(`/pricing/features/${featureId}`);
      return response.data;
    } catch (error) {
      console.error('Get feature error:', error);
      throw error;
    }
  },
  
  /**
   * Get feature categories
   */
  getFeatureCategories: async () => {
    try {
      const response = await api.get('/pricing/feature-categories');
      return response.data;
    } catch (error) {
      console.error('Get feature categories error:', error);
      throw error;
    }
  },
  
  // ===================== CUSTOM QUOTES =====================
  
  /**
   * Request custom quote
   */
  requestCustomQuote: async (quoteData) => {
    try {
      const response = await api.post('/pricing/quotes/request', quoteData);
      return response.data;
    } catch (error) {
      console.error('Request custom quote error:', error);
      throw error;
    }
  },
  
  /**
   * Get custom quote by ID
   */
  getCustomQuote: async (quoteId) => {
    try {
      const response = await api.get(`/pricing/quotes/${quoteId}`);
      return response.data;
    } catch (error) {
      console.error('Get custom quote error:', error);
      throw error;
    }
  },
  
  /**
   * Accept custom quote
   */
  acceptCustomQuote: async (quoteId) => {
    try {
      const response = await api.post(`/pricing/quotes/${quoteId}/accept`);
      return response.data;
    } catch (error) {
      console.error('Accept custom quote error:', error);
      throw error;
    }
  },
  
  /**
   * Decline custom quote
   */
  declineCustomQuote: async (quoteId) => {
    try {
      const response = await api.post(`/pricing/quotes/${quoteId}/decline`);
      return response.data;
    } catch (error) {
      console.error('Decline custom quote error:', error);
      throw error;
    }
  },
  
  // ===================== TRIALS & DEMOS =====================
  
  /**
   * Check trial eligibility
   */
  checkTrialEligibility: async (organizationId) => {
    try {
      const response = await api.get(`/pricing/trials/eligibility/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Check trial eligibility error:', error);
      throw error;
    }
  },
  
  /**
   * Start free trial
   */
  startFreeTrial: async (organizationId, trialData = {}) => {
    try {
      const response = await api.post(`/pricing/trials/start/${organizationId}`, trialData);
      return response.data;
    } catch (error) {
      console.error('Start free trial error:', error);
      throw error;
    }
  },
  
  /**
   * Get trial status
   */
  getTrialStatus: async (organizationId) => {
    try {
      const response = await api.get(`/pricing/trials/status/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('Get trial status error:', error);
      throw error;
    }
  },
  
  /**
   * Extend trial
   */
  extendTrial: async (organizationId, extensionData) => {
    try {
      const response = await api.post(`/pricing/trials/extend/${organizationId}`, extensionData);
      return response.data;
    } catch (error) {
      console.error('Extend trial error:', error);
      throw error;
    }
  },
  
  /**
   * Schedule demo
   */
  scheduleDemo: async (demoData) => {
    try {
      const response = await api.post('/pricing/demos/schedule', demoData);
      return response.data;
    } catch (error) {
      console.error('Schedule demo error:', error);
      throw error;
    }
  },
  
  /**
   * Get demo availability
   */
  getDemoAvailability: async (params = {}) => {
    try {
      const response = await api.get('/pricing/demos/availability', { params });
      return response.data;
    } catch (error) {
      console.error('Get demo availability error:', error);
      throw error;
    }
  },
  
  // ===================== CHECKOUT & SUBSCRIPTIONS =====================
  
  /**
   * Create checkout session for plan
   */
  createCheckoutSession: async (checkoutData) => {
    try {
      const response = await api.post('/pricing/checkout-session', checkoutData);
      return response.data;
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  },
  
  /**
   * Calculate subscription cost
   */
  calculateSubscriptionCost: async (calculationData) => {
    try {
      const response = await api.post('/pricing/calculate', calculationData);
      return response.data;
    } catch (error) {
      console.error('Calculate subscription cost error:', error);
      throw error;
    }
  },
  
  /**
   * Preview plan change
   */
  previewPlanChange: async (organizationId, newPlanId) => {
    try {
      const response = await api.post(`/pricing/preview-change/${organizationId}`, { newPlanId });
      return response.data;
    } catch (error) {
      console.error('Preview plan change error:', error);
      throw error;
    }
  },
  
  // ===================== DISCOUNTS & PROMOTIONS =====================
  
  /**
   * Get active promotions
   */
  getActivePromotions: async () => {
    try {
      const response = await api.get('/pricing/promotions/active');
      return response.data;
    } catch (error) {
      console.error('Get active promotions error:', error);
      throw error;
    }
  },
  
  /**
   * Validate promotion code
   */
  validatePromotionCode: async (promoCode) => {
    try {
      const response = await api.get(`/pricing/promotions/validate/${promoCode}`);
      return response.data;
    } catch (error) {
      console.error('Validate promotion code error:', error);
      throw error;
    }
  },
  
  /**
   * Apply promotion to quote
   */
  applyPromotionToQuote: async (quoteId, promoCode) => {
    try {
      const response = await api.post(`/pricing/quotes/${quoteId}/apply-promotion`, { promoCode });
      return response.data;
    } catch (error) {
      console.error('Apply promotion to quote error:', error);
      throw error;
    }
  },
  
  /**
   * Get educational/nonprofit discounts
   */
  getSpecialDiscounts: async (params = {}) => {
    try {
      const response = await api.get('/pricing/discounts/special', { params });
      return response.data;
    } catch (error) {
      console.error('Get special discounts error:', error);
      throw error;
    }
  },
  
  // ===================== REGIONAL PRICING =====================
  
  /**
   * Get regional pricing
   */
  getRegionalPricing: async (countryCode) => {
    try {
      const response = await api.get(`/pricing/regional/${countryCode}`);
      return response.data;
    } catch (error) {
      console.error('Get regional pricing error:', error);
      throw error;
    }
  },
  
  /**
   * Get currency exchange rates
   */
  getExchangeRates: async () => {
    try {
      const response = await api.get('/pricing/exchange-rates');
      return response.data;
    } catch (error) {
      console.error('Get exchange rates error:', error);
      throw error;
    }
  },
  
  /**
   * Convert pricing to local currency
   */
  convertToLocalCurrency: async (amount, currency, targetCurrency) => {
    try {
      const response = await api.post('/pricing/convert-currency', { amount, currency, targetCurrency });
      return response.data;
    } catch (error) {
      console.error('Convert currency error:', error);
      throw error;
    }
  },
  
  // ===================== ENTERPRISE FEATURES =====================
  
  /**
   * Get enterprise features
   */
  getEnterpriseFeatures: async () => {
    try {
      const response = await api.get('/pricing/enterprise/features');
      return response.data;
    } catch (error) {
      console.error('Get enterprise features error:', error);
      throw error;
    }
  },
  
  /**
   * Request enterprise consultation
   */
  requestEnterpriseConsultation: async (consultationData) => {
    try {
      const response = await api.post('/pricing/enterprise/consultation', consultationData);
      return response.data;
    } catch (error) {
      console.error('Request enterprise consultation error:', error);
      throw error;
    }
  },
  
  /**
   * Get enterprise pricing tiers
   */
  getEnterpriseTiers: async () => {
    try {
      const response = await api.get('/pricing/enterprise/tiers');
      return response.data;
    } catch (error) {
      console.error('Get enterprise tiers error:', error);
      throw error;
    }
  },
  
  // ===================== USAGE & METRICS =====================
  
  /**
   * Get plan usage metrics
   */
  getPlanUsageMetrics: async (organizationId, planId) => {
    try {
      const response = await api.get(`/pricing/usage/${organizationId}/${planId}`);
      return response.data;
    } catch (error) {
      console.error('Get plan usage metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get plan limits
   */
  getPlanLimits: async (planId) => {
    try {
      const response = await api.get(`/pricing/limits/${planId}`);
      return response.data;
    } catch (error) {
      console.error('Get plan limits error:', error);
      throw error;
    }
  },
  
  /**
   * Check plan limit usage
   */
  checkPlanLimitUsage: async (organizationId, limitType) => {
    try {
      const response = await api.get(`/pricing/limits/usage/${organizationId}/${limitType}`);
      return response.data;
    } catch (error) {
      console.error('Check plan limit usage error:', error);
      throw error;
    }
  },
  
  // ===================== EXPORT & SHARE =====================
  
  /**
   * Export plan comparison
   */
  exportPlanComparison: async (exportConfig) => {
    try {
      const response = await api.post('/pricing/export/comparison', exportConfig, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Export plan comparison error:', error);
      throw error;
    }
  },
  
  /**
   * Share plan comparison
   */
  sharePlanComparison: async (shareData) => {
    try {
      const response = await api.post('/pricing/share/comparison', shareData);
      return response.data;
    } catch (error) {
      console.error('Share plan comparison error:', error);
      throw error;
    }
  },
  
  /**
   * Generate pricing proposal
   */
  generatePricingProposal: async (proposalData) => {
    try {
      const response = await api.post('/pricing/proposals/generate', proposalData);
      return response.data;
    } catch (error) {
      console.error('Generate pricing proposal error:', error);
      throw error;
    }
  },
  
  // ===================== ANALYTICS & INSIGHTS =====================
  
  /**
   * Get pricing analytics
   */
  getPricingAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/pricing/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Get pricing analytics error:', error);
      throw error;
    }
  },
  
  /**
   * Get conversion metrics
   */
  getConversionMetrics: async () => {
    try {
      const response = await api.get('/pricing/conversions');
      return response.data;
    } catch (error) {
      console.error('Get conversion metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get plan popularity
   */
  getPlanPopularity: async () => {
    try {
      const response = await api.get('/pricing/popularity');
      return response.data;
    } catch (error) {
      console.error('Get plan popularity error:', error);
      throw error;
    }
  },
  
  // ===================== HEALTH & STATUS =====================
  
  /**
   * Check pricing service health
   */
  checkPricingHealth: async () => {
    try {
      const response = await api.get('/pricing/health');
      return response.data;
    } catch (error) {
      console.error('Check pricing health error:', error);
      throw error;
    }
  },
  
  /**
   * Get pricing API version
   */
  getPricingApiVersion: async () => {
    try {
      const response = await api.get('/pricing/version');
      return response.data;
    } catch (error) {
      console.error('Get pricing API version error:', error);
      throw error;
    }
  },
};

export default pricingApi;
