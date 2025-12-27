// src/api/searchApi.js
import { api, retryWithBackoff, validateResponse, apiEvents, TokenManager } from './index';

/**
 * Search API Service for Assessly Platform
 * Fully refactored for reliability, dev-mode mock support, and analytics
 */

const searchApi = {
  // ===================== UNIFIED SEARCH =====================

  /**
   * Unified search across all content types
   */
  searchAll: async (searchParams) => {
    try {
      if (import.meta.env.MODE === 'development') {
        return generateMockSearchData(searchParams);
      }

      const response = await retryWithBackoff(() =>
        api.post('/api/v1/search/all', {
          query: searchParams.query || '',
          types: searchParams.types || ['assessments', 'questions', 'templates', 'users'],
          page: searchParams.page || 1,
          limit: searchParams.limit || 20,
          filters: {
            organizationId: searchParams.organizationId || TokenManager.getTenantId(),
            status: 'active',
            ...searchParams.filters
          },
          sortBy: searchParams.sortBy || 'relevance',
          sortOrder: searchParams.sortOrder || 'desc',
          includeHighlights: true,
          includeScores: true,
          sessionId: generateSessionId()
        })
      );

      validateResponse(response.data, ['results', 'pagination', 'facets', 'stats']);
      logSearchActivity({ query: searchParams.query, types: searchParams.types, resultsCount: response.data.results?.length || 0, sessionId: response.config.data?.sessionId });
      apiEvents.emit('search:all:completed', { query: searchParams.query, results: response.data.results?.length || 0, types: searchParams.types, duration: response.data.stats?.duration || 0 });

      return response.data;
    } catch (error) {
      console.error('[SearchAPI] searchAll error:', error);
      apiEvents.emit('search:all:error', { query: searchParams.query, error });
      throw error;
    }
  },

  /**
   * Advanced search with complex queries and filters
   */
  searchAdvanced: async (searchParams) => {
    try {
      if (import.meta.env.MODE === 'development') {
        return generateMockSearchData(searchParams);
      }

      const response = await retryWithBackoff(() =>
        api.post('/api/v1/search/advanced', {
          ...searchParams,
          userId: TokenManager.getUserInfo()?.id,
          organizationId: TokenManager.getTenantId(),
          timestamp: new Date().toISOString(),
          includeDebug: import.meta.env.MODE === 'development'
        })
      );

      validateResponse(response.data, ['results', 'queryAnalysis', 'suggestions']);
      apiEvents.emit('search:advanced:completed', { query: searchParams.query, filters: searchParams.filters, results: response.data.results?.length || 0, analysis: response.data.queryAnalysis });

      return response.data;
    } catch (error) {
      console.error('[SearchAPI] searchAdvanced error:', error);
      throw error;
    }
  },

  /**
   * Quick search for autocomplete and instant results
   */
  quickSearch: async (query, params = {}) => {
    try {
      if (import.meta.env.MODE === 'development') {
        return generateMockSearchData({ query, limit: params.limit || 10 });
      }

      const response = await retryWithBackoff(() =>
        api.get('/api/v1/search/quick', { params: { query, limit: params.limit || 10, types: params.types || ['assessments', 'questions'], organizationId: params.organizationId || TokenManager.getTenantId(), includeSuggestions: true, includeRecent: true, ...params } })
      );

      validateResponse(response.data, ['results', 'suggestions', 'recent']);
      if (query && query.length > 1) logSearchActivity({ query, type: 'quick', resultsCount: response.data.results?.length || 0, isAutocomplete: true });

      return response.data;
    } catch (error) {
      console.error('[SearchAPI] quickSearch error:', error);
      throw error;
    }
  },

  /**
   * Get autocomplete suggestions
   */
  getAutocompleteSuggestions: async (query, params = {}) => {
    try {
      const response = await retryWithBackoff(() =>
        api.get('/api/v1/search/autocomplete', { params: { query, limit: params.limit || 8, types: params.types || ['all'], organizationId: TokenManager.getTenantId(), includePopular: true, includeRecent: true, ...params } })
      );
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] getAutocompleteSuggestions error:', error);
      throw error;
    }
  },

  // ===================== TYPE-SPECIFIC SEARCH =====================

  searchAssessments: async (searchParams) => {
    try {
      if (!TokenManager.hasPermission('assessments:search') && !TokenManager.hasPermission('admin')) throw new Error('Unauthorized: Assessment search permission required');

      const response = await retryWithBackoff(() =>
        api.post('/api/v1/search/assessments', { ...searchParams, filters: { organizationId: TokenManager.getTenantId(), status: ['draft','published','archived'], ...searchParams.filters } })
      );

      validateResponse(response.data, ['assessments', 'pagination', 'facets']);
      apiEvents.emit('search:assessments:searched', { query: searchParams.query, filters: searchParams.filters, count: response.data.assessments?.length || 0 });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] searchAssessments error:', error);
      throw error;
    }
  },

  searchQuestions: async (searchParams) => {
    try {
      const response = await retryWithBackoff(() =>
        api.post('/api/v1/search/questions', { ...searchParams, filters: { organizationId: TokenManager.getTenantId(), status: 'active', ...searchParams.filters } })
      );

      validateResponse(response.data, ['questions', 'pagination', 'facets']);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] searchQuestions error:', error);
      throw error;
    }
  },

  searchTemplates: async (searchParams) => {
    try {
      const response = await retryWithBackoff(() =>
        api.post('/api/v1/search/templates', { ...searchParams, filters: { organizationId: TokenManager.getTenantId(), category: searchParams.category, difficulty: searchParams.difficulty, ...searchParams.filters } })
      );

      validateResponse(response.data, ['templates', 'pagination', 'categories']);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] searchTemplates error:', error);
      throw error;
    }
  },

  searchUsers: async (searchParams) => {
    try {
      if (!TokenManager.hasPermission('users:search') && !TokenManager.hasPermission('admin')) throw new Error('Unauthorized: User search permission required');

      const response = await retryWithBackoff(() =>
        api.post('/api/v1/search/users', { ...searchParams, filters: { organizationId: TokenManager.getTenantId(), status: 'active', ...searchParams.filters } })
      );

      validateResponse(response.data, ['users', 'pagination', 'roles']);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] searchUsers error:', error);
      throw error;
    }
  },

  searchOrganizations: async (searchParams) => {
    try {
      if (!TokenManager.hasPermission('super_admin')) throw new Error('Unauthorized: Super admin access required');

      const response = await retryWithBackoff(() => api.post('/api/v1/search/organizations', searchParams));
      validateResponse(response.data, ['organizations', 'pagination', 'stats']);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] searchOrganizations error:', error);
      throw error;
    }
  },

  searchContentLibrary: async (searchParams) => {
    try {
      const response = await retryWithBackoff(() =>
        api.post('/api/v1/search/content-library', { ...searchParams, filters: { organizationId: TokenManager.getTenantId(), type: searchParams.type || 'all', ...searchParams.filters } })
      );

      validateResponse(response.data, ['content', 'pagination', 'types']);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] searchContentLibrary error:', error);
      throw error;
    }
  },

  // ===================== UTILITY FUNCTIONS =====================

  initialize: async () => {
    try {
      const health = await searchApi.checkSearchHealth();
      const filters = await searchApi.getSearchFilters('all');
      const userId = TokenManager.getUserInfo()?.id;
      const recentSearches = userId ? await searchApi.getRecentSearches(userId, { limit: 5 }) : { recent: [] };

      apiEvents.emit('search:initialized', { healthy: health.status === 'healthy', searchTypes: filters.types || [], recentSearches: recentSearches.recent?.length || 0, timestamp: new Date().toISOString() });

      return { success: true, healthy: health.status === 'healthy', searchTypes: filters.types || [], recentSearches: recentSearches.recent || [], performance: health.performance };
    } catch (error) {
      console.error('[SearchAPI] initialize error:', error);
      return { success: false, error: error.message, healthy: false };
    }
  },

  on: (event, callback) => apiEvents.on(`search:${event}`, callback),
  off: (event, callback) => apiEvents.off(`search:${event}`, callback),
  getSearchTypes: () => [
    { value: 'all', label: 'All', icon: 'search', description: 'Search across all content types' },
    { value: 'assessments', label: 'Assessments', icon: 'clipboard-check', description: 'Search assessments and tests' },
    { value: 'questions', label: 'Questions', icon: 'help-circle', description: 'Search question library' },
    { value: 'templates', label: 'Templates', icon: 'copy', description: 'Search assessment templates' },
    { value: 'users', label: 'Users', icon: 'users', description: 'Search team members and candidates' },
    { value: 'organizations', label: 'Organizations', icon: 'building', description: 'Search organizations (Admin only)' },
    { value: 'content', label: 'Content Library', icon: 'folder', description: 'Search files and media' }
  ]
};

// ===================== HELPER FUNCTIONS =====================

async function logSearchActivity(activityData) {
  try {
    await retryWithBackoff(() =>
      api.post('/api/v1/search/analytics/log', { ...activityData, userId: TokenManager.getUserInfo()?.id, organizationId: TokenManager.getTenantId(), timestamp: new Date().toISOString(), userAgent: navigator.userAgent })
    );
  } catch (error) {
    console.warn('[SearchAPI] Failed to log search activity:', error);
  }
}

function generateSessionId() {
  return `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateShareToken() {
  return `share_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function generateMockSearchData(params) {
  const results = Array.from({ length: params.limit || 10 }).map((_, i) => ({
    id: `mock_${i + 1}`,
    type: params.types?.[0] || 'assessment',
    title: `Mock result ${i + 1} for "${params.query}"`,
    score: Math.random() * 100,
    createdAt: new Date(Date.now() - i * 3600 * 1000).toISOString()
  }));

  return {
    results,
    pagination: { page: params.page || 1, limit: params.limit || 10, total: 50 },
    facets: [],
    stats: { duration: Math.random() * 100 }
  };
}

export default searchApi;
