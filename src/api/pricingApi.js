// src/api/pricingApi.js
import api from './axiosConfig';

/**
 * Pricing API Service
 * Returns consistent response format: { success: boolean, data: any, message?: string }
 * Catches network errors and returns them in consistent format
 */

const createApiMethod = (method, endpoint, options = {}) => {
  return async (data, params) => {
    try {
      const config = {
        ...options,
        params: params || options.params,
      };

      let response;
      switch (method.toLowerCase()) {
        case 'get':
          response = await api.get(endpoint, config);
          break;
        case 'post':
          response = await api.post(endpoint, data, config);
          break;
        case 'put':
          response = await api.put(endpoint, data, config);
          break;
        case 'delete':
          response = await api.delete(endpoint, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      // Normalize response: if backend returns { success, data, message } use it directly
      // Otherwise wrap the response data
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data;
      }
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(`[PricingAPI] ${method} ${endpoint} error:`, error);
      
      // Extract error message from response
      const message = error.response?.data?.message || 
                     error.response?.data?.error || 
                     error.message || 
                     'An unexpected error occurred';
      
      const status = error.response?.status;
      
      return {
        success: false,
        message,
        status,
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
    }
  };
};

// ===================== CORE PRICING METHODS =====================
// These methods are used in the Pricing.jsx component

/**
 * Get all pricing plans
 */
const getPlans = createApiMethod('get', '/api/v1/pricing/plans');

/**
 * Create checkout session for plan
 */
const createCheckoutSession = createApiMethod('post', '/api/v1/pricing/checkout-session');

/**
 * Get organization subscription
 */
const getOrganizationSubscription = createApiMethod('get', '/api/v1/pricing/organizations/:organizationId/subscription');

/**
 * Export plan comparison (returns blob for download)
 */
const exportPlanComparison = async (billingCycle) => {
  try {
    const response = await api.get('/api/v1/pricing/export/comparison', {
      responseType: 'blob',
      params: { cycle: billingCycle },
    });

    // Create blob URL for download
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const filename = `plan-comparison-${billingCycle}-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
      success: true,
      data: {
        blob,
        url,
        filename,
        type: blob.type,
        size: blob.size,
      },
    };
  } catch (error) {
    console.error('[PricingAPI] Export plan comparison error:', error);
    
    // Try alternative method if available
    try {
      const response = await api.get('/api/v1/pricing/export/comparison/url', {
        params: { cycle: billingCycle },
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (fallbackError) {
      return {
        success: false,
        message: error.response?.data?.message || 
                fallbackError.response?.data?.message || 
                'Failed to export plan comparison',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      };
    }
  }
};

// ===================== EXTENDED METHODS =====================
// These methods are available but not all used in Pricing.jsx

const getPlan = createApiMethod('get', '/api/v1/pricing/plans/:planId');
const getCurrentPlan = createApiMethod('get', '/api/v1/pricing/organizations/:organizationId/current-plan');
const getPlanComparison = createApiMethod('get', '/api/v1/pricing/comparison');
const getFeaturedPlans = createApiMethod('get', '/api/v1/pricing/featured');
const getUsageRecommendation = createApiMethod('get', '/api/v1/pricing/recommendations/:organizationId');
const getUpgradeOptions = createApiMethod('get', '/api/v1/pricing/organizations/:organizationId/upgrade-options');
const getPricingFAQ = createApiMethod('get', '/api/v1/pricing/faq');
const getPlanFeatures = createApiMethod('get', '/api/v1/pricing/features');
const getFeature = createApiMethod('get', '/api/v1/pricing/features/:featureId');
const getFeatureCategories = createApiMethod('get', '/api/v1/pricing/feature-categories');
const requestCustomQuote = createApiMethod('post', '/api/v1/pricing/quotes/request');
const getCustomQuote = createApiMethod('get', '/api/v1/pricing/quotes/:quoteId');
const acceptCustomQuote = createApiMethod('post', '/api/v1/pricing/quotes/:quoteId/accept');
const declineCustomQuote = createApiMethod('post', '/api/v1/pricing/quotes/:quoteId/decline');
const checkTrialEligibility = createApiMethod('get', '/api/v1/pricing/trials/eligibility/:organizationId');
const startFreeTrial = createApiMethod('post', '/api/v1/pricing/trials/start/:organizationId');
const getTrialStatus = createApiMethod('get', '/api/v1/pricing/trials/status/:organizationId');
const extendTrial = createApiMethod('post', '/api/v1/pricing/trials/extend/:organizationId');
const scheduleDemo = createApiMethod('post', '/api/v1/pricing/demos/schedule');
const getDemoAvailability = createApiMethod('get', '/api/v1/pricing/demos/availability');
const calculateSubscriptionCost = createApiMethod('post', '/api/v1/pricing/calculate');
const previewPlanChange = createApiMethod('post', '/api/v1/pricing/preview-change/:organizationId');
const getActivePromotions = createApiMethod('get', '/api/v1/pricing/promotions/active');
const validatePromotionCode = createApiMethod('get', '/api/v1/pricing/promotions/validate/:promoCode');
const applyPromotionToQuote = createApiMethod('post', '/api/v1/pricing/quotes/:quoteId/apply-promotion');
const getSpecialDiscounts = createApiMethod('get', '/api/v1/pricing/discounts/special');
const getRegionalPricing = createApiMethod('get', '/api/v1/pricing/regional/:countryCode');
const getExchangeRates = createApiMethod('get', '/api/v1/pricing/exchange-rates');
const convertToLocalCurrency = createApiMethod('post', '/api/v1/pricing/convert-currency');
const getEnterpriseFeatures = createApiMethod('get', '/api/v1/pricing/enterprise/features');
const requestEnterpriseConsultation = createApiMethod('post', '/api/v1/pricing/enterprise/consultation');
const getEnterpriseTiers = createApiMethod('get', '/api/v1/pricing/enterprise/tiers');
const getPlanUsageMetrics = createApiMethod('get', '/api/v1/pricing/usage/:organizationId/:planId');
const getPlanLimits = createApiMethod('get', '/api/v1/pricing/limits/:planId');
const checkPlanLimitUsage = createApiMethod('get', '/api/v1/pricing/limits/usage/:organizationId/:limitType');
const sharePlanComparison = createApiMethod('post', '/api/v1/pricing/share/comparison');
const generatePricingProposal = createApiMethod('post', '/api/v1/pricing/proposals/generate');
const getPricingAnalytics = createApiMethod('get', '/api/v1/pricing/analytics');
const getConversionMetrics = createApiMethod('get', '/api/v1/pricing/conversions');
const getPlanPopularity = createApiMethod('get', '/api/v1/pricing/popularity');
const checkPricingHealth = createApiMethod('get', '/api/v1/pricing/health');
const getPricingApiVersion = createApiMethod('get', '/api/v1/pricing/version');

// ===================== MOCK DATA FOR DEVELOPMENT =====================
const mockPlans = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'For small teams getting started',
    monthlyPrice: '$29',
    annualPrice: '$290',
    annualPriceId: 'price_basic_annual',
    monthlyPriceId: 'price_basic_monthly',
    annualSavings: 17,
    level: 1,
    popular: false,
    features: {
      assessmentsLimit: '100',
      questionTypes: '5',
      analytics: false,
      storage: '5GB',
      teamMembers: '5',
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
      ssoIntegration: false,
      dedicatedManager: false,
      customIntegrations: false,
      sla: false
    },
    featuresList: [
      'Up to 100 assessments per month',
      '5 question types',
      'Basic analytics dashboard',
      '5GB storage',
      'Up to 5 team members',
      'Email support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing teams and businesses',
    monthlyPrice: '$79',
    annualPrice: '$790',
    annualPriceId: 'price_professional_annual',
    monthlyPriceId: 'price_professional_monthly',
    annualSavings: 20,
    level: 2,
    popular: true,
    features: {
      assessmentsLimit: '500',
      questionTypes: '12',
      analytics: true,
      storage: '50GB',
      teamMembers: '25',
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
      ssoIntegration: false,
      dedicatedManager: false,
      customIntegrations: false,
      sla: false
    },
    featuresList: [
      'Up to 500 assessments per month',
      '12 question types',
      'Advanced analytics',
      '50GB storage',
      'Up to 25 team members',
      'API access',
      'Custom branding',
      'Priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with complex needs',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    annualPriceId: 'price_enterprise_custom',
    monthlyPriceId: 'price_enterprise_custom',
    annualSavings: 0,
    level: 3,
    popular: false,
    features: {
      assessmentsLimit: 'Unlimited',
      questionTypes: 'All',
      analytics: true,
      storage: 'Unlimited',
      teamMembers: 'Unlimited',
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
      ssoIntegration: true,
      dedicatedManager: true,
      customIntegrations: true,
      sla: true
    },
    featuresList: [
      'Unlimited assessments',
      'All question types',
      'Advanced analytics with custom reports',
      'Unlimited storage',
      'Unlimited team members',
      'Full API access',
      'White-label branding',
      '24/7 priority support',
      'SSO integration',
      'Dedicated account manager',
      'Custom integrations',
      '99.9% SLA guarantee'
    ]
  }
];

// ===================== DEVELOPMENT FALLBACKS =====================
// If API is not available, use mock data for development

const getPlansWithFallback = async (params = {}) => {
  try {
    const result = await getPlans(params);
    
    // If API returns error or no data, use mock data in development
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('Using mock pricing data for development');
      return {
        success: true,
        data: { plans: mockPlans },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock pricing data for development due to error:', error);
      return {
        success: true,
        data: { plans: mockPlans },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to load pricing plans',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

const createCheckoutSessionWithFallback = async (checkoutData) => {
  try {
    const result = await createCheckoutSession(checkoutData);
    
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('Using mock checkout session for development');
      return {
        success: true,
        data: {
          url: '#',
          sessionId: 'mock_checkout_session_' + Date.now(),
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock checkout session for development due to error:', error);
      return {
        success: true,
        data: {
          url: '#',
          sessionId: 'mock_checkout_session_' + Date.now(),
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to create checkout session',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

const getOrganizationSubscriptionWithFallback = async (organizationId) => {
  try {
    const result = await getOrganizationSubscription(null, { organizationId });
    
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('Using mock subscription data for development');
      return {
        success: true,
        data: {
          planId: null,
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock subscription data for development due to error:', error);
      return {
        success: true,
        data: {
          planId: null,
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to load subscription',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

// ===================== EXPORT =====================

const pricingApi = {
  // Core methods used in Pricing.jsx (with fallbacks)
  getPlans: getPlansWithFallback,
  createCheckoutSession: createCheckoutSessionWithFallback,
  getOrganizationSubscription: getOrganizationSubscriptionWithFallback,
  exportPlanComparison,
  
  // Extended methods (without fallbacks)
  getPlan,
  getCurrentPlan,
  getPlanComparison,
  getFeaturedPlans,
  getUsageRecommendation,
  getUpgradeOptions,
  getPricingFAQ,
  getPlanFeatures,
  getFeature,
  getFeatureCategories,
  requestCustomQuote,
  getCustomQuote,
  acceptCustomQuote,
  declineCustomQuote,
  checkTrialEligibility,
  startFreeTrial,
  getTrialStatus,
  extendTrial,
  scheduleDemo,
  getDemoAvailability,
  calculateSubscriptionCost,
  previewPlanChange,
  getActivePromotions,
  validatePromotionCode,
  applyPromotionToQuote,
  getSpecialDiscounts,
  getRegionalPricing,
  getExchangeRates,
  convertToLocalCurrency,
  getEnterpriseFeatures,
  requestEnterpriseConsultation,
  getEnterpriseTiers,
  getPlanUsageMetrics,
  getPlanLimits,
  checkPlanLimitUsage,
  sharePlanComparison,
  generatePricingProposal,
  getPricingAnalytics,
  getConversionMetrics,
  getPlanPopularity,
  checkPricingHealth,
  getPricingApiVersion,
  
  // Utility method for testing
  getMockPlans: () => ({
    success: true,
    data: { plans: mockPlans },
    fromMock: true,
  }),
};

export default pricingApi;
