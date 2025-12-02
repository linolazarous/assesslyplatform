// src/services/searchService.jsx
import axios from 'axios';

// Configure search-specific axios instance
const searchApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000, // 10 second timeout for search
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
searchApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add search-specific headers
    config.headers['X-Search-Context'] = 'web-ui';
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for search-specific error handling
searchApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for search - just return empty results
    if (error.response?.status === 401) {
      console.warn('[Search] Authentication required');
    }
    
    // Rate limiting handling
    if (error.response?.status === 429) {
      console.warn('[Search] Rate limit exceeded');
    }
    
    return Promise.reject(error);
  }
);

/**
 * Enhanced debounce helper with leading/trailing options
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in ms
 * @param {Object} options - {leading: boolean, trailing: boolean}
 * @returns {Function}
 */
export const debounce = (func, wait = 400, options = {}) => {
  let timeoutId;
  let lastArgs;
  let lastThis;
  let result;
  let leading = false;
  let trailing = true;

  if (typeof options === 'object') {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  const invokeFunc = () => {
    const args = lastArgs;
    const context = lastThis;
    lastArgs = lastThis = undefined;
    result = func.apply(context, args);
    return result;
  };

  const shouldInvoke = (timeoutId) => timeoutId === undefined;

  const trailingEdge = () => {
    timeoutId = undefined;
    if (trailing && lastArgs) {
      return invokeFunc();
    }
    lastArgs = lastThis = undefined;
    return result;
  };

  const debounced = function(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(timeoutId);

    lastArgs = args;
    lastThis = this;

    if (isInvoking) {
      if (leading) {
        return invokeFunc();
      }
    }

    clearTimeout(timeoutId);
    timeoutId = setTimeout(trailingEdge, wait);

    return result;
  };

  debounced.cancel = () => {
    clearTimeout(timeoutId);
    lastArgs = lastThis = timeoutId = undefined;
  };

  debounced.flush = () => {
    return timeoutId === undefined ? result : trailingEdge();
  };

  return debounced;
};

/**
 * Throttle helper for rate limiting
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in ms
 * @returns {Function}
 */
export const throttle = (func, limit = 1000) => {
  let inThrottle;
  let lastResult;

  return function(...args) {
    const context = this;
    
    if (!inThrottle) {
      inThrottle = true;
      lastResult = func.apply(context, args);
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    
    return lastResult;
  };
};

/**
 * Cache manager for search results with TTL
 */
class SearchCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Global search cache instance
const searchCache = new SearchCache();

/**
 * Advanced search query builder
 */
export const buildSearchQuery = (options = {}) => {
  const {
    searchTerm = '',
    type = 'assessments',
    filters = {},
    sort = {},
    pagination = {},
    userId = null,
    organizationId = null,
    includeMetadata = false
  } = options;

  const query = {
    searchTerm: searchTerm.trim(),
    type,
    filters,
    sort,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      ...pagination
    },
    userId,
    organizationId: organizationId || localStorage.getItem('organizationId'),
    includeMetadata,
    timestamp: Date.now()
  };

  // Apply default filters based on type
  switch (type) {
    case 'assessments':
      query.filters = {
        status: ['published', 'draft'],
        isArchived: false,
        ...query.filters
      };
      break;
    case 'questions':
      query.filters = {
        isActive: true,
        ...query.filters
      };
      break;
    case 'users':
      query.filters = {
        isActive: true,
        ...query.filters
      };
      break;
  }

  return query;
};

/**
 * Perform advanced search with caching and retry logic
 */
export const performSearch = async (options = {}) => {
  const {
    searchTerm,
    type = 'assessments',
    userId = null,
    limit = 20,
    page = 1,
    filters = {},
    sort = {},
    useCache = true,
    abortSignal = null
  } = options;

  // Validate inputs
  if (!searchTerm?.trim() || searchTerm.trim().length < 2) {
    return {
      results: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      suggestions: [],
      metadata: {}
    };
  }

  // Check cache first
  const cacheKey = `${type}:${searchTerm}:${JSON.stringify(filters)}:${page}:${limit}`;
  if (useCache) {
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.debug('[Search] Returning cached results for:', searchTerm);
      return cached;
    }
  }

  try {
    const query = buildSearchQuery({
      searchTerm,
      type,
      userId,
      filters,
      sort,
      pagination: { page, limit }
    });

    const config = {
      timeout: 15000,
      ...(abortSignal && { signal: abortSignal })
    };

    const response = await searchApi.post('/v1/search', query, config);
    const data = response.data.data || response.data;

    // Transform and enrich results
    const results = Array.isArray(data.results) ? data.results : [];
    const enrichedResults = enrichSearchResults(results, type, searchTerm);

    const searchResponse = {
      results: enrichedResults,
      total: data.total || results.length,
      page: data.page || page,
      limit: data.limit || limit,
      hasMore: data.hasMore || (results.length === limit),
      suggestions: data.suggestions || generateSuggestions(searchTerm, results),
      metadata: {
        searchTime: data.searchTime || 0,
        searchType: type,
        query: searchTerm,
        filtersApplied: Object.keys(filters).length,
        ...data.metadata
      }
    };

    // Cache successful responses
    if (useCache && searchTerm.length > 2) {
      searchCache.set(cacheKey, searchResponse);
    }

    return searchResponse;
  } catch (error) {
    console.error('[Search Error]:', error);

    // Handle specific error types
    if (error.name === 'AbortError') {
      console.log('[Search] Request aborted');
      throw new Error('Search was cancelled');
    }

    if (error.code === 'ECONNABORTED') {
      throw new Error('Search request timed out. Please try again.');
    }

    if (error.response?.status === 429) {
      throw new Error('Too many search requests. Please slow down.');
    }

    // Return empty results with error metadata
    return {
      results: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      suggestions: [],
      metadata: {
        error: true,
        errorMessage: error.message || 'Search failed',
        searchType: type,
        query: searchTerm
      }
    };
  }
};

