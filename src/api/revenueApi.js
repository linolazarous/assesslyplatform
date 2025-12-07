// src/api/revenueApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';

/**
 * Revenue API Service for Assessly Platform
 * Comprehensive financial analytics, revenue tracking, and subscription metrics
 * Multi-tenant revenue intelligence with forecasting and insights
 */

// Helper for API_BASE_URL (for WebSocket)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

// ===================== REVENUE DATA & ANALYTICS =====================

/**
 * Get comprehensive revenue data with time series analysis
 * @param {Object} params - Query parameters
 * @param {string} params.granularity - Time granularity (day, week, month, quarter, year)
 * @param {string} params.startDate - Start date filter (ISO)
 * @param {string} params.endDate - End date filter (ISO)
 * @param {Array<string>} params.plans - Filter by subscription plans
 * @param {Array<string>} params.regions - Filter by regions
 * @param {boolean} params.includeForecast - Include revenue forecast
 * @param {boolean} params.includeComparison - Include period-over-period comparison
 * @returns {Promise<Object>} Revenue data with time series
 */
export const fetchRevenueData = async (params = {}) => {
  try {
    // Check admin permissions
    if (!TokenManager.hasPermission('revenue:read') && 
        !TokenManager.hasPermission('super_admin')) {
      throw new Error('Unauthorized: Revenue read permission required');
    }
    
    const response = await api.get('/api/v1/revenue/data', {
      params: {
        granularity: params.granularity || 'month',
        includeDetailed: true,
        includeGrowthMetrics: true,
        includeSeasonality: true,
        ...params
      }
    });
    
    validateResponse(response.data, ['timeline', 'summary', 'metrics', 'breakdown']);
    
    // Emit revenue data loaded event
    apiEvents.emit('revenue:data_loaded', {
      period: params.granularity || 'month',
      dataPoints: response.data.timeline?.length || 0,
      totalRevenue: response.data.summary?.totalRevenue,
      ...response.data
    });
    
    return response.data;
  } catch (error) {
    console.error('[RevenueAPI] Fetch revenue data error:', error);
    
    // Development mock data
    if (process.env.NODE_ENV === 'development') {
      console.warn('[RevenueAPI] Using mock revenue data for development');
      return generateMockRevenueData(params);
    }
    
    apiEvents.emit('revenue:data_error', { error, params });
    throw error;
  }
};

/**
 * Get advanced revenue analytics and business insights
 * @param {Object} params - Analytics parameters
 * @returns {Promise<Object>} Comprehensive revenue analytics
 */
export const fetchRevenueAnalytics = async (params = {}) => {
  try {
    if (!TokenManager.hasPermission('revenue:analytics') && 
        !TokenManager.hasPermission('super_admin')) {
      throw new Error('Unauthorized: Revenue analytics permission required');
    }
    
    const response = await api.get('/api/v1/revenue/analytics', {
      params: {
        includePredictiveAnalytics: true,
        includeCustomerSegmentation: true,
        includeAnomalyDetection: true,
        ...params
      }
    });
    
    validateResponse(response.data, [
      'summary', 
      'metrics', 
      'distributions', 
      'insights', 
      'recommendations'
    ]);
    
    apiEvents.emit('revenue:analytics_loaded', {
      mrr: response.data.summary?.mrr,
      growthRate: response.data.metrics?.growthRate,
      insightsCount: response.data.insights?.length || 0
    });
    
    return response.data;
  } catch (error) {
    console.error('[RevenueAPI] Fetch revenue analytics error:', error);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[RevenueAPI] Using mock revenue analytics for development');
      return generateMockRevenueAnalytics(params);
    }
    
    throw error;
  }
};

// ===================== REVENUE METRICS & KPIS =====================

/**
 * Get Monthly Recurring Revenue (MRR) with detailed breakdown
 * @param {Object} params - MRR query parameters
 * @returns {Promise<Object>} MRR metrics and trends
 */
export const fetchMRR = async (params = {}) => {
  try {
    if (!TokenManager.hasPermission('revenue:metrics') && 
        !TokenManager.hasPermission('super_admin')) {
      throw new Error('Unauthorized: Revenue metrics permission required');
    }
    
    const response = await api.get('/api/v1/revenue/mrr', {
      params: {
        includeBreakdown: true,
        includeTrends: true,
        includeComparisons: true,
        ...params
      }
    });
    
    validateResponse(response.data, ['total', 'breakdown', 'trend', 'forecast']);
    
    return response.data;
  } catch (error) {
    console.error('[RevenueAPI] Fetch MRR error:', error);
    throw error;
  }
};

/**
 * Get customer churn analytics with cohort analysis
 * @param {Object} params - Churn analysis parameters
 * @returns {Promise<Object>} Churn metrics and insights
 */
