// src/api/revenueApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';

/**
 * Revenue API Service for Assessly Platform
 * Comprehensive financial analytics, revenue tracking, and subscription metrics
 * Multi-tenant revenue intelligence with forecasting and insights
 */

const revenueApi = {
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
  fetchRevenueData: async (params = {}) => {
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
  },
  
  /**
   * Get advanced revenue analytics and business insights
   * @param {Object} params - Analytics parameters
   * @returns {Promise<Object>} Comprehensive revenue analytics
   */
  fetchRevenueAnalytics: async (params = {}) => {
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
  },
  
  // ===================== REVENUE METRICS & KPIS =====================
  
  /**
   * Get Monthly Recurring Revenue (MRR) with detailed breakdown
   * @param {Object} params - MRR query parameters
   * @returns {Promise<Object>} MRR metrics and trends
   */
  fetchMRR: async (params = {}) => {
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
  },
  
  /**
   * Get Annual Recurring Revenue (ARR) metrics
   * @param {Object} params - ARR query parameters
   * @returns {Promise<Object>} ARR calculations and projections
   */
  fetchARR: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:metrics') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue metrics permission required');
      }
      
      const response = await api.get('/api/v1/revenue/arr', {
        params: {
          includeProjections: true,
          includeRunRate: true,
          includeGrowth: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['current', 'projected', 'growthRate', 'runRate']);
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch ARR error:', error);
      throw error;
    }
  },
  
  /**
   * Get customer churn analytics with cohort analysis
   * @param {Object} params - Churn analysis parameters
   * @returns {Promise<Object>} Churn metrics and insights
   */
  fetchChurnAnalytics: async (params = {}) => {
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
  },
  
  /**
   * Get customer lifetime value (LTV) metrics
   * @param {Object} params - LTV calculation parameters
   * @returns {Promise<Object>} LTV metrics and customer segmentation
   */
  fetchLTV: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:metrics') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue metrics permission required');
      }
      
      const response = await api.get('/api/v1/revenue/ltv', {
        params: {
          includeCohortAnalysis: true,
          includeSegmentation: true,
          includePredictions: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['averageLTV', 'segments', 'cohorts', 'predictions']);
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch LTV error:', error);
      throw error;
    }
  },
  
  /**
   * Get average revenue per user (ARPU) metrics
   * @param {Object} params - ARPU calculation parameters
   * @returns {Promise<Object>} ARPU metrics and trends
   */
  fetchARPU: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:metrics') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue metrics permission required');
      }
      
      const response = await api.get('/api/v1/revenue/arpu', {
        params: {
          includeTrends: true,
          includeSegmentation: true,
          includeComparisons: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['average', 'trend', 'segments', 'comparisons']);
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch ARPU error:', error);
      throw error;
    }
  },
  
  /**
   * Get revenue growth rate analysis
   * @param {Object} params - Growth analysis parameters
   * @returns {Promise<Object>} Growth metrics and analysis
   */
  fetchGrowthRate: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:growth') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue growth permission required');
      }
      
      const response = await api.get('/api/v1/revenue/growth-rate', {
        params: {
          includeComponents: true,
          includeMoMComparison: true,
          includeYoYComparison: true,
          ...params
        }
      });
      
      validateResponse(response.data, [
        'currentRate', 
        'components', 
        'trend', 
        'comparisons', 
        'forecast'
      ]);
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch growth rate error:', error);
      throw error;
    }
  },
  
  // ===================== REVENUE BREAKDOWN & SEGMENTATION =====================
  
  /**
   * Get revenue breakdown by various dimensions
   * @param {Object} params - Breakdown parameters
   * @returns {Promise<Object>} Multi-dimensional revenue breakdown
   */
  fetchRevenueBreakdown: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:breakdown') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue breakdown permission required');
      }
      
      const response = await api.get('/api/v1/revenue/breakdown', {
        params: {
          byPlan: true,
          byRegion: true,
          byIndustry: true,
          byOrganizationSize: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['byPlan', 'byRegion', 'byIndustry', 'bySize']);
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch revenue breakdown error:', error);
      throw error;
    }
  },
  
  /**
   * Get subscription plan revenue analytics
   * @param {Object} params - Plan analytics parameters
   * @returns {Promise<Object>} Plan-specific revenue metrics
   */
  fetchPlanAnalytics: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:plans') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Plan analytics permission required');
      }
      
      const response = await api.get('/api/v1/revenue/plans/analytics', {
        params: {
          includeUpgradePaths: true,
          includeChurnAnalysis: true,
          includeProfitability: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['plans', 'metrics', 'trends', 'insights']);
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch plan analytics error:', error);
      throw error;
    }
  },
  
  /**
   * Get top revenue-generating organizations
   * @param {Object} params - Top organizations parameters
   * @returns {Promise<Object>} Top organizations with revenue metrics
   */
  fetchTopOrganizations: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:organizations') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Organization revenue permission required');
      }
      
      const response = await api.get('/api/v1/revenue/top-organizations', {
        params: {
          limit: params.limit || 10,
          includeGrowth: true,
          includeLifetimeValue: true,
          includeEngagement: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['organizations', 'summary', 'trends']);
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch top organizations error:', error);
      throw error;
    }
  },
  
  // ===================== REVENUE FORECASTING & TRENDS =====================
  
  /**
   * Get revenue forecasting with multiple models
   * @param {Object} params - Forecasting parameters
   * @returns {Promise<Object>} Revenue forecasts with confidence intervals
   */
  fetchRevenueForecast: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:forecast') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue forecasting permission required');
      }
      
      const response = await api.get('/api/v1/revenue/forecast', {
        params: {
          horizon: params.horizon || '12m',
          includeMultipleModels: true,
          includeScenarioAnalysis: true,
          includeConfidenceIntervals: true,
          ...params
        }
      });
      
      validateResponse(response.data, [
        'forecasts', 
        'scenarios', 
        'confidence', 
        'assumptions', 
        'accuracy'
      ]);
      
      apiEvents.emit('revenue:forecast_generated', {
        horizon: params.horizon || '12m',
        models: response.data.forecasts?.length || 0,
        confidence: response.data.confidence
      });
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch revenue forecast error:', error);
      throw error;
    }
  },
  
  /**
   * Get revenue trends analysis
   * @param {Object} params - Trend analysis parameters
   * @returns {Promise<Object>} Revenue trends and patterns
   */
  fetchRevenueTrends: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:trends') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue trends permission required');
      }
      
      const response = await api.get('/api/v1/revenue/trends', {
        params: {
          includeSeasonality: true,
          includeAnomalies: true,
          includeCorrelations: true,
          ...params
        }
      });
      
      validateResponse(response.data, [
        'trends', 
        'seasonality', 
        'anomalies', 
        'patterns', 
        'insights'
      ]);
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch revenue trends error:', error);
      throw error;
    }
  },
  
  // ===================== DASHBOARD & REAL-TIME METRICS =====================
  
  /**
   * Get dashboard revenue metrics
   * @returns {Promise<Object>} Key revenue metrics for dashboard
   */
  fetchDashboardMetrics: async () => {
    try {
      if (!TokenManager.hasPermission('revenue:dashboard') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Dashboard revenue permission required');
      }
      
      const response = await api.get('/api/v1/revenue/dashboard-metrics', {
        params: {
          includeTrends: true,
          includeComparisons: true,
          includeQuickActions: true
        }
      });
      
      validateResponse(response.data, [
        'mrr', 
        'arr', 
        'growthRate', 
        'churnRate', 
        'arpu', 
        'ltv'
      ]);
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch dashboard metrics error:', error);
      throw error;
    }
  },
  
  /**
   * Get real-time revenue updates
   * @param {Object} params - Real-time parameters
   * @returns {Promise<Object>} Real-time revenue metrics
   */
  fetchRealtimeRevenue: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:realtime') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Real-time revenue permission required');
      }
      
      const response = await api.get('/api/v1/revenue/realtime', {
        params: {
          window: params.window || '24h',
          includeTransactions: params.includeTransactions || false,
          includeAlerts: params.includeAlerts || true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch real-time revenue error:', error);
      throw error;
    }
  },
  
  // ===================== REVENUE MANAGEMENT & HEALTH =====================
  
  /**
   * Get revenue health score and diagnostics
   * @param {Object} params - Health assessment parameters
   * @returns {Promise<Object>} Revenue health assessment
   */
  fetchRevenueHealthScore: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:health') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue health permission required');
      }
      
      const response = await api.get('/api/v1/revenue/health-score', {
        params: {
          includeDiagnostics: true,
          includeRecommendations: true,
          includeTrend: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['score', 'components', 'diagnostics', 'recommendations']);
      
      apiEvents.emit('revenue:health_assessed', {
        score: response.data.score,
        components: response.data.components?.length || 0,
        recommendations: response.data.recommendations?.length || 0
      });
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch revenue health score error:', error);
      throw error;
    }
  },
  
  /**
   * Get revenue alerts and anomalies
   * @param {Object} params - Alert parameters
   * @returns {Promise<Object>} Revenue alerts and notifications
   */
  fetchRevenueAlerts: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:alerts') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue alerts permission required');
      }
      
      const response = await api.get('/api/v1/revenue/alerts', {
        params: {
          severity: params.severity || 'all',
          includeResolved: params.includeResolved || false,
          includeTrends: params.includeTrends || true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[RevenueAPI] Fetch revenue alerts error:', error);
      throw error;
    }
  },
  
  // ===================== EXPORT & REPORTING =====================
  
  /**
   * Export revenue reports in various formats
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export data with blob
   */
  exportRevenueReport: async (options = {}) => {
    try {
      if (!TokenManager.hasPermission('revenue:export') && 
          !TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Revenue export permission required');
      }
      
      const response = await api.get('/api/v1/revenue/export', {
        responseType: 'blob',
        params: {
          format: options.format || 'excel',
          include: options.include || ['summary', 'timeline', 'breakdown', 'forecast'],
          startDate: options.startDate,
          endDate: options.endDate,
          ...options
        }
      });
      
      const contentType = response.headers['content-type'];
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                     `revenue_report_${new Date().toISOString().split('T')[0]}.${options.format === 'csv' ? 'csv' : 'xlsx'}`;
      
      return {
        blob: response.data,
        filename,
        contentType,
        size: response.data.size,
        url: URL.createObjectURL(response.data)
      };
    } catch (error) {
      console.error('[RevenueAPI] Export revenue report error:', error);
      throw error;
    }
  },
  
  // ===================== UTILITY FUNCTIONS =====================
  
  /**
   * Calculate MRR growth rate
   * @param {number} currentMRR - Current MRR
   * @param {number} previousMRR - Previous period MRR
   * @returns {number} Growth rate percentage
   */
  calculateGrowthRate: (currentMRR, previousMRR) => {
    if (!previousMRR || previousMRR === 0) return 0;
    return ((currentMRR - previousMRR) / previousMRR) * 100;
  },
  
  /**
   * Calculate churn rate
   * @param {number} lostCustomers - Customers lost in period
   * @param {number} startingCustomers - Customers at start of period
   * @returns {number} Churn rate percentage
   */
  calculateChurnRate: (lostCustomers, startingCustomers) => {
    if (!startingCustomers || startingCustomers === 0) return 0;
    return (lostCustomers / startingCustomers) * 100;
  },
  
  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency string
   */
  formatCurrency: (amount, currency = 'USD') => {
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
  },
  
  /**
   * Get revenue metric colors based on performance
   * @param {number} value - Metric value
   * @param {number} target - Target value
   * @returns {string} CSS color class
   */
  getMetricColor: (value, target) => {
    const percentage = (value / target) * 100;
    if (percentage >= 120) return 'text-green-600';
    if (percentage >= 100) return 'text-green-500';
    if (percentage >= 80) return 'text-yellow-500';
    if (percentage >= 60) return 'text-orange-500';
    return 'text-red-500';
  },
  
  /**
   * Get trend arrow direction
   * @param {number} current - Current value
   * @param {number} previous - Previous value
   * @returns {string} Arrow direction (up, down, stable)
   */
  getTrendDirection: (current, previous) => {
    if (current > previous * 1.1) return 'up';
    if (current < previous * 0.9) return 'down';
    return 'stable';
  },
  
  /**
   * Subscribe to revenue events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on: (event, callback) => {
    apiEvents.on(`revenue:${event}`, callback);
  },
  
  /**
   * Unsubscribe from revenue events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off: (event, callback) => {
    apiEvents.off(`revenue:${event}`, callback);
  },
  
  /**
   * Initialize revenue module
   * @returns {Promise<Object>} Initialization status
   */
  initialize: async () => {
    try {
      // Check permissions
      if (!TokenManager.hasPermission('revenue:read') && 
          !TokenManager.hasPermission('super_admin')) {
        return {
          success: false,
          authorized: false,
          message: 'Insufficient permissions for revenue access'
        };
      }
      
      // Load initial dashboard metrics
      const metrics = await revenueApi.fetchDashboardMetrics();
      
      // Subscribe to real-time updates if available
      const ws = subscribeToRevenueUpdates();
      
      apiEvents.emit('revenue:initialized', {
        authorized: true,
        metrics: metrics,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        authorized: true,
        metrics: metrics,
        websocket: ws
      };
    } catch (error) {
      console.error('[RevenueAPI] Initialize error:', error);
      return {
        success: false,
        authorized: false,
        error: error.message
      };
    }
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Subscribe to real-time revenue updates via WebSocket
 */
function subscribeToRevenueUpdates() {
  try {
    const token = TokenManager.getToken();
    if (!token) return null;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBaseUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const wsUrl = `${wsBaseUrl}/api/v1/revenue/ws?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('[RevenueAPI] WebSocket connected for revenue updates');
      apiEvents.emit('revenue:websocket_connected');
      
      // Subscribe to revenue updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['revenue_updates', 'transaction_alerts', 'forecast_updates'],
        userId: TokenManager.getUserInfo()?.id,
        timestamp: new Date().toISOString()
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'revenue_update') {
          apiEvents.emit('revenue:update_received', data.data);
        } else if (data.type === 'transaction_alert') {
          apiEvents.emit('revenue:transaction_alert', data.data);
        } else if (data.type === 'forecast_update') {
          apiEvents.emit('revenue:forecast_updated', data.data);
        }
      } catch (error) {
        console.error('[RevenueAPI] WebSocket message parse error:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('[RevenueAPI] WebSocket disconnected');
      apiEvents.emit('revenue:websocket_disconnected');
      
      // Attempt reconnection
      setTimeout(() => {
        if (TokenManager.getToken()) {
          subscribeToRevenueUpdates();
        }
      }, 5000);
    };
    
    return ws;
  } catch (error) {
    console.error('[RevenueAPI] WebSocket subscription error:', error);
    return null;
  }
}

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
      },
      organizations: {
        active: Math.floor(Math.random() * 50) + 450,
        new: Math.floor(Math.random() * 30) + 20,
        churned: Math.floor(Math.random() * 10) + 5,
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
      arpu: 88.44,
      cac: 325.60,
      paybackPeriod: 8.5
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
        { region: 'Asia Pacific', revenue: 5420, percentage: 12.0 },
        { region: 'Other', revenue: 1450, percentage: 3.2 }
      ]
    },
    forecast: params.includeForecast ? {
      nextPeriod: Math.round(timeline[timeline.length - 1].revenue * 1.08),
      confidence: 85,
      assumptions: ['Current growth rate continues', 'No major market changes']
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
      downgradeRate: 3.2,
      netPromoterScore: 42,
      customerSatisfaction: 4.2
    },
    distributions: {
      planDistribution: [
        { plan: 'Basic', count: 156, revenue: 4524, percentage: 30.5 },
        { plan: 'Professional', count: 298, revenue: 23542, percentage: 52.0 },
        { plan: 'Enterprise', count: 58, revenue: 17214, percentage: 17.5 }
      ],
      customerSegmentation: {
        highValue: { count: 58, revenue: 17214, percentage: 17.5 },
        mediumValue: { count: 298, revenue: 23542, percentage: 52.0 },
        lowValue: { count: 156, revenue: 4524, percentage: 30.5 }
      }
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
    predictiveAnalytics: params.includePredictiveAnalytics ? {
      churnPrediction: {
        atRiskCustomers: 12,
        riskScore: 3.8,
        predictedRevenueLoss: 2480
      },
      growthProjection: {
        nextMonth: 46850,
        nextQuarter: 49820,
        confidence: 85
      }
    } : undefined,
    fromMock: true
  };
}

// Helper for API_BASE_URL (for WebSocket)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://assesslyplatform-t49h.onrender.com";

export default revenueApi;