/**
 * Enrich search results with highlighting and additional data
 */
const enrichSearchResults = (results, type, searchTerm) => {
  if (!results.length) return results;

  const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  
  return results.map(result => {
    const enriched = { ...result };
    
    // Add highlighting for matched terms
    if (searchTerms.length > 0) {
      enriched._highlight = {
        fields: [],
        snippets: []
      };

      // Highlight in relevant fields based on type
      switch (type) {
        case 'assessments':
          enriched._highlight.fields = highlightField(enriched.title, searchTerms);
          enriched._highlight.snippets = highlightField(enriched.description, searchTerms, 100);
          break;
        case 'questions':
          enriched._highlight.fields = highlightField(enriched.text, searchTerms);
          if (enriched.tags) {
            enriched._highlight.tags = enriched.tags.filter(tag => 
              searchTerms.some(term => tag.toLowerCase().includes(term))
            );
          }
          break;
        case 'users':
          enriched._highlight.fields = highlightField(enriched.name || enriched.email, searchTerms);
          break;
      }
    }

    // Add relevance score if not present
    if (!enriched.score) {
      enriched.score = calculateRelevanceScore(enriched, searchTerms, type);
    }

    // Format dates
    if (enriched.createdAt) {
      enriched.formattedDate = formatRelativeDate(enriched.createdAt);
    }

    return enriched;
  }).sort((a, b) => (b.score || 0) - (a.score || 0)); // Sort by relevance
};

/**
 * Highlight matching terms in text
 */
const highlightField = (text, searchTerms, maxLength = null) => {
  if (!text) return [];
  
  let processedText = text.toString();
  
  // Create snippets if maxLength is specified
  if (maxLength && processedText.length > maxLength) {
    const lowerText = processedText.toLowerCase();
    let bestMatchIndex = -1;
    
    // Find the best matching position
    for (const term of searchTerms) {
      const index = lowerText.indexOf(term);
      if (index !== -1 && (bestMatchIndex === -1 || index < bestMatchIndex)) {
        bestMatchIndex = index;
      }
    }
    
    if (bestMatchIndex !== -1) {
      const start = Math.max(0, bestMatchIndex - Math.floor(maxLength / 2));
      const end = Math.min(processedText.length, start + maxLength);
      processedText = (start > 0 ? '...' : '') + 
                     processedText.substring(start, end) + 
                     (end < processedText.length ? '...' : '');
    } else {
      processedText = processedText.substring(0, maxLength) + '...';
    }
  }
  
  // Highlight search terms
  let highlighted = processedText;
  searchTerms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  
  return highlighted;
};

/**
 * Calculate relevance score for search results
 */
