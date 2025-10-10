// src/services/searchService.jsx

/**
 * Simple debounce helper to limit search API calls
 * NOTE: This is an internal utility, but we keep it here for clarity.
 * @param {function} func - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {function}
 */
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    // Clear any previous timer to reset the debounce period
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
    // Ensure we return an array, defaulting to the structure expected by the caller
    return Array.isArray(data.results) ? data.results : data;
  } catch (error) {
    console.error('[Assessly Search Error]:', error);
    // Re-throw a standardized user-friendly error message
    throw new Error('Unable to complete search. Please check your connection and try again.');
  }
};

/**
 * Debounced version for better UX and performance
 * @param {string} searchTerm - The query string.
 * @param {string} userId - The ID of the current user.
 * @param {function(Array<Object>, string | null)} callback - Callback function (results, error).
 * @param {string} type - 'assessments' or 'questions'.
 * @param {number} delay - Debounce delay in ms.
 * @returns {function} Cleanup function to stop pending search.
 */
export const debouncedSearch = (searchTerm, userId, callback, type = 'assessments', delay = 400) => {
  let active = true;

  // Function that actually executes the API call
  const doSearch = async () => {
    if (!active) return;
    try {
      const results = await performSearch(searchTerm, userId, type);
      if (active) callback(results, null);
    } catch (error) {
      // Pass the error message back to the component
      if (active) callback([], error.message);
    }
  };

  // We need to store the debounced function *outside* of this export to maintain its state
  // across calls, but since it's defined inside, we'll call it immediately.
  // The caller (SearchPage.jsx) manages the lifecycle via useEffect cleanup.

  // Define a stable debounced function if one doesn't exist already (complex to do here,
  // so we rely on the component using the returned cleanup function).
  
  // NOTE: In a cleaner architecture, the component (SearchPage) would define the debounce
  // using a hook like useDebouncedCallback, but we respect the current structure.
  
  // Create a new debounced instance and call it immediately
  const debouncedFn = debounce(doSearch, delay);
  debouncedFn();

  return () => {
    active = false;
    // Clearing the timeout here would require accessing timeoutId from the closure, 
    // which is tricky. Relying on `active = false` is a good second-best cleanup mechanism.
  };
};
