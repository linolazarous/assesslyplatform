// src/api/searchApi.js
import api from './axiosConfig';

/**
 * Search API Service
 * Handles unified search across assessments, questions, templates, users, and content
 */
const searchApi = {
  // ===================== UNIFIED SEARCH =====================
  
  /**
   * Search across all content types
   */
  searchAll: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/all', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search all error:', error);
      throw error;
    }
  },
  
  /**
   * Search with advanced filters
   */
  searchAdvanced: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/advanced', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search advanced error:', error);
      throw error;
    }
  },
  
  /**
   * Quick search (autocomplete)
   */
  quickSearch: async (query, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/quick', {
        params: { query, ...params },
      });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Quick search error:', error);
      throw error;
    }
  },
  
  // ===================== TYPE-SPECIFIC SEARCH =====================
  
  /**
   * Search assessments
   */
  searchAssessments: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/assessments', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search assessments error:', error);
      throw error;
    }
  },
  
  /**
   * Search questions
   */
  searchQuestions: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/questions', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search questions error:', error);
      throw error;
    }
  },
  
  /**
   * Search templates
   */
  searchTemplates: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/templates', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search templates error:', error);
      throw error;
    }
  },
  
  /**
   * Search users
   */
  searchUsers: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/users', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search users error:', error);
      throw error;
    }
  },
  
  /**
   * Search organizations
   */
  searchOrganizations: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/organizations', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search organizations error:', error);
      throw error;
    }
  },
  
  /**
   * Search responses
   */
  searchResponses: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/responses', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search responses error:', error);
      throw error;
    }
  },

  /**
   * Search content library
   */
  searchContentLibrary: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/content-library', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search content library error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH FILTERS & FACETS =====================
  
  /**
   * Get search filters
   */
  getSearchFilters: async (searchType = 'all') => {
    try {
      const response = await api.get(`/api/v1/search/filters/${searchType}`);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search filters error:', error);
      throw error;
    }
  },
  
  /**
   * Get search facets
   */
  getSearchFacets: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/facets', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search facets error:', error);
      throw error;
    }
  },
  
  /**
   * Get recent search terms
   */
  getRecentSearches: async (userId, limit = 10) => {
    try {
      const response = await api.get(`/api/v1/search/recent/${userId}`, { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get recent searches error:', error);
      throw error;
    }
  },
  
  /**
   * Clear search history
   */
  clearSearchHistory: async (userId) => {
    try {
      const response = await api.delete(`/api/v1/search/history/${userId}`);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Clear search history error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH ANALYTICS =====================
  
  /**
   * Log search activity
   */
  logSearchActivity: async (activityData) => {
    try {
      const response = await api.post('/api/v1/search/analytics/log', activityData);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Log search activity error:', error);
      throw error;
    }
  },
  
  /**
   * Get search analytics
   */
  getSearchAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search analytics error:', error);
      throw error;
    }
  },
  
  /**
   * Get popular searches
   */
  getPopularSearches: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/popular', { params });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get popular searches error:', error);
      throw error;
    }
  },
  
  /**
   * Get search trends
   */
  getSearchTrends: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/trends', { params });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search trends error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH ENHANCEMENTS =====================
  
  /**
   * Get search suggestions
   */
  getSearchSuggestions: async (query, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/suggestions', {
        params: { query, ...params },
      });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search suggestions error:', error);
      throw error;
    }
  },
  
  /**
   * Get search synonyms
   */
  getSearchSynonyms: async (term) => {
    try {
      const response = await api.get(`/api/v1/search/synonyms/${term}`);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search synonyms error:', error);
      throw error;
    }
  },
  
  /**
   * Get related searches
   */
  getRelatedSearches: async (query, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/related', {
        params: { query, ...params },
      });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get related searches error:', error);
      throw error;
    }
  },
  
  /**
   * Get search corrections
   */
  getSearchCorrections: async (query) => {
    try {
      const response = await api.get(`/api/v1/search/corrections/${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search corrections error:', error);
      throw error;
    }
  },
  
  // ===================== SAVED SEARCHES =====================
  
  /**
   * Save search query
   */
  saveSearch: async (saveData) => {
    try {
      const response = await api.post('/api/v1/search/saved/save', saveData);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Save search error:', error);
      throw error;
    }
  },
  
  /**
   * Get saved searches
   */
  getSavedSearches: async (userId) => {
    try {
      const response = await api.get(`/api/v1/search/saved/${userId}`);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get saved searches error:', error);
      throw error;
    }
  },
  
  /**
   * Update saved search
   */
  updateSavedSearch: async (searchId, updates) => {
    try {
      const response = await api.put(`/api/v1/search/saved/${searchId}`, updates);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Update saved search error:', error);
      throw error;
    }
  },
  
  /**
   * Delete saved search
   */
  deleteSavedSearch: async (searchId) => {
    try {
      const response = await api.delete(`/api/v1/search/saved/${searchId}`);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Delete saved search error:', error);
      throw error;
    }
  },
  
  /**
   * Execute saved search
   */
  executeSavedSearch: async (searchId, params = {}) => {
    try {
      const response = await api.post(`/api/v1/search/saved/${searchId}/execute`, params);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Execute saved search error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH BOOKMARKS =====================
  
  /**
   * Bookmark search result
   */
  bookmarkResult: async (bookmarkData) => {
    try {
      const response = await api.post('/api/v1/search/bookmarks/add', bookmarkData);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Bookmark result error:', error);
      throw error;
    }
  },
  
  /**
   * Get bookmarked results
   */
  getBookmarks: async (userId, params = {}) => {
    try {
      const response = await api.get(`/api/v1/search/bookmarks/${userId}`, { params });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get bookmarks error:', error);
      throw error;
    }
  },
  
  /**
   * Remove bookmark
   */
  removeBookmark: async (bookmarkId) => {
    try {
      const response = await api.delete(`/api/v1/search/bookmarks/${bookmarkId}`);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Remove bookmark error:', error);
      throw error;
    }
  },
  
  /**
   * Update bookmark
   */
  updateBookmark: async (bookmarkId, updates) => {
    try {
      const response = await api.put(`/api/v1/search/bookmarks/${bookmarkId}`, updates);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Update bookmark error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH EXPORT & SHARE =====================
  
  /**
   * Export search results
   */
  exportSearchResults: async (exportConfig) => {
    try {
      const response = await api.download('/api/v1/search/export', exportConfig, 'search_results.xlsx');
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Export search results error:', error);
      throw error;
    }
  },
  
  /**
   * Share search results
   */
  shareSearchResults: async (shareData) => {
    try {
      const response = await api.post('/api/v1/search/share', shareData);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Share search results error:', error);
      throw error;
    }
  },
  
  /**
   * Generate search report
   */
  generateSearchReport: async (reportData) => {
    try {
      const response = await api.post('/api/v1/search/reports/generate', reportData);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Generate search report error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH INDEXING =====================
  
  /**
   * Index content for search
   */
  indexContent: async (indexData) => {
    try {
      const response = await api.post('/api/v1/search/index', indexData);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Index content error:', error);
      throw error;
    }
  },
  
  /**
   * Reindex content
   */
  reindexContent: async (contentType, contentId) => {
    try {
      const response = await api.post(`/api/v1/search/reindex/${contentType}/${contentId}`);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Reindex content error:', error);
      throw error;
    }
  },
  
  /**
   * Remove from index
   */
  removeFromIndex: async (contentType, contentId) => {
    try {
      const response = await api.delete(`/api/v1/search/index/${contentType}/${contentId}`);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Remove from index error:', error);
      throw error;
    }
  },
  
  /**
   * Get index status
   */
  getIndexStatus: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/index/status', { params });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get index status error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH CONFIGURATION =====================
  
  /**
   * Get search configuration
   */
  getSearchConfig: async () => {
    try {
      const response = await api.get('/api/v1/search/config');
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search config error:', error);
      throw error;
    }
  },
  
  /**
   * Update search configuration
   */
  updateSearchConfig: async (configUpdates) => {
    try {
      const response = await api.put('/api/v1/search/config', configUpdates);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Update search config error:', error);
      throw error;
    }
  },
  
  /**
   * Get search ranking factors
   */
  getSearchRanking: async () => {
    try {
      const response = await api.get('/api/v1/search/ranking');
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search ranking error:', error);
      throw error;
    }
  },
  
  /**
   * Update search ranking
   */
  updateSearchRanking: async (rankingUpdates) => {
    try {
      const response = await api.put('/api/v1/search/ranking', rankingUpdates);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Update search ranking error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH HEALTH & METRICS =====================
  
  /**
   * Check search service health
   */
  checkSearchHealth: async () => {
    try {
      const response = await api.get('/api/v1/search/health');
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Check search health error:', error);
      throw error;
    }
  },
  
  /**
   * Get search performance metrics
   */
  getSearchPerformance: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/performance', { params });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search performance error:', error);
      throw error;
    }
  },
  
  /**
   * Get search error logs
   */
  getSearchErrorLogs: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/errors', { params });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search error logs error:', error);
      throw error;
    }
  },
  
  /**
   * Clear search cache
   */
  clearSearchCache: async () => {
    try {
      const response = await api.delete('/api/v1/search/cache');
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Clear search cache error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH INTEGRATIONS =====================
  
  /**
   * Search with external sources
   */
  searchExternal: async (searchParams) => {
    try {
      const response = await api.post('/api/v1/search/external', searchParams);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search external error:', error);
      throw error;
    }
  },
  
  /**
   * Get search integrations
   */
  getSearchIntegrations: async () => {
    try {
      const response = await api.get('/api/v1/search/integrations');
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search integrations error:', error);
      throw error;
    }
  },
  
  /**
   * Configure search integration
   */
  configureSearchIntegration: async (integrationConfig) => {
    try {
      const response = await api.post('/api/v1/search/integrations/configure', integrationConfig);
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Configure search integration error:', error);
      throw error;
    }
  },

  // ===================== NEW FUNCTIONS =====================

  /**
   * Get search statistics
   */
  getSearchStatistics: async (params = {}) => {
    try {
      const response = await api.get('/api/v1/search/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search statistics error:', error);
      throw error;
    }
  },

  /**
   * Get search autocomplete suggestions
   */
  getAutocompleteSuggestions: async (query, limit = 10) => {
    try {
      const response = await api.get('/api/v1/search/autocomplete', {
        params: { query, limit }
      });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get autocomplete suggestions error:', error);
      throw error;
    }
  },

  /**
   * Get search by tags
   */
  searchByTags: async (tags, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/by-tags', {
        params: { tags: Array.isArray(tags) ? tags.join(',') : tags, ...params }
      });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search by tags error:', error);
      throw error;
    }
  },

  /**
   * Get search by date range
   */
  searchByDateRange: async (startDate, endDate, params = {}) => {
    try {
      const response = await api.get('/api/v1/search/by-date', {
        params: { startDate, endDate, ...params }
      });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Search by date range error:', error);
      throw error;
    }
  },

  /**
   * Get search preview (limited results for preview)
   */
  getSearchPreview: async (query, limit = 5) => {
    try {
      const response = await api.get('/api/v1/search/preview', {
        params: { query, limit }
      });
      return response.data;
    } catch (error) {
      console.error('[SearchAPI] Get search preview error:', error);
      throw error;
    }
  },
};

export default searchApi;
