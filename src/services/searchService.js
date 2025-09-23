// src/services/searchService.js

// Debounce function to limit API calls (remains the same)
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Searches for assessments or questions via Vercel API.
 * @param {string} searchTerm - The term to search for
 * @param {string} userId - Current user's ID
 * @param {string} [type='assessments'] - Type of search ('assessments' or 'questions')
 * @param {number} [limitCount=20] - Maximum number of results to return
 * @returns {Promise<Array>} Array of matching results
 */
const performSearch = async (searchTerm, userId, type = 'assessments', limitCount = 20) => {
  try {
    if (!searchTerm?.trim()) return [];

    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found');

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        searchTerm,
        type,
        userId,
        limitCount,
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Search failed');
    }

    return data;
  } catch (error) {
    console.error('Search error:', error);
    throw new Error('Failed to perform search. Please try again later.');
  }
};

/**
 * Enhanced debounced search with cancellation and type handling
 * @param {string} searchTerm - Term to search for
 * @param {string} userId - Current user's ID
 * @param {function} callback - (results, error) => void
 * @param {string} [type='assessments'] - Type of search ('assessments' or 'questions')
 * @param {number} [debounceTime=300] - Debounce delay in ms
 * @returns {function} Cancel function to abort pending search
 */
const debouncedSearch = (searchTerm, userId, callback, type = 'assessments', debounceTime = 300) => {
  let active = true;
  let cancelPrevious = () => {};
  
  const searchFn = async () => {
    if (!active) return;
    
    try {
      const results = await performSearch(searchTerm, userId, type);
      
      if (active) callback(results, null);
    } catch (error) {
      if (active) callback([], error.message);
    }
  };

  cancelPrevious();
  
  const debounced = debounce(searchFn, debounceTime);
  debounced();
  
  cancelPrevious = () => {
    active = false;
  };
  
  return cancelPrevious;
};

export { 
  performSearch, 
  debouncedSearch 
};
