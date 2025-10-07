// src/services/searchService.js

/**
 * Simple debounce helper to limit search API calls
 * @param {function} func - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {function}
 */
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Perform a search against Assessly’s internal API
 * Supports assessment or question queries
 */
export const performSearch = async (searchTerm, userId, type = 'assessments', limitCount = 20) => {
  if (!searchTerm?.trim()) return [];

  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found');

    const response = await fetch(`/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        searchTerm,
        type,
        userId,
        limitCount,
      }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Search failed');
    return data.results || data;
  } catch (error) {
    console.error('[Assessly Search Error]:', error);
    throw new Error('Unable to complete search. Please try again.');
  }
};

/**
 * Debounced version for better UX and performance
 */
export const debouncedSearch = (searchTerm, userId, callback, type = 'assessments', delay = 400) => {
  let active = true;

  const doSearch = async () => {
    if (!active) return;
    try {
      const results = await performSearch(searchTerm, userId, type);
      if (active) callback(results, null);
    } catch (error) {
      if (active) callback([], error.message);
    }
  };

  const debouncedFn = debounce(doSearch, delay);
  debouncedFn();

  return () => {
    active = false;
  };
};
