// src/api/revenueApi.js
import { api, retryWithBackoff, validateResponse, apiEvents, TokenManager } from './index';

/**
 * Revenue API Service for Assessly Platform
 * Financial analytics, revenue tracking, subscription metrics
 * Multi-tenant revenue intelligence with forecasting
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

// ===================== REVENUE DATA & ANALYTICS =====================

export const fetchRevenueData = async (params = {}) => {
  if (!TokenManager.hasPermission('revenue:read') &&
      !TokenManager.hasPermission('super_admin')) {
    throw new Error('Unauthorized: Revenue read permission required');
  }

  try {
    const response = await retryWithBackoff(() => 
      api.get('/api/v1/revenue/data', {
        params: {
          granularity: params.granularity || 'month',
          includeDetailed: true,
          includeGrowthMetrics: true,
          includeSeasonality: true,
          ...params
        }
      })
    );

    validateResponse(response.data, ['timeline', 'summary', 'metrics', 'breakdown']);

    apiEvents.emit('revenue:data:loaded', {
      period: params.granularity || 'month',
      dataPoints: response.data.timeline?.length || 0,
      totalRevenue: response.data.summary?.totalRevenue,
      ...response.data
    });

    return response.data;

  } catch (error) {
    console.error('[RevenueAPI] Fetch revenue data error:', error);

    if (import.meta.env.MODE === 'development') {
      console.warn('[RevenueAPI] Using mock revenue data for development');
      return generateMockRevenueData(params);
    }

    apiEvents.emit('revenue:data:error', { error, params });
    throw error;
  }
};

export const fetchRevenueAnalytics = async (params = {}) => {
  if (!TokenManager.hasPermission('revenue:analytics') &&
      !TokenManager.hasPermission('super_admin')) {
    throw new Error('Unauthorized: Revenue analytics permission required');
  }

  try {
    const response = await retryWithBackoff(() =>
      api.get('/api/v1/revenue/analytics', {
        params: {
          includePredictiveAnalytics: true,
          includeCustomerSegmentation: true,
          includeAnomalyDetection: true,
          ...params
        }
      })
    );

    validateResponse(response.data, ['summary', 'metrics', 'distributions', 'insights', 'recommendations']);

    apiEvents.emit('revenue:analytics:loaded', {
      mrr: response.data.summary?.mrr,
      growthRate: response.data.metrics?.growthRate,
      insightsCount: response.data.insights?.length || 0
    });

    return response.data;

  } catch (error) {
    console.error('[RevenueAPI] Fetch revenue analytics error:', error);

    if (import.meta.env.MODE === 'development') {
      console.warn('[RevenueAPI] Using mock revenue analytics for development');
      return generateMockRevenueAnalytics(params);
    }

    apiEvents.emit('revenue:analytics:error', { error, params });
    throw error;
  }
};

// ===================== REVENUE METRICS & KPIs =====================

export const fetchMRR = async (params = {}) => {
  if (!TokenManager.hasPermission('revenue:metrics') &&
      !TokenManager.hasPermission('super_admin')) {
    throw new Error('Unauthorized: Revenue metrics permission required');
  }

  try {
    const response = await retryWithBackoff(() =>
      api.get('/api/v1/revenue/mrr', {
        params: {
          includeBreakdown: true,
          includeTrends: true,
          includeComparisons: true,
          ...params
        }
      })
    );

    validateResponse(response.data, ['total', 'breakdown', 'trend', 'forecast']);
    apiEvents.emit('revenue:mrr:loaded', { total: response.data.total });
    return response.data;

  } catch (error) {
    console.error('[RevenueAPI] Fetch MRR error:', error);

    if (import.meta.env.MODE === 'development') {
      console.warn('[RevenueAPI] Using mock MRR data for development');
      return generateMockMRR(params);
    }

    apiEvents.emit('revenue:mrr:error', { error, params });
    throw error;
  }
};

export const fetchChurnAnalytics = async (params = {}) => {
  if (!TokenManager.hasPermission('revenue:churn') &&
      !TokenManager.hasPermission('super_admin')) {
    throw new Error('Unauthorized: Churn analytics permission required');
  }

  try {
    const response = await retryWithBackoff(() =>
      api.get('/api/v1/revenue/churn', {
        params: {
          includeCohortAnalysis: true,
          includeChurnReasons: true,
          includeRetentionMetrics: true,
          ...params
        }
      })
    );

    validateResponse(response.data, ['churnRate', 'retentionRate', 'cohorts', 'reasons', 'predictions']);

    apiEvents.emit('revenue:churn:analyzed', {
      churnRate: response.data.churnRate,
      retentionRate: response.data.retentionRate,
      cohorts: response.data.cohorts?.length || 0
    });

    return response.data;

  } catch (error) {
    console.error('[RevenueAPI] Fetch churn analytics error:', error);

    if (import.meta.env.MODE === 'development') {
      console.warn('[RevenueAPI] Using mock churn analytics for development');
      return generateMockChurnAnalytics(params);
    }

    apiEvents.emit('revenue:churn:error', { error, params });
    throw error;
  }
};

// ===================== HELPERS =====================

export const formatCurrency = (amount, currency = 'USD') => {
  if (amount >= 1000000) return `${currency} ${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${currency} ${(amount / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

export const getMetricColor = (value, target) => {
  const percentage = (value / target) * 100;
  if (percentage >= 120) return 'text-green-600';
  if (percentage >= 100) return 'text-green-500';
  if (percentage >= 80) return 'text-yellow-500';
  if (percentage >= 60) return 'text-orange-500';
  return 'text-red-500';
};

// ===================== MOCK DATA GENERATORS =====================

function generateMockRevenueData(params) {
  const granularity = params.granularity || 'month';
  const now = new Date();
  const timeline = [];
  let dataPoints, incrementFn;

  switch (granularity) {
    case 'day': dataPoints = 30; incrementFn = i => now.setDate(now.getDate() - i); break;
    case 'week': dataPoints = 12; incrementFn = i => now.setDate(now.getDate() - i * 7); break;
    case 'month': dataPoints = 12; incrementFn = i => now.setMonth(now.getMonth() - i); break;
    case 'quarter': dataPoints = 8; incrementFn = i => now.setMonth(now.getMonth() - i * 3); break;
    case 'year': dataPoints = 5; incrementFn = i => now.setFullYear(now.getFullYear() - i); break;
    default: dataPoints = 12; incrementFn = i => now.setMonth(now.getMonth() - i);
  }

  let baseRevenue = 35000;
  for (let i = dataPoints - 1; i >= 0; i--) {
    const date = new Date(now);
    incrementFn(i);
    const variation = 1 + (Math.random() * 0.3 - 0.15);
    const revenue = Math.round(baseRevenue * variation);
    baseRevenue *= 1.02;

    timeline.push({
      date: date.toISOString(),
      revenue,
      growth: (Math.random() * 25) - 5,
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
      totalRevenue: timeline.reduce((sum, p) => sum + p.revenue, 0),
      averageRevenue: Math.round(timeline.reduce((sum, p) => sum + p.revenue, 0) / timeline.length),
      growthRate: 12.5,
      mrr: timeline[timeline.length - 1]?.mrr || 0,
      arr: (timeline[timeline.length - 1]?.mrr || 0) * 12
    },
    metrics: { churnRate: 2.74, retentionRate: 94.2, ltv: 1256.80, arpu: 88.44 },
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
    forecast: params.includeForecast ? { nextPeriod: Math.round(timeline[timeline.length - 1].revenue * 1.08), confidence: 85 } : undefined,
    fromMock: true
  };
}

function generateMockRevenueAnalytics(params) {
  return {
    summary: { mrr: 45280, arr: 543360, newMrr: 5620, churnedMrr: 1240, expansionMrr: 2340, netMrr: 6720, customerCount: 512, averageRevenuePerUser: 88.44, lifetimeValue: 1256.80 },
    metrics: { churnRate: 2.74, growthRate: 15.8, renewalRate: 94.2, conversionRate: 8.5, upgradeRate: 12.3, netPromoterScore: 42, customerSatisfaction: 4.2 },
    distributions: { planDistribution: [
      { plan: 'Basic', count: 156, revenue: 4524, percentage: 30.5 },
      { plan: 'Professional', count: 298, revenue: 23542, percentage: 52.0 },
      { plan: 'Enterprise', count: 58, revenue: 17214, percentage: 17.5 }
    ]},
    insights: [
      { type: 'growth', message: 'MRR growing at 15.8% MoM', impact: 'high', trend: 'positive' },
      { type: 'churn', message: 'Enterprise churn rate increased to 1.2%', impact: 'medium', trend: 'negative' },
      { type: 'opportunity', message: 'Basic plan customers showing high upgrade intent', impact: 'medium', trend: 'opportunity' }
    ],
    recommendations: ['Focus on upselling Basic plan customers', 'Investigate increased Enterprise churn', 'Consider price optimization'],
    fromMock: true
  };
}

function generateMockMRR(params) {
  return {
    total: 45280,
    breakdown: { basic: 12000, professional: 25000, enterprise: 8280 },
    trend: Array(12).fill(0).map((_, i) => Math.round(40000 + i * 500 * Math.random())),
    forecast: 48000,
    fromMock: true
  };
}

function generateMockChurnAnalytics(params) {
  return {
    churnRate: 2.74,
    retentionRate: 94.2,
    cohorts: [{ period: 'Jan', churn: 3 }, { period: 'Feb', churn: 2 }],
    reasons: ['Pricing', 'Feature Gap', 'Competition'],
    predictions: [{ period: 'Next Month', churnRate: 2.8 }],
    fromMock: true
  };
}

// ===================== DEFAULT EXPORT =====================

const revenueApi = {
  fetchRevenueData,
  fetchRevenueAnalytics,
  fetchMRR,
  fetchChurnAnalytics,
  formatCurrency,
  getMetricColor,
};

export default revenueApi;
