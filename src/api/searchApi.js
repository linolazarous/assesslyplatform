// src/api/searchApi.js
import { api, retryWithBackoff, validateResponse, API_ENDPOINTS, apiEvents, TokenManager } from './index';

/**
 * Search API Service for Assessly Platform
 * Unified search across assessments, questions, templates, users, and content
 * Advanced search capabilities with AI-powered suggestions and analytics
 */

const searchApi = {
  // ===================== UNIFIED SEARCH =====================
  
  /**
   * Unified search across all content types
   * @param {Object} searchParams - Search parameters
   * @param {string} searchParams.query - Search query
   * @param {Array<string>} searchParams.types - Content types to search
   * @param {number} searchParams.page - Page number
   * @param {number} searchParams.limit - Results per page
   * @param {Object} searchParams.filters - Advanced filters
   * @param {string} searchParams.sortBy - Sort field
   * @param {string} searchParams.sortOrder - Sort order (asc/desc)
   * @param {string} searchParams.organizationId - Organization context
   * @returns {Promise<Object>} Unified search results
   */
  searchAll: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/all', {
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
      });
      
      validateResponse(response.data, ['results', 'pagination', 'facets', 'stats']);
      
      // Log search activity
      logSearchActivity({
        query: searchParams.query,
        types: searchParams.types,
        resultsCount: response.data.results?.length || 0,
        sessionId: response.config.data?.sessionId
      });
      
      // Emit search completed event
      apiEvents.emit('search:completed', {
        query: searchParams.query,
        results: response.data.results?.length || 0,
        types: searchParams.types,
        duration: response.data.stats?.duration || 0
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search all error:', error);
      apiEvents.emit('search:error', { query: searchParams.query, error });
      throw error;
    }
  },
  
  /**
   * Advanced search with complex queries and filters
   * @param {Object} searchParams - Advanced search parameters
   * @returns {Promise<Object>} Advanced search results
   */
  searchAdvanced: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/advanced', {
        ...searchParams,
        userId: TokenManager.getUserInfo()?.id,
        organizationId: TokenManager.getTenantId(),
        timestamp: new Date().toISOString(),
        includeDebug: process.env.NODE_ENV === 'development'
      });
      
      validateResponse(response.data, ['results', 'queryAnalysis', 'suggestions']);
      
      apiEvents.emit('search:advanced_completed', {
        query: searchParams.query,
        filters: searchParams.filters,
        results: response.data.results?.length || 0,
        analysis: response.data.queryAnalysis
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search advanced error:', error);
      throw error;
    }
  },
  
  /**
   * Quick search for autocomplete and instant results
   * @param {string} query - Search query
   * @param {Object} params - Quick search parameters
   * @returns {Promise<Object>} Quick search results
   */
  quickSearch: async (query, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/quick', {
        params: {
          query,
          limit: params.limit || 10,
          types: params.types || ['assessments', 'questions'],
          organizationId: params.organizationId || TokenManager.getTenantId(),
          includeSuggestions: true,
          includeRecent: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['results', 'suggestions', 'recent']);
      
      // Log quick search for analytics
      if (query && query.length > 1) {
        logSearchActivity({
          query,
          type: 'quick',
          resultsCount: response.data.results?.length || 0,
          isAutocomplete: true
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Quick search error:', error);
      throw error;
    }
  },
  
  /**
   * Get autocomplete suggestions for search
   * @param {string} query - Partial search query
   * @param {Object} params - Autocomplete parameters
   * @returns {Promise<Object>} Autocomplete suggestions
   */
  getAutocompleteSuggestions: async (query, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/autocomplete', {
        params: {
          query,
          limit: params.limit || 8,
          types: params.types || ['all'],
          organizationId: TokenManager.getTenantId(),
          includePopular: params.includePopular || true,
          includeRecent: params.includeRecent || true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get autocomplete suggestions error:', error);
      throw error;
    }
  },
  
  // ===================== TYPE-SPECIFIC SEARCH =====================
  
  /**
   * Search assessments with advanced filtering
   * @param {Object} searchParams - Assessment search parameters
   * @returns {Promise<Object>} Assessment search results
   */
  searchAssessments: async (searchParams) => {
    try {
      // Check assessment search permissions
      if (!TokenManager.hasPermission('assessments:search') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Assessment search permission required');
      }
      
      const response = await api.post('/api/v1/search/assessments', {
        ...searchParams,
        filters: {
          organizationId: TokenManager.getTenantId(),
          status: ['draft', 'published', 'archived'],
          ...searchParams.filters
        }
      });
      
      validateResponse(response.data, ['assessments', 'pagination', 'facets']);
      
      apiEvents.emit('search:assessments_searched', {
        query: searchParams.query,
        filters: searchParams.filters,
        count: response.data.assessments?.length || 0
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search assessments error:', error);
      throw error;
    }
  },
  
  /**
   * Search questions with filtering
   * @param {Object} searchParams - Question search parameters
   * @returns {Promise<Object>} Question search results
   */
  searchQuestions: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/questions', {
        ...searchParams,
        filters: {
          organizationId: TokenManager.getTenantId(),
          status: 'active',
          ...searchParams.filters
        }
      });
      
      validateResponse(response.data, ['questions', 'pagination', 'facets']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search questions error:', error);
      throw error;
    }
  },
  
  /**
   * Search assessment templates
   * @param {Object} searchParams - Template search parameters
   * @returns {Promise<Object>} Template search results
   */
  searchTemplates: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/templates', {
        ...searchParams,
        filters: {
          organizationId: TokenManager.getTenantId(),
          category: searchParams.category,
          difficulty: searchParams.difficulty,
          ...searchParams.filters
        }
      });
      
      validateResponse(response.data, ['templates', 'pagination', 'categories']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search templates error:', error);
      throw error;
    }
  },
  
  /**
   * Search users within organization
   * @param {Object} searchParams - User search parameters
   * @returns {Promise<Object>} User search results
   */
  searchUsers: async (searchParams) => {
    try {
      // Check user search permissions
      if (!TokenManager.hasPermission('users:search') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: User search permission required');
      }
      
      const response = await api.post('/api/v1/search/users', {
        ...searchParams,
        filters: {
          organizationId: TokenManager.getTenantId(),
          status: 'active',
          ...searchParams.filters
        }
      });
      
      validateResponse(response.data, ['users', 'pagination', 'roles']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search users error:', error);
      throw error;
    }
  },
  
  /**
   * Search organizations (admin only)
   * @param {Object} searchParams - Organization search parameters
   * @returns {Promise<Object>} Organization search results
   */
  searchOrganizations: async (searchParams) => {
    try {
      // Only super admins can search organizations
      if (!TokenManager.hasPermission('super_admin')) {
        throw new Error('Unauthorized: Super admin access required');
      }
      
      const response = await api.post('/api/v1/search/organizations', searchParams);
      
      validateResponse(response.data, ['organizations', 'pagination', 'stats']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search organizations error:', error);
      throw error;
    }
  },
  
  /**
   * Search content library (questions, media, etc.)
   * @param {Object} searchParams - Content search parameters
   * @returns {Promise<Object>} Content search results
   */
  searchContentLibrary: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/content-library', {
        ...searchParams,
        filters: {
          organizationId: TokenManager.getTenantId(),
          type: searchParams.type || 'all',
          ...searchParams.filters
        }
      });
      
      validateResponse(response.data, ['content', 'pagination', 'types']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search content library error:', error);
      throw error;
    }
  },
  
  /**
   * Search by tags
   * @param {Array<string>} tags - Tags to search
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Tag-based search results
   */
  searchByTags: async (tags, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/by-tags', {
        params: {
          tags: Array.isArray(tags) ? tags.join(',') : tags,
          types: params.types || 'all',
          organizationId: TokenManager.getTenantId(),
          limit: params.limit || 20,
          ...params
        }
      });
      
      validateResponse(response.data, ['results', 'tags', 'pagination']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search by tags error:', error);
      throw error;
    }
  },
  
  /**
   * Search by date range
   * @param {string} startDate - Start date (ISO)
   * @param {string} endDate - End date (ISO)
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Date-based search results
   */
  searchByDateRange: async (startDate, endDate, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/by-date', {
        params: {
          startDate,
          endDate,
          types: params.types || 'all',
          organizationId: TokenManager.getTenantId(),
          ...params
        }
      });
      
      validateResponse(response.data, ['results', 'dateRange', 'pagination']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search by date range error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH FILTERS & FACETS =====================
  
  /**
   * Get available search filters for content type
   * @param {string} searchType - Content type
   * @returns {Promise<Object>} Available filters
   */
  getSearchFilters: async (searchType = 'all') => {
    try {
      const response = await api.get(`/api/v1/search/filters/${searchType}`, {
        params: {
          organizationId: TokenManager.getTenantId(),
          includeDynamic: true
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search filters error:', error);
      throw error;
    }
  },
  
  /**
   * Get search facets for drill-down navigation
   * @param {Object} searchParams - Search parameters for faceting
   * @returns {Promise<Object>} Search facets
   */
  getSearchFacets: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/facets', {
        ...searchParams,
        organizationId: TokenManager.getTenantId(),
        includeCounts: true,
        includeHierarchy: true
      });
      
      validateResponse(response.data, ['facets', 'counts', 'hierarchy']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search facets error:', error);
      throw error;
    }
  },
  
  /**
   * Get recent search terms for user
   * @param {string} userId - User ID
   * @param {Object} params - Recent searches parameters
   * @returns {Promise<Object>} Recent searches
   */
  getRecentSearches: async (userId, params = {}) => {
    try {
      const response = await api.get(`/api/v1/search/recent/${userId}`, {
        params: {
          limit: params.limit || 10,
          types: params.types || 'all',
          organizationId: TokenManager.getTenantId(),
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get recent searches error:', error);
      throw error;
    }
  },
  
  /**
   * Clear user search history
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Clear confirmation
   */
  clearSearchHistory: async (userId) => {
    try {
      const response = await api.delete(`/api/v1/search/history/${userId}`, {
        data: {
          clearedBy: TokenManager.getUserInfo()?.id,
          clearedAt: new Date().toISOString()
        }
      });
      
      apiEvents.emit('search:history_cleared', { userId });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Clear search history error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH ANALYTICS =====================
  
  /**
   * Get search analytics and insights
   * @param {Object} params - Analytics parameters
   * @returns {Promise<Object>} Search analytics
   */
  getSearchAnalytics: async (params = {}) => {
    try {
      if (!TokenManager.hasPermission('search:analytics') && 
          !TokenManager.hasPermission('admin')) {
        throw new Error('Unauthorized: Search analytics permission required');
      }
      
      const response = await api.get('/api/v1/search/analytics', {
        params: {
          startDate: params.startDate,
          endDate: params.endDate,
          organizationId: params.organizationId || TokenManager.getTenantId(),
          includeTrends: true,
          includeTopQueries: true,
          includeConversion: true,
          ...params
        }
      });
      
      validateResponse(response.data, ['metrics', 'trends', 'topQueries', 'conversion']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search analytics error:', error);
      throw error;
    }
  },
  
  /**
   * Get popular searches
   * @param {Object} params - Popular searches parameters
   * @returns {Promise<Object>} Popular search queries
   */
  getPopularSearches: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/popular', {
        params: {
          period: params.period || 'week',
          organizationId: params.organizationId || TokenManager.getTenantId(),
          limit: params.limit || 20,
          includeTrending: true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get popular searches error:', error);
      throw error;
    }
  },
  
  /**
   * Get search statistics
   * @param {Object} params - Statistics parameters
   * @returns {Promise<Object>} Search statistics
   */
  getSearchStatistics: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/statistics', {
        params: {
          organizationId: params.organizationId || TokenManager.getTenantId(),
          includePerformance: true,
          includeErrors: true,
          includeUsage: true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search statistics error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH ENHANCEMENTS =====================
  
  /**
   * Get search suggestions and alternatives
   * @param {string} query - Search query
   * @param {Object} params - Suggestion parameters
   * @returns {Promise<Object>} Search suggestions
   */
  getSearchSuggestions: async (query, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/suggestions', {
        params: {
          query,
          organizationId: TokenManager.getTenantId(),
          includeSynonyms: true,
          includeAlternatives: true,
          includeCorrections: true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search suggestions error:', error);
      throw error;
    }
  },
  
  /**
   * Get search synonyms for query expansion
   * @param {string} term - Search term
   * @returns {Promise<Object>} Synonyms for term
   */
  getSearchSynonyms: async (term) => {
    try {
      const response = await api.get(`/api/v1/search/synonyms/${encodeURIComponent(term)}`, {
        params: {
          organizationId: TokenManager.getTenantId(),
          includeRelated: true
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search synonyms error:', error);
      throw error;
    }
  },
  
  /**
   * Get related searches
   * @param {string} query - Original query
   * @param {Object} params - Related searches parameters
   * @returns {Promise<Object>} Related search queries
   */
  getRelatedSearches: async (query, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/related', {
        params: {
          query,
          organizationId: TokenManager.getTenantId(),
          limit: params.limit || 8,
          includeCoOccurrence: true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get related searches error:', error);
      throw error;
    }
  },
  
  /**
   * Get search query corrections
   * @param {string} query - Potentially misspelled query
   * @returns {Promise<Object>} Corrected query suggestions
   */
  getSearchCorrections: async (query) => {
    try {
      const response = await api.get(`/api/v1/search/corrections/${encodeURIComponent(query)}`, {
        params: {
          organizationId: TokenManager.getTenantId(),
          includeConfidence: true
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search corrections error:', error);
      throw error;
    }
  },
  
  // ===================== SAVED SEARCHES & BOOKMARKS =====================
  
  /**
   * Save search query for later use
   * @param {Object} saveData - Save search data
   * @returns {Promise<Object>} Saved search
   */
  saveSearch: async (saveData) => {
    try {
      const response = await api.post('/api/v1/search/saved/save', {
        ...saveData,
        userId: TokenManager.getUserInfo()?.id,
        organizationId: TokenManager.getTenantId(),
        createdAt: new Date().toISOString()
      });
      
      apiEvents.emit('search:saved', {
        query: saveData.query,
        filters: saveData.filters,
        searchId: response.data.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Save search error:', error);
      throw error;
    }
  },
  
  /**
   * Get user's saved searches
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Saved searches
   */
  getSavedSearches: async (userId) => {
    try {
      const response = await api.get(`/api/v1/search/saved/${userId}`, {
        params: {
          organizationId: TokenManager.getTenantId(),
          includeResultsCount: true
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get saved searches error:', error);
      throw error;
    }
  },
  
  /**
   * Execute a saved search
   * @param {string} searchId - Saved search ID
   * @param {Object} params - Execution parameters
   * @returns {Promise<Object>} Search results
   */
  executeSavedSearch: async (searchId, params = {}) => {
    try {
      const response = await api.post(`/api/v1/search/saved/${searchId}/execute`, {
        ...params,
        userId: TokenManager.getUserInfo()?.id,
        executedAt: new Date().toISOString()
      });
      
      apiEvents.emit('search:saved_executed', {
        searchId,
        results: response.data.results?.length || 0
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Execute saved search error:', error);
      throw error;
    }
  },
  
  /**
   * Bookmark a search result
   * @param {Object} bookmarkData - Bookmark data
   * @returns {Promise<Object>} Bookmark confirmation
   */
  bookmarkResult: async (bookmarkData) => {
    try {
      const response = await api.post('/api/v1/search/bookmarks/add', {
        ...bookmarkData,
        userId: TokenManager.getUserInfo()?.id,
        organizationId: TokenManager.getTenantId(),
        bookmarkedAt: new Date().toISOString()
      });
      
      apiEvents.emit('search:bookmark_added', {
        resultId: bookmarkData.resultId,
        resultType: bookmarkData.resultType,
        bookmarkId: response.data.id
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Bookmark result error:', error);
      throw error;
    }
  },
  
  // ===================== EXPORT & SHARING =====================
  
  /**
   * Export search results
   * @param {Object} exportConfig - Export configuration
   * @returns {Promise<Object>} Export data
   */
  exportSearchResults: async (exportConfig) => {
    try {
      const response = await api.post('/api/v1/search/export', exportConfig, {
        responseType: 'blob'
      });
      
      const contentType = response.headers['content-type'];
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
                     `search_results_${new Date().toISOString().split('T')[0]}.${exportConfig.format || 'csv'}`;
      
      return {
        blob: response.data,
        filename,
        contentType,
        size: response.data.size,
        url: URL.createObjectURL(response.data)
      };
    } catch (error) {
      console.error('[SearchAPI] Export search results error:', error);
      throw error;
    }
  },
  
  /**
   * Share search results
   * @param {Object} shareData - Share data
   * @returns {Promise<Object>} Share confirmation
   */
  shareSearchResults: async (shareData) => {
    try {
      const response = await api.post('/api/v1/search/share', {
        ...shareData,
        sharedBy: TokenManager.getUserInfo()?.id,
        organizationId: TokenManager.getTenantId(),
        sharedAt: new Date().toISOString(),
        shareToken: generateShareToken()
      });
      
      apiEvents.emit('search:shared', {
        query: shareData.query,
        recipients: shareData.recipients?.length || 0,
        shareId: response.data.shareId
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Share search results error:', error);
      throw error;
    }
  },
  
  // ===================== UTILITY FUNCTIONS =====================
  
  /**
   * Get search preview (limited results)
   * @param {string} query - Search query
   * @param {Object} params - Preview parameters
   * @returns {Promise<Object>} Preview results
   */
  getSearchPreview: async (query, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/preview', {
        params: {
          query,
          limit: params.limit || 5,
          types: params.types || ['assessments', 'questions'],
          organizationId: TokenManager.getTenantId(),
          includeQuickResults: true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search preview error:', error);
      throw error;
    }
  },
  
  /**
   * Check search service health
   * @returns {Promise<Object>} Search health status
   */
  checkSearchHealth: async () => {
    try {
      const response = await api.get('/api/v1/search/health');
      validateResponse(response.data, ['status', 'services', 'performance']);
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Check search health error:', error);
      throw error;
    }
  },
  
  /**
   * Get search performance metrics
   * @param {Object} params - Performance parameters
   * @returns {Promise<Object>} Performance metrics
   */
  getSearchPerformance: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/performance', {
        params: {
          organizationId: params.organizationId || TokenManager.getTenantId(),
          includeQueryTimes: true,
          includeCacheMetrics: true,
          includeIndexMetrics: true,
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search performance error:', error);
      throw error;
    }
  },
  
  /**
   * Get available search types
   * @returns {Array<Object>} Search type options
   */
  getSearchTypes: () => {
    return [
      { value: 'all', label: 'All', icon: 'search', description: 'Search across all content types' },
      { value: 'assessments', label: 'Assessments', icon: 'clipboard-check', description: 'Search assessments and tests' },
      { value: 'questions', label: 'Questions', icon: 'help-circle', description: 'Search question library' },
      { value: 'templates', label: 'Templates', icon: 'copy', description: 'Search assessment templates' },
      { value: 'users', label: 'Users', icon: 'users', description: 'Search team members and candidates' },
      { value: 'organizations', label: 'Organizations', icon: 'building', description: 'Search organizations (Admin only)' },
      { value: 'content', label: 'Content Library', icon: 'folder', description: 'Search files and media' }
    ];
  },
  
  /**
   * Get filter operators for advanced search
   * @returns {Array<Object>} Filter operators
   */
  getFilterOperators: () => {
    return [
      { value: 'equals', label: 'Equals', symbol: '=' },
      { value: 'not_equals', label: 'Not Equals', symbol: '≠' },
      { value: 'contains', label: 'Contains', symbol: '⊃' },
      { value: 'not_contains', label: 'Not Contains', symbol: '⊅' },
      { value: 'starts_with', label: 'Starts With', symbol: '^' },
      { value: 'ends_with', label: 'Ends With', symbol: '$' },
      { value: 'greater_than', label: 'Greater Than', symbol: '>' },
      { value: 'less_than', label: 'Less Than', symbol: '<' },
      { value: 'between', label: 'Between', symbol: '↔' },
      { value: 'in', label: 'In List', symbol: '∈' },
      { value: 'not_in', label: 'Not In List', symbol: '∉' },
      { value: 'exists', label: 'Exists', symbol: '∃' },
      { value: 'not_exists', label: 'Not Exists', symbol: '∄' }
    ];
  },
  
  /**
   * Subscribe to search events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on: (event, callback) => {
    apiEvents.on(`search:${event}`, callback);
  },
  
  /**
   * Unsubscribe from search events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off: (event, callback) => {
    apiEvents.off(`search:${event}`, callback);
  },
  
  /**
   * Initialize search module
   * @returns {Promise<Object>} Initialization status
   */
  initialize: async () => {
    try {
      // Check search health
      const health = await searchApi.checkSearchHealth();
      
      // Load available search types and filters
      const filters = await searchApi.getSearchFilters('all');
      
      // Get recent searches for current user
      const userId = TokenManager.getUserInfo()?.id;
      const recentSearches = userId ? await searchApi.getRecentSearches(userId, { limit: 5 }) : { recent: [] };
      
      apiEvents.emit('search:initialized', {
        healthy: health.status === 'healthy',
        searchTypes: filters.types || [],
        recentSearches: recentSearches.recent?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        healthy: health.status === 'healthy',
        searchTypes: filters.types || [],
        recentSearches: recentSearches.recent || [],
        performance: health.performance
      };
    } catch (error) {
      console.error('[SearchAPI] Initialize error:', error);
      return {
        success: false,
        error: error.message,
        healthy: false
      };
    }
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Log search activity for analytics
 */
async function logSearchActivity(activityData) {
  try {
    await api.post('/api/v1/search/analytics/log', {
      ...activityData,
      userId: TokenManager.getUserInfo()?.id,
      organizationId: TokenManager.getTenantId(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  } catch (error) {
    console.warn('[SearchAPI] Failed to log search activity:', error);
  }
}

/**
 * Generate unique session ID for search tracking
 */
function generateSessionId() {
  return `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate share token for search results
 */
function generateShareToken() {
  return `share_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export default searchApi;
