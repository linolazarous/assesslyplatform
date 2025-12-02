// src/api/searchApi.js
import api from './api';

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
      const response = await api.post('/search/all', searchParams);
      return response.data;
    } catch (error) {
      console.error('Search all error:', error);
      throw error;
    }
  },
  
  /**
   * Search with advanced filters
   */
  searchAdvanced: async (searchParams) => {
    try {
      const response = await api.post('/search/advanced', searchParams);
      return response.data;
    } catch (error) {
      console.error('Search advanced error:', error);
      throw error;
    }
  },
  
  /**
   * Quick search (autocomplete)
   */
  quickSearch: async (query, params = {}) => {
    try {
      const response = await api.get('/search/quick', {
        params: { query, ...params },
      });
      return response.data;
    } catch (error) {
      console.error('Quick search error:', error);
      throw error;
    }
  },
  
  // ===================== TYPE-SPECIFIC SEARCH =====================
  
  /**
   * Search assessments
   */
  searchAssessments: async (searchParams) => {
    try {
      const response = await api.post('/search/assessments', searchParams);
      return response.data;
    } catch (error) {
      console.error('Search assessments error:', error);
      throw error;
    }
  },
  
  /**
   * Search questions
   */
  searchQuestions: async (searchParams) => {
    try {
      const response = await api.post('/search/questions', searchParams);
      return response.data;
    } catch (error) {
      console.error('Search questions error:', error);
      throw error;
    }
  },
  
  /**
   * Search templates
   */
  searchTemplates: async (searchParams) => {
    try {
      const response = await api.post('/search/templates', searchParams);
      return response.data;
    } catch (error) {
      console.error('Search templates error:', error);
      throw error;
    }
  },
  
  /**
   * Search users
   */
  searchUsers: async (searchParams) => {
    try {
      const response = await api.post('/search/users', searchParams);
      return response.data;
    } catch (error) {
      console.error('Search users error:', error);
      throw error;
    }
  },
  
  /**
   * Search organizations
   */
  searchOrganizations: async (searchParams) => {
    try {
      const response = await api.post('/search/organizations', searchParams);
      return response.data;
    } catch (error) {
      console.error('Search organizations error:', error);
      throw error;
    }
  },
  
  /**
   * Search responses
   */
  searchResponses: async (searchParams) => {
    try {
      const response = await api.post('/search/responses', searchParams);
      return response.data;
    } catch (error) {
      console.error('Search responses error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH FILTERS & FACETS =====================
  
  /**
   * Get search filters
   */
  getSearchFilters: async (searchType = 'all') => {
    try {
      const response = await api.get(`/search/filters/${searchType}`);
      return response.data;
    } catch (error) {
      console.error('Get search filters error:', error);
      throw error;
    }
  },
  
  /**
   * Get search facets
   */
  getSearchFacets: async (searchParams) => {
    try {
      const response = await api.post('/search/facets', searchParams);
      return response.data;
    } catch (error) {
      console.error('Get search facets error:', error);
      throw error;
    }
  },
  
  /**
   * Get recent search terms
   */
  getRecentSearches: async (userId, limit = 10) => {
    try {
      const response = await api.get(`/search/recent/${userId}`, { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Get recent searches error:', error);
      throw error;
    }
  },
  
  /**
   * Clear search history
   */
  clearSearchHistory: async (userId) => {
    try {
      const response = await api.delete(`/search/history/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Clear search history error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH ANALYTICS =====================
  
  /**
   * Log search activity
   */
  logSearchActivity: async (activityData) => {
    try {
      const response = await api.post('/search/analytics/log', activityData);
      return response.data;
    } catch (error) {
      console.error('Log search activity error:', error);
      throw error;
    }
  },
  
  /**
   * Get search analytics
   */
  getSearchAnalytics: async (params = {}) => {
    try {
      const response = await api.get('/search/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Get search analytics error:', error);
      throw error;
    }
  },
  
  /**
   * Get popular searches
   */
  getPopularSearches: async (params = {}) => {
    try {
      const response = await api.get('/search/popular', { params });
      return response.data;
    } catch (error) {
      console.error('Get popular searches error:', error);
      throw error;
    }
  },
  
  /**
   * Get search trends
   */
  getSearchTrends: async (params = {}) => {
    try {
      const response = await api.get('/search/trends', { params });
      return response.data;
    } catch (error) {
      console.error('Get search trends error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH ENHANCEMENTS =====================
  
  /**
   * Get search suggestions
   */
  getSearchSuggestions: async (query, params = {}) => {
    try {
      const response = await api.get('/search/suggestions', {
        params: { query, ...params },
      });
      return response.data;
    } catch (error) {
      console.error('Get search suggestions error:', error);
      throw error;
    }
  },
  
  /**
   * Get search synonyms
   */
  getSearchSynonyms: async (term) => {
    try {
      const response = await api.get(`/search/synonyms/${term}`);
      return response.data;
    } catch (error) {
      console.error('Get search synonyms error:', error);
      throw error;
    }
  },
  
  /**
   * Get related searches
   */
  getRelatedSearches: async (query, params = {}) => {
    try {
      const response = await api.get('/search/related', {
        params: { query, ...params },
      });
      return response.data;
    } catch (error) {
      console.error('Get related searches error:', error);
      throw error;
    }
  },
  
  /**
   * Get search corrections
   */
  getSearchCorrections: async (query) => {
    try {
      const response = await api.get(`/search/corrections/${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Get search corrections error:', error);
      throw error;
    }
  },
  
  // ===================== SAVED SEARCHES =====================
  
  /**
   * Save search query
   */
  saveSearch: async (saveData) => {
    try {
      const response = await api.post('/search/saved/save', saveData);
      return response.data;
    } catch (error) {
      console.error('Save search error:', error);
      throw error;
    }
  },
  
  /**
   * Get saved searches
   */
  getSavedSearches: async (userId) => {
    try {
      const response = await api.get(`/search/saved/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get saved searches error:', error);
      throw error;
    }
  },
  
  /**
   * Update saved search
   */
  updateSavedSearch: async (searchId, updates) => {
    try {
      const response = await api.put(`/search/saved/${searchId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Update saved search error:', error);
      throw error;
    }
  },
  
  /**
   * Delete saved search
   */
  deleteSavedSearch: async (searchId) => {
    try {
      const response = await api.delete(`/search/saved/${searchId}`);
      return response.data;
    } catch (error) {
      console.error('Delete saved search error:', error);
      throw error;
    }
  },
  
  /**
   * Execute saved search
   */
  executeSavedSearch: async (searchId, params = {}) => {
    try {
      const response = await api.post(`/search/saved/${searchId}/execute`, params);
      return response.data;
    } catch (error) {
      console.error('Execute saved search error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH BOOKMARKS =====================
  
  /**
   * Bookmark search result
   */
  bookmarkResult: async (bookmarkData) => {
    try {
      const response = await api.post('/search/bookmarks/add', bookmarkData);
      return response.data;
    } catch (error) {
      console.error('Bookmark result error:', error);
      throw error;
    }
  },
  
  /**
   * Get bookmarked results
   */
  getBookmarks: async (userId, params = {}) => {
    try {
      const response = await api.get(`/search/bookmarks/${userId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Get bookmarks error:', error);
      throw error;
    }
  },
  
  /**
   * Remove bookmark
   */
  removeBookmark: async (bookmarkId) => {
    try {
      const response = await api.delete(`/search/bookmarks/${bookmarkId}`);
      return response.data;
    } catch (error) {
      console.error('Remove bookmark error:', error);
      throw error;
    }
  },
  
  /**
   * Update bookmark
   */
  updateBookmark: async (bookmarkId, updates) => {
    try {
      const response = await api.put(`/search/bookmarks/${bookmarkId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Update bookmark error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH EXPORT & SHARE =====================
  
  /**
   * Export search results
   */
  exportSearchResults: async (exportConfig) => {
    try {
      const response = await api.post('/search/export', exportConfig, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Export search results error:', error);
      throw error;
    }
  },
  
  /**
   * Share search results
   */
  shareSearchResults: async (shareData) => {
    try {
      const response = await api.post('/search/share', shareData);
      return response.data;
    } catch (error) {
      console.error('Share search results error:', error);
      throw error;
    }
  },
  
  /**
   * Generate search report
   */
  generateSearchReport: async (reportData) => {
    try {
      const response = await api.post('/search/reports/generate', reportData);
      return response.data;
    } catch (error) {
      console.error('Generate search report error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH INDEXING =====================
  
  /**
   * Index content for search
   */
  indexContent: async (indexData) => {
    try {
      const response = await api.post('/search/index', indexData);
      return response.data;
    } catch (error) {
      console.error('Index content error:', error);
      throw error;
    }
  },
  
  /**
   * Reindex content
   */
  reindexContent: async (contentType, contentId) => {
    try {
      const response = await api.post(`/search/reindex/${contentType}/${contentId}`);
      return response.data;
    } catch (error) {
      console.error('Reindex content error:', error);
      throw error;
    }
  },
  
  /**
   * Remove from index
   */
  removeFromIndex: async (contentType, contentId) => {
    try {
      const response = await api.delete(`/search/index/${contentType}/${contentId}`);
      return response.data;
    } catch (error) {
      console.error('Remove from index error:', error);
      throw error;
    }
  },
  
  /**
   * Get index status
   */
  getIndexStatus: async (params = {}) => {
    try {
      const response = await api.get('/search/index/status', { params });
      return response.data;
    } catch (error) {
      console.error('Get index status error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH CONFIGURATION =====================
  
  /**
   * Get search configuration
   */
  getSearchConfig: async () => {
    try {
      const response = await api.get('/search/config');
      return response.data;
    } catch (error) {
      console.error('Get search config error:', error);
      throw error;
    }
  },
  
  /**
   * Update search configuration
   */
  updateSearchConfig: async (configUpdates) => {
    try {
      const response = await api.put('/search/config', configUpdates);
      return response.data;
    } catch (error) {
      console.error('Update search config error:', error);
      throw error;
    }
  },
  
  /**
   * Get search ranking factors
   */
  getSearchRanking: async () => {
    try {
      const response = await api.get('/search/ranking');
      return response.data;
    } catch (error) {
      console.error('Get search ranking error:', error);
      throw error;
    }
  },
  
  /**
   * Update search ranking
   */
  updateSearchRanking: async (rankingUpdates) => {
    try {
      const response = await api.put('/search/ranking', rankingUpdates);
      return response.data;
    } catch (error) {
      console.error('Update search ranking error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH HEALTH & METRICS =====================
  
  /**
   * Check search service health
   */
  checkSearchHealth: async () => {
    try {
      const response = await api.get('/search/health');
      return response.data;
    } catch (error) {
      console.error('Check search health error:', error);
      throw error;
    }
  },
  
  /**
   * Get search performance metrics
   */
  getSearchPerformance: async (params = {}) => {
    try {
      const response = await api.get('/search/performance', { params });
      return response.data;
    } catch (error) {
      console.error('Get search performance error:', error);
      throw error;
    }
  },
  
  /**
   * Get search error logs
   */
  getSearchErrorLogs: async (params = {}) => {
    try {
      const response = await api.get('/search/errors', { params });
      return response.data;
    } catch (error) {
      console.error('Get search error logs error:', error);
      throw error;
    }
  },
  
  /**
   * Clear search cache
   */
  clearSearchCache: async () => {
    try {
      const response = await api.delete('/search/cache');
      return response.data;
    } catch (error) {
      console.error('Clear search cache error:', error);
      throw error;
    }
  },
  
  // ===================== SEARCH INTEGRATIONS =====================
  
  /**
   * Search with external sources
   */
  searchExternal: async (searchParams) => {
    try {
      const response = await api.post('/search/external', searchParams);
      return response.data;
    } catch (error) {
      console.error('Search external error:', error);
      throw error;
    }
  },
  
  /**
   * Get search integrations
   */
  getSearchIntegrations: async () => {
    try {
      const response = await api.get('/search/integrations');
      return response.data;
    } catch (error) {
      console.error('Get search integrations error:', error);
      throw error;
    }
  },
  
  /**
   * Configure search integration
   */
  configureSearchIntegration: async (integrationConfig) => {
    try {
      const response = await api.post('/search/integrations/configure', integrationConfig);
      return response.data;
    } catch (error) {
      console.error('Configure search integration error:', error);
      throw error;
    }
  },
};

export default searchApi;
