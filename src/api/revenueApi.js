// src/api/revenueApi.js
import api from './axiosConfig';

/**
 * Revenue API Service
 * Returns consistent response format: { success: boolean, data: any, message?: string }
 * Handles financial analytics, revenue tracking, and subscription metrics
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

      // Normalize response
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data;
      }
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error(`[RevenueAPI] ${method} ${endpoint} error:`, error);
      
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

// ===================== REVENUE DATA =====================
// These are the missing named exports for RevenueChart.jsx

/**
 * Get revenue data with time series
 */
export const fetchRevenueData = async (params = {}) => {
  try {
    const result = await createApiMethod('get', '/api/v1/revenue/data')(null, params);
    
    // Provide mock data in development if API fails
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[RevenueAPI] Using mock revenue data for development');
      const now = new Date();
      const months = [];
      
      // Generate mock monthly data for the last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const revenue = Math.floor(Math.random() * 15000) + 35000; // $35k-$50k range
        const growth = (Math.random() * 20) - 5; // -5% to +15% growth
        
        months.push({
          month: monthName,
          date: date.toISOString(),
          revenue: revenue,
          growth: parseFloat(growth.toFixed(2)),
          planBreakdown: {
            basic: Math.floor(revenue * 0.25),
            professional: Math.floor(revenue * 0.60),
            enterprise: Math.floor(revenue * 0.15),
          },
          organizations: {
            active: Math.floor(Math.random() * 50) + 450,
            new: Math.floor(Math.random() * 30) + 20,
            churned: Math.floor(Math.random() * 10) + 5,
          },
        });
      }
      
      return {
        success: true,
        data: {
          monthlyData: months,
          totalRevenue: months.reduce((sum, month) => sum + month.revenue, 0),
          averageMonthlyRevenue: Math.floor(months.reduce((sum, month) => sum + month.revenue, 0) / months.length),
          growthRate: 12.5,
          currentMonth: months[months.length - 1],
          forecast: {
            nextMonth: Math.floor(months[months.length - 1].revenue * 1.08),
            nextQuarter: Math.floor(months[months.length - 1].revenue * 1.25),
            nextYear: Math.floor(months[months.length - 1].revenue * 1.45),
          },
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[RevenueAPI] Using mock revenue data for development due to error:', error);
      const now = new Date();
      const months = [];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const revenue = Math.floor(Math.random() * 15000) + 35000;
        const growth = (Math.random() * 20) - 5;
        
        months.push({
          month: monthName,
          date: date.toISOString(),
          revenue: revenue,
          growth: parseFloat(growth.toFixed(2)),
          planBreakdown: {
            basic: Math.floor(revenue * 0.25),
            professional: Math.floor(revenue * 0.60),
            enterprise: Math.floor(revenue * 0.15),
          },
          organizations: {
            active: Math.floor(Math.random() * 50) + 450,
            new: Math.floor(Math.random() * 30) + 20,
            churned: Math.floor(Math.random() * 10) + 5,
          },
        });
      }
      
      return {
        success: true,
        data: {
          monthlyData: months,
          totalRevenue: months.reduce((sum, month) => sum + month.revenue, 0),
          averageMonthlyRevenue: Math.floor(months.reduce((sum, month) => sum + month.revenue, 0) / months.length),
          growthRate: 12.5,
          currentMonth: months[months.length - 1],
          forecast: {
            nextMonth: Math.floor(months[months.length - 1].revenue * 1.08),
            nextQuarter: Math.floor(months[months.length - 1].revenue * 1.25),
            nextYear: Math.floor(months[months.length - 1].revenue * 1.45),
          },
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to fetch revenue data',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

/**
 * Get revenue analytics and insights
 */
export const fetchRevenueAnalytics = async (params = {}) => {
  try {
    const result = await createApiMethod('get', '/api/v1/revenue/analytics')(null, params);
    
    // Provide mock data in development if API fails
    if (!result.success && process.env.NODE_ENV === 'development') {
      console.warn('[RevenueAPI] Using mock revenue analytics for development');
      const now = new Date();
      
      return {
        success: true,
        data: {
          summary: {
            mrr: 45280, // Monthly Recurring Revenue
            arr: 543360, // Annual Recurring Revenue
            newMrr: 5620, // New MRR this month
            churnedMrr: 1240, // Churned MRR this month
            expansionMrr: 2340, // Expansion MRR this month
            netMrr: 6720, // Net new MRR
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
            downgradeRate: 3.2,
          },
          planDistribution: [
            { plan: 'Basic', count: 156, revenue: 4524, percentage: 30.5 },
            { plan: 'Professional', count: 298, revenue: 23542, percentage: 52.0 },
            { plan: 'Enterprise', count: 58, revenue: 17214, percentage: 17.5 },
          ],
          topOrganizations: [
            { id: 'org_001', name: 'TechCorp Inc', plan: 'Enterprise', revenue: 5200, joined: '2024-01-15' },
            { id: 'org_002', name: 'EduLearn Systems', plan: 'Professional', revenue: 4200, joined: '2024-02-10' },
            { id: 'org_003', name: 'HRPro Solutions', plan: 'Professional', revenue: 3800, joined: '2024-03-05' },
            { id: 'org_004', name: 'SkillAssess Co', plan: 'Professional', revenue: 3100, joined: '2024-01-22' },
            { id: 'org_005', name: 'LearnFast Academy', plan: 'Professional', revenue: 2900, joined: '2024-02-28' },
          ],
          revenueByRegion: [
            { region: 'North America', revenue: 28560, percentage: 63.1 },
            { region: 'Europe', revenue: 9850, percentage: 21.8 },
            { region: 'Asia Pacific', revenue: 5420, percentage: 12.0 },
            { region: 'Other', revenue: 1450, percentage: 3.2 },
          ],
          trends: {
            mrrGrowth: 15.8,
            customerGrowth: 12.4,
            arpuGrowth: 8.2,
            churnTrend: -0.5, // Improving (negative is good)
          },
          forecast: {
            nextMonth: 46850,
            nextQuarter: 49820,
            nextYear: 62540,
            confidence: 85,
          },
          lastUpdated: now.toISOString(),
        },
        fromMock: true,
      };
    }
    
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[RevenueAPI] Using mock revenue analytics for development due to error:', error);
      const now = new Date();
      
      return {
        success: true,
        data: {
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
            downgradeRate: 3.2,
          },
          planDistribution: [
            { plan: 'Basic', count: 156, revenue: 4524, percentage: 30.5 },
            { plan: 'Professional', count: 298, revenue: 23542, percentage: 52.0 },
            { plan: 'Enterprise', count: 58, revenue: 17214, percentage: 17.5 },
          ],
          topOrganizations: [
            { id: 'org_001', name: 'TechCorp Inc', plan: 'Enterprise', revenue: 5200, joined: '2024-01-15' },
            { id: 'org_002', name: 'EduLearn Systems', plan: 'Professional', revenue: 4200, joined: '2024-02-10' },
            { id: 'org_003', name: 'HRPro Solutions', plan: 'Professional', revenue: 3800, joined: '2024-03-05' },
            { id: 'org_004', name: 'SkillAssess Co', plan: 'Professional', revenue: 3100, joined: '2024-01-22' },
            { id: 'org_005', name: 'LearnFast Academy', plan: 'Professional', revenue: 2900, joined: '2024-02-28' },
          ],
          revenueByRegion: [
            { region: 'North America', revenue: 28560, percentage: 63.1 },
            { region: 'Europe', revenue: 9850, percentage: 21.8 },
            { region: 'Asia Pacific', revenue: 5420, percentage: 12.0 },
            { region: 'Other', revenue: 1450, percentage: 3.2 },
          ],
          trends: {
            mrrGrowth: 15.8,
            customerGrowth: 12.4,
            arpuGrowth: 8.2,
            churnTrend: -0.5,
          },
          forecast: {
            nextMonth: 46850,
            nextQuarter: 49820,
            nextYear: 62540,
            confidence: 85,
          },
          lastUpdated: now.toISOString(),
        },
        fromMock: true,
      };
    }
    return {
      success: false,
      message: error.message || 'Failed to fetch revenue analytics',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

// ===================== REVENUE METRICS =====================

/**
 * Get subscription revenue metrics
 */
export const fetchSubscriptionRevenue = createApiMethod('get', '/api/v1/revenue/subscriptions');

/**
 * Get Monthly Recurring Revenue (MRR) trends
 */
export const fetchMRR = createApiMethod('get', '/api/v1/revenue/mrr');

/**
 * Get Annual Recurring Revenue (ARR) trends
 */
export const fetchARR = createApiMethod('get', '/api/v1/revenue/arr');

/**
 * Get customer churn analytics
 */
export const fetchChurnAnalytics = createApiMethod('get', '/api/v1/revenue/churn');

/**
 * Get customer lifetime value (LTV) metrics
 */
export const fetchLTV = createApiMethod('get', '/api/v1/revenue/ltv');

/**
 * Get average revenue per user (ARPU)
 */
export const fetchARPU = createApiMethod('get', '/api/v1/revenue/arpu');

/**
 * Get revenue growth rate
 */
export const fetchGrowthRate = createApiMethod('get', '/api/v1/revenue/growth-rate');

// ===================== REVENUE BREAKDOWN =====================

/**
 * Get revenue breakdown by plan/segment
 */
export const fetchRevenueBreakdown = createApiMethod('get', '/api/v1/revenue/breakdown');

/**
 * Get subscription plan analytics
 */
export const fetchPlanAnalytics = createApiMethod('get', '/api/v1/revenue/plans/analytics');

/**
 * Get revenue by organization
 */
export const fetchRevenueByOrganization = createApiMethod('get', '/api/v1/revenue/by-organization');

/**
 * Get top revenue-generating organizations
 */
export const fetchTopOrganizations = createApiMethod('get', '/api/v1/revenue/top-organizations');

// ===================== REVENUE FORECASTING =====================

/**
 * Get revenue forecasting
 */
export const fetchRevenueForecast = createApiMethod('get', '/api/v1/revenue/forecast');

/**
 * Get revenue comparison between periods
 */
export const fetchRevenueComparison = createApiMethod('get', '/api/v1/revenue/comparison');

/**
 * Get revenue trends (daily, weekly, monthly)
 */
export const fetchRevenueTrends = createApiMethod('get', '/api/v1/revenue/trends');

// ===================== REVENUE FINANCIALS =====================

/**
 * Get payment and transaction data
 */
export const fetchPayments = createApiMethod('get', '/api/v1/revenue/payments');

/**
 * Get invoice and billing data
 */
export const fetchInvoices = createApiMethod('get', '/api/v1/revenue/invoices');

// ===================== REVENUE DASHBOARD =====================

/**
 * Get revenue metrics for dashboard
 */
export const fetchDashboardMetrics = createApiMethod('get', '/api/v1/revenue/dashboard-metrics');

/**
 * Get revenue summary (quick stats)
 */
export const fetchRevenueSummary = createApiMethod('get', '/api/v1/revenue/summary');

/**
 * Get real-time revenue updates
 */
export const fetchRealtimeRevenue = createApiMethod('get', '/api/v1/revenue/realtime');

// ===================== REVENUE MANAGEMENT =====================

/**
 * Get revenue goals and targets
 */
export const fetchRevenueGoals = createApiMethod('get', '/api/v1/revenue/goals');

/**
 * Get revenue health score
 */
export const fetchRevenueHealthScore = createApiMethod('get', '/api/v1/revenue/health-score');

/**
 * Get revenue alerts (anomalies, spikes, drops)
 */
export const fetchRevenueAlerts = createApiMethod('get', '/api/v1/revenue/alerts');

/**
 * Get revenue by date range
 */
export const fetchRevenueByDateRange = createApiMethod('get', '/api/v1/revenue/date-range');

// ===================== REVENUE EXPORT =====================

/**
 * Export revenue report
 */
export const exportRevenueReport = async (params = {}) => {
  try {
    const response = await api.get('/api/v1/revenue/export', {
      responseType: 'blob',
      params,
    });
    
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const filename = `revenue_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    
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
    console.error('[RevenueAPI] Error exporting revenue report:', error);
    return {
      success: false,
      message: error.message || 'Failed to export revenue report',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
};

// ===================== DEFAULT EXPORT =====================

const revenueApi = {
  // Revenue data (ADDED AS NAMED EXPORTS ABOVE)
  fetchRevenueData,
  fetchRevenueAnalytics,
  
  // Revenue metrics
  fetchSubscriptionRevenue,
  fetchMRR,
  fetchARR,
  fetchChurnAnalytics,
  fetchLTV,
  fetchARPU,
  fetchGrowthRate,
  
  // Revenue breakdown
  fetchRevenueBreakdown,
  fetchPlanAnalytics,
  fetchRevenueByOrganization,
  fetchTopOrganizations,
  
  // Revenue forecasting
  fetchRevenueForecast,
  fetchRevenueComparison,
  fetchRevenueTrends,
  
  // Revenue financials
  fetchPayments,
  fetchInvoices,
  
  // Revenue dashboard
  fetchDashboardMetrics,
  fetchRevenueSummary,
  fetchRealtimeRevenue,
  
  // Revenue management
  fetchRevenueGoals,
  fetchRevenueHealthScore,
  fetchRevenueAlerts,
  fetchRevenueByDateRange,
  
  // Revenue export
  exportRevenueReport,
};

export default revenueApi;