const calculateRelevanceScore = (item, searchTerms, type) => {
  let score = 0;
  const text = (item.title || item.name || item.text || item.description || '').toLowerCase();
  
  searchTerms.forEach(term => {
    // Exact match bonus
    if (text === term.toLowerCase()) {
      score += 100;
    }
    
    // Starts with bonus
    if (text.startsWith(term.toLowerCase())) {
      score += 50;
    }
    
    // Contains bonus
    if (text.includes(term.toLowerCase())) {
      score += 20;
    }
    
    // Word boundary matches
    const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
    if (wordBoundaryRegex.test(text)) {
      score += 30;
    }
  });
  
  // Recency bonus
  if (item.createdAt) {
    const ageInDays = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 7) score += 10; // Recent items
    if (ageInDays < 1) score += 20; // Today's items
  }
  
  // Popularity/usage bonus
  if (item.usageCount) {
    score += Math.min(item.usageCount, 50); // Cap at 50
  }
  
  return score;
};

/**
 * Generate search suggestions based on query and results
 */
const generateSuggestions = (query, results) => {
  const suggestions = new Set();
  
  // Add original query variations
  suggestions.add(query.toLowerCase());
  suggestions.add(query.charAt(0).toUpperCase() + query.slice(1).toLowerCase());
  
  // Extract suggestions from results
  results.forEach(result => {
    if (result.title) {
      const words = result.title.split(/\s+/);
      words.forEach(word => {
        if (word.length > 3 && query.toLowerCase().includes(word.toLowerCase().substring(0, 3))) {
          suggestions.add(word);
        }
      });
    }
    
    if (result.tags) {
      result.tags.forEach(tag => {
        if (tag.length > 2) {
          suggestions.add(tag);
        }
      });
    }
  });
  
  return Array.from(suggestions).slice(0, 5);
};

/**
 * Format relative date for display
 */
const formatRelativeDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

/**
 * Advanced debounced search with comprehensive options
 */
export const createSearchController = (options = {}) => {
  const {
    delay = 400,
    leading = false,
    trailing = true,
    maxWait = 2000,
    onStart,
    onComplete,
    onError
  } = options;
  
  let abortController = null;
  let isSearching = false;
  
  const debouncedSearch = debounce(async (searchParams, callback) => {
    // Cancel previous request if still in progress
    if (abortController) {
      abortController.abort();
    }
    
    abortController = new AbortController();
    isSearching = true;
    
    if (onStart) onStart();
    
    try {
      const results = await performSearch({
        ...searchParams,
        abortSignal: abortController.signal
      });
      
      if (onComplete) onComplete(results);
      if (callback) callback(results, null);
    } catch (error) {
      console.error('[Debounced Search Error]:', error);
      
      if (onError) onError(error);
      if (callback) callback({ results: [], metadata: { error: true } }, error);
    } finally {
      isSearching = false;
    }
  }, delay, { leading, trailing, maxWait });
  
  // Add controller methods
  debouncedSearch.cancel = () => {
    if (abortController) {
      abortController.abort();
    }
    debouncedSearch.cancel && debouncedSearch.cancel();
  };
  
  debouncedSearch.flush = () => {
    return debouncedSearch.flush && debouncedSearch.flush();
  };
  
  debouncedSearch.isSearching = () => isSearching;
  
  return debouncedSearch;
};

/**
 * Search for similar items (recommendations)
 */
export const findSimilarItems = async (itemId, type = 'assessments', limit = 5) => {
  try {
    const response = await searchApi.get(`/v1/search/similar/${itemId}`, {
      params: { type, limit }
    });
    
    return response.data.data || [];
  } catch (error) {
    console.error('[Similar Items Error]:', error);
    return [];
  }
};

/**
 * Get search analytics and popular queries
 */
export const getSearchAnalytics = async (timeRange = '7d') => {
  try {
    const response = await searchApi.get('/v1/search/analytics', {
      params: { timeRange }
    });
    
    return response.data.data || {};
  } catch (error) {
    console.error('[Search Analytics Error]:', error);
    return {};
  }
};

/**
 * Clear search cache
 */
export const clearSearchCache = (pattern = null) => {
  if (pattern) {
    // Clear specific patterns
    const keys = Array.from(searchCache.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        searchCache.delete(key);
      }
    });
  } else {
    searchCache.clear();
  }
};

export default {
  performSearch,
  debounce,
  throttle,
  createSearchController,
  findSimilarItems,
  getSearchAnalytics,
  clearSearchCache,
  buildSearchQuery
};
