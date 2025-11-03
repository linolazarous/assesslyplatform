/**
 * Performance optimization utilities
 * Centralized performance helpers for the application
 */

/**
 * Debounce function to limit function execution frequency
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to trigger immediately
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

/**
 * Throttle function to limit function execution rate
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Memoize expensive function calls
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Preload images for better performance
 * @param {string[]} srcArray - Array of image URLs to preload
 * @returns {Promise} Promise that resolves when all images are loaded
 */
export const preloadImages = (srcArray) => {
  const promises = srcArray.map(src => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
  });
  return Promise.all(promises);
};

/**
 * Check if element is in viewport for lazy loading
 * @param {Element} element - DOM element to check
 * @returns {boolean} Whether element is in viewport
 */
export const isInViewport = (element) => {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Measure function execution time for performance debugging
 * @param {Function} fn - Function to measure
 * @param {string} label - Measurement label for console
 * @returns {*} Function return value
 */
export const measurePerformance = (fn, label = 'Function') => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`${label} executed in: ${(end - start).toFixed(2)}ms`);
  }
  
  return result;
};

/**
 * Create intersection observer for lazy loading
 * @param {Function} callback - Callback when element becomes visible
 * @param {Object} options - Intersection observer options
 * @returns {IntersectionObserver} Observer instance
 */
export const createLazyLoader = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
      }
    });
  }, defaultOptions);
};

/**
 * Batch state updates to prevent excessive re-renders
 * @param {Function} setState - React setState function
 * @param {Array} updates - Array of state updates
 */
export const batchUpdates = (setState, updates) => {
  setState(prevState => {
    let newState = { ...prevState };
    updates.forEach(update => {
      newState = { ...newState, ...update };
    });
    return newState;
  });
};

export default {
  debounce,
  throttle,
  memoize,
  preloadImages,
  isInViewport,
  measurePerformance,
  createLazyLoader,
  batchUpdates
};