export const fetchChurnAnalytics = async (params = {}) => {
  try {
    if (!TokenManager.hasPermission('revenue:churn') && 
        !TokenManager.hasPermission('super_admin')) {
      throw new Error('Unauthorized: Churn analytics permission required');
    }
    
    const response = await api.get('/api/v1/revenue/churn', {
      params: {
        includeCohortAnalysis: true,
        includeChurnReasons: true,
        includeRetentionMetrics: true,
        ...params
      }
    });
    
    validateResponse(response.data, [
      'churnRate', 
      'retentionRate', 
      'cohorts', 
      'reasons', 
      'predictions'
    ]);
    
    apiEvents.emit('revenue:churn_analyzed', {
      churnRate: response.data.churnRate,
      retentionRate: response.data.retentionRate,
      cohorts: response.data.cohorts?.length || 0
    });
    
    return response.data;
  } catch (error) {
    console.error('[RevenueAPI] Fetch churn analytics error:', error);
    throw error;
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Get revenue metric colors based on performance
 * @param {number} value - Metric value
 * @param {number} target - Target value
 * @returns {string} CSS color class
 */
export const getMetricColor = (value, target) => {
  const percentage = (value / target) * 100;
  if (percentage >= 120) return 'text-green-600';
  if (percentage >= 100) return 'text-green-500';
  if (percentage >= 80) return 'text-yellow-500';
  if (percentage >= 60) return 'text-orange-500';
  return 'text-red-500';
};

/**
 * Generate mock revenue data for development
 */
function generateMockRevenueData(params) {
  const granularity = params.granularity || 'month';
  const now = new Date();
  const timeline = [];
  
  // Generate timeline based on granularity
  let dataPoints, dateStep;
  switch (granularity) {
    case 'day':
      dataPoints = 30;
      dateStep = 1;
      break;
    case 'week':
      dataPoints = 12;
      dateStep = 7;
      break;
    case 'month':
      dataPoints = 12;
      dateStep = 30;
      break;
    case 'quarter':
      dataPoints = 8;
      dateStep = 90;
      break;
    case 'year':
      dataPoints = 5;
      dateStep = 365;
      break;
    default:
      dataPoints = 12;
      dateStep = 30;
  }
  
  // Generate mock data points
  let baseRevenue = 35000;
  for (let i = dataPoints - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * dateStep);
    
    // Add some realistic variation
    const variation = 1 + (Math.random() * 0.3 - 0.15); // ±15% variation
    const revenue = Math.round(baseRevenue * variation);
    
    // Small growth over time
    baseRevenue *= 1.02;
    
    timeline.push({
      date: date.toISOString(),
      revenue: revenue,
      growth: (Math.random() * 25) - 5, // -5% to +20% growth
      mrr: Math.round(revenue * 0.85),
      newBusiness: Math.round(revenue * 0.25),
      expansion: Math.round(revenue * 0.15),
      churn: Math.round(revenue * 0.08),
      planBreakdown: {
        basic: Math.round(revenue * 0.25),
        professional: Math.round(revenue * 0.60),
        enterprise: Math.round(revenue * 0.15),
      }
    });
  }
  
  return {
    timeline,
    summary: {
      totalRevenue: timeline.reduce((sum, point) => sum + point.revenue, 0),
      averageRevenue: Math.round(timeline.reduce((sum, point) => sum + point.revenue, 0) / timeline.length),
      growthRate: 12.5,
      mrr: timeline[timeline.length - 1]?.mrr || 0,
      arr: timeline[timeline.length - 1]?.mrr * 12 || 0
    },
    metrics: {
      churnRate: 2.74,
      retentionRate: 94.2,
      ltv: 1256.80,
      arpu: 88.44
    },
    breakdown: {
      byPlan: [
        { plan: 'Basic', revenue: 4524, percentage: 30.5 },
        { plan: 'Professional', revenue: 23542, percentage: 52.0 },
        { plan: 'Enterprise', revenue: 17214, percentage: 17.5 }
      ],
      byRegion: [
        { region: 'North America', revenue: 28560, percentage: 63.1 },
        { region: 'Europe', revenue: 9850, percentage: 21.8 },
        { region: 'Asia Pacific', revenue: 5420, percentage: 12.0 }
      ]
    },
    forecast: params.includeForecast ? {
      nextPeriod: Math.round(timeline[timeline.length - 1].revenue * 1.08),
      confidence: 85
    } : undefined,
    fromMock: true
  };
}

/**
 * Generate mock revenue analytics
 */
function generateMockRevenueAnalytics(params) {
  return {
    summary: {
      mrr: 45280,
      arr: 543360,
      newMrr: 5620,
      churnedMrr: 1240,
      expansionMrr: 2340,
      netMrr: 6720,
      customerCount: 512,
      averageRevenuePerUser: 88.44,
      lifetimeValue: 1256.80,
    },
    metrics: {
      churnRate: 2.74,
      growthRate: 15.8,
      renewalRate: 94.2,
      conversionRate: 8.5,
      upgradeRate: 12.3,
      netPromoterScore: 42,
      customerSatisfaction: 4.2
    },
    distributions: {
      planDistribution: [
        { plan: 'Basic', count: 156, revenue: 4524, percentage: 30.5 },
        { plan: 'Professional', count: 298, revenue: 23542, percentage: 52.0 },
        { plan: 'Enterprise', count: 58, revenue: 17214, percentage: 17.5 }
      ]
    },
    insights: [
      { type: 'growth', message: 'MRR growing at 15.8% MoM', impact: 'high', trend: 'positive' },
      { type: 'churn', message: 'Enterprise churn rate increased to 1.2%', impact: 'medium', trend: 'negative' },
      { type: 'opportunity', message: 'Basic plan customers showing high upgrade intent', impact: 'medium', trend: 'opportunity' }
    ],
    recommendations: [
      'Focus on upselling Basic plan customers to Professional',
      'Investigate increased Enterprise churn',
      'Consider price optimization for high-growth markets'
    ],
    fromMock: true
  };
}

// ===================== DEFAULT EXPORT FOR BACKWARD COMPATIBILITY =====================

const revenueApi = {
  fetchRevenueData,
  fetchRevenueAnalytics,
  fetchMRR,
  fetchChurnAnalytics,
  formatCurrency,
  getMetricColor,
};

export default revenueApi;
