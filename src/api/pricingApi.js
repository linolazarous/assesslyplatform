// src/api/pricingApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';

/**
 * Pricing API Service for Assessly Platform
 * Comprehensive pricing, subscription, and plan management
 * Multi-currency support with advanced enterprise features
 */

const pricingApi = {
  // ===================== CORE PRICING METHODS =====================
  
  /**
   * Get all pricing plans with detailed information
   * @param {Object} params - Query parameters
   * @param {string} params.currency - Currency code (USD, EUR, GBP, etc.)
   * @param {string} params.region - Regional pricing adjustments
   * @param {boolean} params.includeEnterprise - Include enterprise plans
   * @param {boolean} params.includeTrialInfo - Include trial eligibility info
   * @returns {Promise<Object>} Pricing plans with metadata
   */
  getPlans: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/pricing/plans', {
        params: {
          currency: params.currency || 'USD',
          includeFeatures: true,
          includeLimits: true,
          includeComparisons: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['plans', 'currency', 'updatedAt']);
      
      // Emit plans loaded event
      apiEvents.emit('pricing:plans_loaded', {
        count: response.data.plans?.length || 0,
        currency: response.data.currency,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plans error:', error);
      
      // Development mock data
      // FIXED: Changed process.env.NODE_ENV to import.meta.env.MODE
      if (import.meta.env.MODE === 'development') {
        console.warn('[PricingAPI] Using mock pricing data for development');
        return generateMockPlans(params);
      }
      
      apiEvents.emit('pricing:plans_error', { error, params });
      throw error;
    }
  },
  
  /**
   * Get specific plan details
   * @param {string} planId - Plan identifier
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Plan details
   */
  getPlan: async (planId, options = {}) => {
    try {
      const response = await api.get(`/api/v1/pricing/plans/${planId}`, {
        params: {
          includeFeatureDetails: options.includeFeatures || true,
          includeUsageLimits: options.includeLimits || true,
          includeUpgradePaths: options.includeUpgrades || true,
          ...options
        }
      });
      
      validateResponse(response.data, ['id', 'name', 'pricing', 'features']);
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plan error:', error);
      
      // FIXED: Changed process.env.NODE_ENV to import.meta.env.MODE
      if (import.meta.env.MODE === 'development') {
        console.warn('[PricingAPI] Using mock plan data for development');
        return generateMockPlan(planId, options);
      }
      
      throw error;
    }
  },
  
  /**
   * Create checkout session for plan subscription
   * @param {Object} checkoutData - Checkout configuration
   * @param {string} checkoutData.planId - Selected plan ID
   * @param {string} checkoutData.billingCycle - Billing cycle (monthly, annual)
   * @param {string} checkoutData.successUrl - Success redirect URL
   * @param {string} checkoutData.cancelUrl - Cancel redirect URL
   * @param {string} checkoutData.organizationId - Organization ID
   * @param {Array} checkoutData.couponCodes - Applied coupon codes
   * @param {Object} checkoutData.metadata - Additional metadata
   * @returns {Promise<Object>} Checkout session details
   */
  createCheckoutSession: async (checkoutData) => {
    try {
      validateResponse(checkoutData, ['planId', 'billingCycle']);
      
      const response = await api.post('/api/v1/pricing/checkout-session', {
        ...checkoutData,
        customerId: TokenManager.getUserInfo()?.id,
        userEmail: TokenManager.getUserInfo()?.email,
        organizationId: checkoutData.organizationId || TokenManager.getTenantId(),
        successUrl: checkoutData.successUrl || `${window.location.origin}/billing/success`,
        cancelUrl: checkoutData.cancelUrl || `${window.location.origin}/pricing`,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          ...checkoutData.metadata
        }
      });
      
      validateResponse(response.data, ['sessionId', 'url', 'expiresAt']);
      
      apiEvents.emit('pricing:checkout_session_created', {
        planId: checkoutData.planId,
        billingCycle: checkoutData.billingCycle,
        sessionId: response.data.sessionId,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Create checkout session error:', error);
      apiEvents.emit('pricing:checkout_error', { data: checkoutData, error });
      throw error;
    }
  },
  
  /**
   * Get organization subscription details
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Subscription details
   */
  getOrganizationSubscription: async (organizationId, options = {}) => {
    try {
      // Check access permissions
      const userOrgs = TokenManager.getUserInfo()?.organizations || [];
      const userRole = TokenManager.getRole();
      
      if (userRole !== 'super_admin' && !userOrgs.includes(organizationId)) {
        throw new Error('Unauthorized: Access to this organization is restricted');
      }
      
      const response = await api.get(`/api/v1/pricing/organizations/${organizationId}/subscription`, {
        params: {
          includeInvoiceHistory: options.includeInvoices || false,
          includePaymentMethods: options.includePaymentMethods || false,
          includeUsageMetrics: options.includeUsage || true,
          ...options
        }
      });
      
      validateResponse(response.data, ['plan', 'status', 'billingCycle', 'currentPeriodEnd']);
      
      // Emit subscription loaded event
      apiEvents.emit('pricing:subscription_loaded', {
        organizationId,
        plan: response.data.plan,
        status: response.data.status,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get organization subscription error:', error);
      
      // FIXED: Changed process.env.NODE_ENV to import.meta.env.MODE
      if (import.meta.env.MODE === 'development') {
        console.warn('[PricingAPI] Using mock subscription data for development');
        return generateMockSubscription(organizationId, options);
      }
      
      throw error;
    }
  },
  
  /**
   * Export plan comparison in various formats
   * @param {Object} options - Export options
   * @param {string} options.format - Export format (pdf, csv, json)
   * @param {string} options.billingCycle - Billing cycle for pricing
   * @param {string} options.currency - Currency for pricing
   * @param {Array<string>} options.features - Specific features to include
   * @param {boolean} options.detailed - Include detailed feature breakdown
   * @returns {Promise<Object>} Export data with blob
   */
  exportPlanComparison: async (options = {}) => {
    try {
      const response = await api.get('/api/v1/pricing/export/comparison', {
        responseType: 'blob',
        params: {
          format: options.format || 'pdf',
          billingCycle: options.billingCycle || 'annual',
          currency: options.currency || 'USD',
          detailed: options.detailed || false,
          ...options
        }
      });
      
      const contentType = response.headers['content-type'];
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                     `plan_comparison_${options.billingCycle || 'annual'}_${new Date().toISOString().split('T')[0]}.${options.format || 'pdf'}`;
      
      return {
        blob: response.data,
        filename,
        contentType,
        size: response.data.size,
        url: URL.createObjectURL(response.data)
      };
    } catch (error) {
      console.error('[PricingAPI] Export plan comparison error:', error);
      
      // Try alternative export method
      try {
        const response = await api.post('/api/v1/pricing/export/comparison/url', {
          format: options.format || 'pdf',
          billingCycle: options.billingCycle || 'annual',
          ...options
        });
        
        return response.data;
      } catch (fallbackError) {
        throw error;
      }
    }
  },
  
  // ===================== PLAN COMPARISON & FEATURES =====================
  
  /**
   * Get detailed plan comparison
   * @param {Object} params - Comparison parameters
   * @returns {Promise<Object>} Plan comparison matrix
   */
  getPlanComparison: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/pricing/comparison', {
        params: {
          includeAllPlans: params.includeAllPlans || true,
          includeFeatureMatrix: true,
          includePricingTiers: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['plans', 'features', 'pricingMatrix']);
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get plan comparison error:', error);
      throw error;
    }
  },
  
  /**
   * Get all plan features with categorization
   * @returns {Promise<Array>} Feature categories with details
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
   * Get plan usage recommendation based on organization metrics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Usage analysis and recommendations
   */
  getUsageRecommendation: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/pricing/recommendations/${organizationId}`);
      
      validateResponse(response.data, ['currentUsage', 'recommendations', 'projectedCosts']);
      
      apiEvents.emit('pricing:recommendation_generated', {
        organizationId,
        recommendations: response.data.recommendations,
        ...response.data
      });
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Get usage recommendation error:', error);
      throw error;
    }
  },
  
  // ===================== TRIALS & DEMOS =====================
  
  /**
   * Check trial eligibility for organization
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Eligibility status
   */
  checkTrialEligibility: async (organizationId) => {
    try {
      const response = await api.get(`/api/v1/pricing/trials/eligibility/${organizationId}`);
      validateResponse(response.data, ['eligible', 'reason', 'duration']);
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Check trial eligibility error:', error);
      throw error;
    }
  },
  
  /**
   * Start free trial for organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Trial options
   * @returns {Promise<Object>} Trial activation result
   */
  startFreeTrial: async (organizationId, options = {}) => {
    try {
      const response = await api.post(`/api/v1/pricing/trials/start/${organizationId}`, {
        planId: options.planId || 'professional',
        duration: options.duration || 14,
        notify: options.notify !== false,
        ...options
      });
      
      apiEvents.emit('pricing:trial_started', {
        organizationId,
        plan: response.data.plan,
        duration: response.data.duration,
        expiresAt: response.data.expiresAt
      });
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Start free trial error:', error);
      throw error;
    }
  },
  
  /**
   * Schedule product demo
   * @param {Object} demoData - Demo scheduling data
   * @returns {Promise<Object>} Demo scheduling result
   */
  scheduleDemo: async (demoData) => {
    try {
      validateResponse(demoData, ['email', 'name', 'preferredDate']);
      
      const response = await api.post('/api/v1/pricing/demos/schedule', {
        ...demoData,
        organizationId: demoData.organizationId || TokenManager.getTenantId(),
        userId: TokenManager.getUserInfo()?.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        source: 'pricing_page'
      });
      
      apiEvents.emit('pricing:demo_scheduled', {
        email: demoData.email,
        date: demoData.preferredDate,
        demoId: response.data.demoId
      });
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Schedule demo error:', error);
      throw error;
    }
  },
  
  // ===================== QUOTES & ENTERPRISE =====================
  
  /**
   * Request custom quote
   * @param {Object} quoteData - Quote request data
   * @returns {Promise<Object>} Quote request result
   */
  requestCustomQuote: async (quoteData) => {
    try {
      validateResponse(quoteData, ['email', 'requirements']);
      
      const response = await api.post('/api/v1/pricing/quotes/request', {
        ...quoteData,
        organizationId: quoteData.organizationId || TokenManager.getTenantId(),
        userId: TokenManager.getUserInfo()?.id,
        companySize: quoteData.companySize || '11-50',
        estimatedUsers: quoteData.estimatedUsers || 50,
        timeline: quoteData.timeline || '1-3 months'
      });
      
      apiEvents.emit('pricing:quote_requested', {
        email: quoteData.email,
        quoteId: response.data.quoteId,
        estimatedAmount: response.data.estimatedAmount
      });
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Request custom quote error:', error);
      throw error;
    }
  },
  
  /**
   * Get enterprise features and capabilities
   * @returns {Promise<Object>} Enterprise feature catalog
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
   * @param {Object} consultationData - Consultation request
   * @returns {Promise<Object>} Consultation scheduling result
   */
  requestEnterpriseConsultation: async (consultationData) => {
    try {
      validateResponse(consultationData, ['email', 'name', 'company']);
      
      const response = await api.post('/api/v1/pricing/enterprise/consultation', {
        ...consultationData,
        userId: TokenManager.getUserInfo()?.id,
        organizationId: TokenManager.getTenantId(),
        priority: consultationData.priority || 'standard',
        preferredContact: consultationData.preferredContact || 'email'
      });
      
      apiEvents.emit('pricing:enterprise_consultation_requested', {
        company: consultationData.company,
        contact: consultationData.email,
        consultationId: response.data.consultationId
      });
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Request enterprise consultation error:', error);
      throw error;
    }
  },
  
  // ===================== PRICING CALCULATIONS =====================
  
  /**
   * Calculate subscription cost with various options
   * @param {Object} calculationData - Calculation parameters
   * @returns {Promise<Object>} Calculated costs
   */
  calculateSubscriptionCost: async (calculationData) => {
    try {
      validateResponse(calculationData, ['planId', 'billingCycle', 'users']);
      
      const response = await api.post('/api/v1/pricing/calculate', {
        ...calculationData,
        currency: calculationData.currency || 'USD',
        includeTax: calculationData.includeTax !== false,
        includeSetup: calculationData.includeSetup || false,
        promoCode: calculationData.promoCode || null
      });
      
      validateResponse(response.data, ['subtotal', 'tax', 'total', 'breakdown']);
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Calculate subscription cost error:', error);
      throw error;
    }
  },
  
  /**
   * Preview plan change with proration calculation
   * @param {string} organizationId - Organization ID
   * @param {Object} changeData - Change details
   * @returns {Promise<Object>} Change preview with costs
   */
  previewPlanChange: async (organizationId, changeData) => {
    try {
      validateResponse(changeData, ['newPlanId', 'billingCycle']);
      
      const response = await api.post(`/api/v1/pricing/preview-change/${organizationId}`, {
        ...changeData,
        prorationDate: new Date().toISOString(),
        includeCredits: true,
        includeDiscounts: true
      });
      
      validateResponse(response.data, [
        'currentPlan', 
        'newPlan', 
        'proratedAmount', 
        'newTotal', 
        'effectiveDate'
      ]);
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Preview plan change error:', error);
      throw error;
    }
  },
  
  // ===================== PROMOTIONS & DISCOUNTS =====================
  
  /**
   * Validate promotion code
   * @param {string} promoCode - Promotion code
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  validatePromotionCode: async (promoCode, options = {}) => {
    try {
      const response = await api.get(`/api/v1/pricing/promotions/validate/${promoCode}`, {
        params: {
          organizationId: options.organizationId || TokenManager.getTenantId(),
          planId: options.planId,
          billingCycle: options.billingCycle,
          ...options
        }
      });
      
      validateResponse(response.data, ['valid', 'discount', 'description', 'expiresAt']);
      
      return response.data;
    } catch (error) {
      console.error('[PricingAPI] Validate promotion code error:', error);
      throw error;
    }
  },
  
  /**
   * Get active promotions
   * @returns {Promise<Array>} Active promotions
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
  
  // ===================== CURRENCY & REGIONAL PRICING =====================
  
  /**
   * Get regional pricing adjustments
   * @param {string} countryCode - ISO country code
   * @returns {Promise<Object>} Regional pricing information
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
   * Get current exchange rates
   * @returns {Promise<Object>} Exchange rates
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
  
  // ===================== UTILITY FUNCTIONS =====================
  
  /**
   * Get billing cycle options
   * @returns {Array<Object>} Billing cycle options
   */
  getBillingCycleOptions: () => {
    return [
      { value: 'monthly', label: 'Monthly', discount: 0, description: 'Pay month-to-month' },
      { value: 'annual', label: 'Annual', discount: 20, description: 'Save 20% with annual billing' },
      { value: 'biennial', label: 'Biennial', discount: 30, description: 'Save 30% with 2-year billing' }
    ];
  },
  
  /**
   * Get plan level badges
   * @returns {Object} Plan badge configurations
   */
  getPlanBadges: () => {
    return {
      free: { color: 'gray', label: 'Free', icon: 'gift' },
      basic: { color: 'blue', label: 'Starter', icon: 'rocket' },
      professional: { color: 'purple', label: 'Popular', icon: 'star' },
      enterprise: { color: 'green', label: 'Enterprise', icon: 'crown' }
    };
  },
  
  /**
   * Calculate annual savings percentage
   * @param {number} monthlyPrice - Monthly price
   * @param {number} annualPrice - Annual price
   * @returns {number} Savings percentage
   */
  calculateAnnualSavings: (monthlyPrice, annualPrice) => {
    if (!monthlyPrice || !annualPrice) return 0;
    const monthlyTotal = monthlyPrice * 12;
    return Math.round(((monthlyTotal - annualPrice) / monthlyTotal) * 100);
  },
  
  /**
   * Format price for display
   * @param {number} amount - Amount in base currency
   * @param {string} currency - Currency code
   * @returns {string} Formatted price
   */
  formatPrice: (amount, currency = 'USD') => {
    if (amount === 0) return 'Free';
    if (!amount) return 'Custom';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },
  
  /**
   * Get feature comparison matrix
   * @param {Array} plans - Plans to compare
   * @returns {Array} Feature comparison array
   */
  generateFeatureMatrix: (plans) => {
    if (!plans || !plans.length) return [];
    
    const features = [
      { key: 'assessments', label: 'Monthly Assessments', type: 'limit' },
      { key: 'questionTypes', label: 'Question Types', type: 'count' },
      { key: 'storage', label: 'Storage', type: 'storage' },
      { key: 'teamMembers', label: 'Team Members', type: 'count' },
      { key: 'apiAccess', label: 'API Access', type: 'boolean' },
      { key: 'customBranding', label: 'Custom Branding', type: 'boolean' },
      { key: 'analytics', label: 'Advanced Analytics', type: 'boolean' },
      { key: 'prioritySupport', label: 'Priority Support', type: 'boolean' },
      { key: 'ssoIntegration', label: 'SSO Integration', type: 'boolean' },
      { key: 'dedicatedManager', label: 'Dedicated Manager', type: 'boolean' },
      { key: 'sla', label: 'SLA Guarantee', type: 'boolean' }
    ];
    
    return features.map(feature => ({
      ...feature,
      plans: plans.map(plan => ({
        planId: plan.id,
        value: plan.features?.[feature.key],
        included: !['0', 'false', false, null, undefined].includes(plan.features?.[feature.key])
      }))
    }));
  },
  
  /**
   * Subscribe to pricing events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on: (event, callback) => {
    apiEvents.on(`pricing:${event}`, callback);
  },
  
  /**
   * Unsubscribe from pricing events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off: (event, callback) => {
    apiEvents.off(`pricing:${event}`, callback);
  },
  
  /**
   * Initialize pricing module
   * @returns {Promise<Object>} Initialization status
   */
  initialize: async () => {
    try {
      // Load pricing plans
      const plans = await pricingApi.getPlans();
      
      // Get currency preferences
      const userCurrency = localStorage.getItem('preferred_currency') || 'USD';
      
      apiEvents.emit('pricing:initialized', {
        planCount: plans.plans?.length || 0,
        currency: plans.currency || userCurrency,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        plans: plans.plans || [],
        currency: plans.currency || userCurrency,
        features: pricingApi.generateFeatureMatrix(plans.plans || [])
      };
    } catch (error) {
      console.error('[PricingAPI] Initialize error:', error);
      return {
        success: false,
        error: error.message,
        plans: [],
        currency: 'USD'
      };
    }
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Generate mock plans for development
 */
function generateMockPlans(params) {
  const basePlans = [
    {
      id: 'free',
      name: 'Free',
      description: 'For individuals and small projects',
      level: 0,
      popular: false,
      pricing: {
        monthly: { amount: 0, currency: params.currency || 'USD', stripePriceId: null },
        annual: { amount: 0, currency: params.currency || 'USD', stripePriceId: null, savings: 0 }
      },
      features: {
        assessments: '50',
        questionTypes: '5',
        storage: '2GB',
        teamMembers: '1',
        apiAccess: false,
        customBranding: false,
        analytics: false,
        prioritySupport: false,
        ssoIntegration: false,
        dedicatedManager: false,
        sla: false
      },
      limits: {
        assessmentsPerMonth: 50,
        candidatesPerAssessment: 100,
        storageGb: 2,
        teamMembers: 1,
        apiCallsPerDay: 100
      },
      trial: {
        available: false,
        durationDays: 0
      }
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'For small teams getting started',
      level: 1,
      popular: false,
      pricing: {
        monthly: { amount: 29, currency: params.currency || 'USD', stripePriceId: 'price_basic_monthly' },
        annual: { amount: 290, currency: params.currency || 'USD', stripePriceId: 'price_basic_annual', savings: 17 }
      },
      features: {
        assessments: '100',
        questionTypes: '8',
        storage: '5GB',
        teamMembers: '5',
        apiAccess: false,
        customBranding: false,
        analytics: true,
        prioritySupport: false,
        ssoIntegration: false,
        dedicatedManager: false,
        sla: false
      },
      limits: {
        assessmentsPerMonth: 100,
        candidatesPerAssessment: 250,
        storageGb: 5,
        teamMembers: 5,
        apiCallsPerDay: 500
      },
      trial: {
        available: true,
        durationDays: 14
      }
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing teams and businesses',
      level: 2,
      popular: true,
      pricing: {
        monthly: { amount: 79, currency: params.currency || 'USD', stripePriceId: 'price_professional_monthly' },
        annual: { amount: 790, currency: params.currency || 'USD', stripePriceId: 'price_professional_annual', savings: 20 }
      },
      features: {
        assessments: '500',
        questionTypes: '12',
        storage: '50GB',
        teamMembers: '25',
        apiAccess: true,
        customBranding: true,
        analytics: true,
        prioritySupport: true,
        ssoIntegration: false,
        dedicatedManager: false,
        sla: false
      },
      limits: {
        assessmentsPerMonth: 500,
        candidatesPerAssessment: 1000,
        storageGb: 50,
        teamMembers: 25,
        apiCallsPerDay: 5000
      },
      trial: {
        available: true,
        durationDays: 14
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations with complex needs',
      level: 3,
      popular: false,
      pricing: {
        monthly: { amount: null, currency: params.currency || 'USD', stripePriceId: null },
        annual: { amount: null, currency: params.currency || 'USD', stripePriceId: null, savings: 0 }
      },
      features: {
        assessments: 'Unlimited',
        questionTypes: 'All',
        storage: 'Unlimited',
        teamMembers: 'Unlimited',
        apiAccess: true,
        customBranding: true,
        analytics: true,
        prioritySupport: true,
        ssoIntegration: true,
        dedicatedManager: true,
        sla: true
      },
      limits: {
        assessmentsPerMonth: -1, // Unlimited
        candidatesPerAssessment: -1,
        storageGb: -1,
        teamMembers: -1,
        apiCallsPerDay: -1
      },
      trial: {
        available: false,
        durationDays: 0
      }
    }
  ];
  
  // Adjust for currency if needed
  const currency = params.currency || 'USD';
  const exchangeRates = {
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.52,
    JPY: 150.5
  };
  
  if (currency !== 'USD' && exchangeRates[currency]) {
    basePlans.forEach(plan => {
      if (plan.pricing.monthly.amount) {
        plan.pricing.monthly.amount = Math.round(plan.pricing.monthly.amount * exchangeRates[currency]);
        plan.pricing.annual.amount = Math.round(plan.pricing.annual.amount * exchangeRates[currency]);
      }
    });
  }
  
  return {
    plans: basePlans,
    currency: currency,
    updatedAt: new Date().toISOString(),
    fromMock: true
  };
}

/**
 * Generate mock plan details
 */
function generateMockPlan(planId, options) {
  const plans = generateMockPlans({}).plans;
  const plan = plans.find(p => p.id === planId) || plans[0];
  
  return {
    ...plan,
    featureDetails: options.includeFeatures ? generateFeatureDetails(planId) : undefined,
    upgradePaths: options.includeUpgrades ? generateUpgradePaths(planId) : undefined,
    fromMock: true
  };
}

/**
 * Generate mock subscription data
 */
function generateMockSubscription(organizationId, options) {
  const plans = generateMockPlans({}).plans;
  const currentPlan = plans.find(p => p.id === 'professional') || plans[1];
  
  return {
    plan: currentPlan,
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    usage: options.includeUsage ? {
      assessments: { used: 125, limit: 500, percentage: 25 },
      storage: { used: 12.5, limit: 50, unit: 'GB', percentage: 25 },
      teamMembers: { used: 8, limit: 25, percentage: 32 },
      apiCalls: { used: 1250, limit: 5000, percentage: 25 }
    } : undefined,
    invoices: options.includeInvoices ? Array.from({ length: 3 }, (_, i) => ({
      id: `inv_${i + 1}`,
      amount: currentPlan.pricing.monthly.amount,
      currency: 'USD',
      status: 'paid',
      date: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
      downloadUrl: '#'
    })) : undefined,
    fromMock: true
  };
}

/**
 * Generate feature details
 */
function generateFeatureDetails(planId) {
  const featureCategories = [
    {
      category: 'Assessments',
      features: [
        { name: 'Monthly Assessments', description: 'Number of assessments you can create each month' },
        { name: 'Question Types', description: 'Types of questions available' },
        { name: 'Assessment Templates', description: 'Pre-built assessment templates' }
      ]
    },
    {
      category: 'Storage & Limits',
      features: [
        { name: 'Storage Space', description: 'File storage for assessments and media' },
        { name: 'Team Members', description: 'Number of users in your organization' },
        { name: 'Candidate Responses', description: 'Number of candidate responses per month' }
      ]
    }
  ];
  
  return featureCategories;
}

/**
 * Generate upgrade paths
 */
function generateUpgradePaths(currentPlanId) {
  const plans = ['free', 'basic', 'professional', 'enterprise'];
  const currentIndex = plans.indexOf(currentPlanId);
  
  if (currentIndex === -1 || currentIndex === plans.length - 1) return [];
  
  return plans.slice(currentIndex + 1).map(planId => ({
    planId,
    upgradeType: planId === 'enterprise' ? 'custom' : 'standard',
    description: `Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan`
  }));
}

export default pricingApi;
