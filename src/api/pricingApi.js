// src/api/pricingApi.js
import api from './axiosConfig';

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
      const response = await api.get('/api/v1/pricing/plans', { params });
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plans error:', error);
      throw error;
    }
  },
  
  /**
   * Get plan by ID
   */
  getPlan: async (planId) => {
    try {
      const response = await api.get(`/api/v1/pricing/plans/${planId}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plan error:', error);
      throw error;
    }
  },
  
  /**
   * Get plan comparison data
   */
  getPlanComparison: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/pricing/comparison', { params });
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plan comparison error:', error);
      throw error;
    }
  },
  
  /**
   * Get featured plans
   */
  getFeaturedPlans: async () => {
    try {
      const response = await api.get('/api/v1/pricing/featured');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get featured plans error:', error);
      throw error;
    }
  },
  
  /**
   * Get recommended plan based on usage
   */
  getUsageRecommendation: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/pricing/recommendations/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get usage recommendation error:', error);
      throw error;
    }
  },
  
  // ===================== PLAN FEATURES =====================
  
  /**
   * Get all plan features
   */
  getPlanFeatures: async () => {
    try {
      const response = await api.get('/api/v1/pricing/features');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plan features error:', error);
      throw error;
    }
  },
  
  /**
   * Get feature by ID
   */
  getFeature: async (featureId) => {
    try {
      const response = await api.get(`/api/v1/pricing/features/${featureId}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get feature error:', error);
      throw error;
    }
  },
  
  /**
   * Get feature categories
   */
  getFeatureCategories: async () => {
    try {
      const response = await api.get('/api/v1/pricing/feature-categories');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get feature categories error:', error);
      throw error;
    }
  },
  
  // ===================== CUSTOM QUOTES =====================
  
  /**
   * Request custom quote
   */
  requestCustomQuote: async (quoteData) => {
    try {
      const response = await api.post('/api/v1/pricing/quotes/request', quoteData);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Request custom quote error:', error);
      throw error;
    }
  },
  
  /**
   * Get custom quote by ID
   */
  getCustomQuote: async (quoteId) => {
    try {
      const response = await api.get(`/api/v1/pricing/quotes/${quoteId}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get custom quote error:', error);
      throw error;
    }
  },
  
  /**
   * Accept custom quote
   */
  acceptCustomQuote: async (quoteId) => {
    try {
      const response = await api.post(`/api/v1/pricing/quotes/${quoteId}/accept`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Accept custom quote error:', error);
      throw error;
    }
  },
  
  /**
   * Decline custom quote
   */
  declineCustomQuote: async (quoteId) => {
    try {
      const response = await api.post(`/api/v1/pricing/quotes/${quoteId}/decline`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Decline custom quote error:', error);
      throw error;
    }
  },
  
  // ===================== TRIALS & DEMOS =====================
  
  /**
   * Check trial eligibility
   */
  checkTrialEligibility: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/pricing/trials/eligibility/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Check trial eligibility error:', error);
      throw error;
    }
  },
  
  /**
   * Start free trial
   */
  startFreeTrial: async (organizationId, trialData = {}) => {
    try {
      const response = await api.post(`/api/v1/pricing/trials/start/${organizationId}`, trialData);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Start free trial error:', error);
      throw error;
    }
  },
  
  /**
   * Get trial status
   */
  getTrialStatus: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/pricing/trials/status/${organizationId}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get trial status error:', error);
      throw error;
    }
  },
  
  /**
   * Extend trial
   */
  extendTrial: async (organizationId, extensionData) => {
    try {
      const response = await api.post(`/api/v1/pricing/trials/extend/${organizationId}`, extensionData);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Extend trial error:', error);
      throw error;
    }
  },
  
  /**
   * Schedule demo
   */
  scheduleDemo: async (demoData) => {
    try {
      const response = await api.post('/api/v1/pricing/demos/schedule', demoData);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Schedule demo error:', error);
      throw error;
    }
  },
  
  /**
   * Get demo availability
   */
  getDemoAvailability: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/pricing/demos/availability', { params });
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get demo availability error:', error);
      throw error;
    }
  },
  
  // ===================== CHECKOUT & SUBSCRIPTIONS =====================
  
  /**
   * Create checkout session for plan
   */
  createCheckoutSession: async (checkoutData) => {
    try {
      const response = await api.post('/api/v1/pricing/checkout-session', checkoutData);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Create checkout session error:', error);
      throw error;
    }
  },
  
  /**
   * Calculate subscription cost
   */
  calculateSubscriptionCost: async (calculationData) => {
    try {
      const response = await api.post('/api/v1/pricing/calculate', calculationData);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Calculate subscription cost error:', error);
      throw error;
    }
  },
  
  /**
   * Preview plan change
   */
  previewPlanChange: async (organizationId, newPlanId) => {
    try {
      const response = await api.post(`/api/v1/pricing/preview-change/${organizationId}`, { newPlanId });
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Preview plan change error:', error);
      throw error;
    }
  },
  
  // ===================== DISCOUNTS & PROMOTIONS =====================
  
  /**
   * Get active promotions
   */
  getActivePromotions: async () => {
    try {
      const response = await api.get('/api/v1/pricing/promotions/active');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get active promotions error:', error);
      throw error;
    }
  },
  
  /**
   * Validate promotion code
   */
  validatePromotionCode: async (promoCode) => {
    try {
      const response = await api.get(`/api/v1/pricing/promotions/validate/${promoCode}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Validate promotion code error:', error);
      throw error;
    }
  },
  
  /**
   * Apply promotion to quote
   */
  applyPromotionToQuote: async (quoteId, promoCode) => {
    try {
      const response = await api.post(`/api/v1/pricing/quotes/${quoteId}/apply-promotion`, { promoCode });
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Apply promotion to quote error:', error);
      throw error;
    }
  },
  
  /**
   * Get educational/nonprofit discounts
   */
  getSpecialDiscounts: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/pricing/discounts/special', { params });
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get special discounts error:', error);
      throw error;
    }
  },
  
  // ===================== REGIONAL PRICING =====================
  
  /**
   * Get regional pricing
   */
  getRegionalPricing: async (countryCode) => {
    try {
      const response = await api.get(`/api/v1/pricing/regional/${countryCode}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get regional pricing error:', error);
      throw error;
    }
  },
  
  /**
   * Get currency exchange rates
   */
  getExchangeRates: async () => {
    try {
      const response = await api.get('/api/v1/pricing/exchange-rates');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get exchange rates error:', error);
      throw error;
    }
  },
  
  /**
   * Convert pricing to local currency
   */
  convertToLocalCurrency: async (amount, currency, targetCurrency) => {
    try {
      const response = await api.post('/api/v1/pricing/convert-currency', { amount, currency, targetCurrency });
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Convert currency error:', error);
      throw error;
    }
  },
  
  // ===================== ENTERPRISE FEATURES =====================
  
  /**
   * Get enterprise features
   */
  getEnterpriseFeatures: async () => {
    try {
      const response = await api.get('/api/v1/pricing/enterprise/features');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get enterprise features error:', error);
      throw error;
    }
  },
  
  /**
   * Request enterprise consultation
   */
  requestEnterpriseConsultation: async (consultationData) => {
    try {
      const response = await api.post('/api/v1/pricing/enterprise/consultation', consultationData);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Request enterprise consultation error:', error);
      throw error;
    }
  },
  
  /**
   * Get enterprise pricing tiers
   */
  getEnterpriseTiers: async () => {
    try {
      const response = await api.get('/api/v1/pricing/enterprise/tiers');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get enterprise tiers error:', error);
      throw error;
    }
  },
  
  // ===================== USAGE & METRICS =====================
  
  /**
   * Get plan usage metrics
   */
  getPlanUsageMetrics: async (organizationId, planId) => {
    try {
      const response = await api.get(`/api/v1/pricing/usage/${organizationId}/${planId}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plan usage metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get plan limits
   */
  getPlanLimits: async (planId) => {
    try {
      const response = await api.get(`/api/v1/pricing/limits/${planId}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plan limits error:', error);
      throw error;
    }
  },
  
  /**
   * Check plan limit usage
   */
  checkPlanLimitUsage: async (organizationId, limitType) => {
    try {
      const response = await api.get(`/api/v1/pricing/limits/usage/${organizationId}/${limitType}`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Check plan limit usage error:', error);
      throw error;
    }
  },
  
  // ===================== EXPORT & SHARE =====================
  
  /**
   * Export plan comparison
   */
  exportPlanComparison: async (exportConfig) => {
    try {
      const response = await api.download('/api/v1/pricing/export/comparison', exportConfig, 'plan_comparison.pdf');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Export plan comparison error:', error);
      throw error;
    }
  },
  
  /**
   * Share plan comparison
   */
  sharePlanComparison: async (shareData) => {
    try {
      const response = await api.post('/api/v1/pricing/share/comparison', shareData);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Share plan comparison error:', error);
      throw error;
    }
  },
  
  /**
   * Generate pricing proposal
   */
  generatePricingProposal: async (proposalData) => {
    try {
      const response = await api.post('/api/v1/pricing/proposals/generate', proposalData);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Generate pricing proposal error:', error);
      throw error;
    }
  },
  
  // ===================== ANALYTICS & INSIGHTS =====================
  
  /**
   * Get pricing analytics
   */
  getPricingAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/pricing/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get pricing analytics error:', error);
      throw error;
    }
  },
  
  /**
   * Get conversion metrics
   */
  getConversionMetrics: async () => {
    try {
      const response = await api.get('/api/v1/pricing/conversions');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get conversion metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get plan popularity
   */
  getPlanPopularity: async () => {
    try {
      const response = await api.get('/api/v1/pricing/popularity');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plan popularity error:', error);
      throw error;
    }
  },
  
  // ===================== HEALTH & STATUS =====================
  
  /**
   * Check pricing service health
   */
  checkPricingHealth: async () => {
    try {
      const response = await api.get('/api/v1/pricing/health');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Check pricing health error:', error);
      throw error;
    }
  },
  
  /**
   * Get pricing API version
   */
  getPricingApiVersion: async () => {
    try {
      const response = await api.get('/api/v1/pricing/version');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get pricing API version error:', error);
      throw error;
    }
  },

  // ===================== NEW FUNCTIONS =====================

  /**
   * Get current plan for organization
   */
  getCurrentPlan: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/pricing/organizations/${organizationId}/current-plan`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get current plan error:', error);
      throw error;
    }
  },

  /**
   * Get upgrade/downgrade options for organization
   */
  getUpgradeOptions: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/pricing/organizations/${organizationId}/upgrade-options`);
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get upgrade options error:', error);
      throw error;
    }
  },

  /**
   * Get pricing FAQ
   */
  getPricingFAQ: async () => {
    try {
      const response = await api.get('/api/v1/pricing/faq');
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get pricing FAQ error:', error);
      throw error;
    }
  },
};

export default pricingApi;
