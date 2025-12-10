// src/utils/performance.js
/**
 * Enterprise-grade performance optimization utilities
 * Centralized performance helpers with advanced monitoring and optimization
 */

// Performance monitoring configuration
const PERF_CONFIG = {
  ENABLE_METRICS: import.meta.env.MODE === 'development',
  LONG_TASK_THRESHOLD: 50, // milliseconds
  MEMORY_CHECK_INTERVAL: 30000, // 30 seconds
  IDLE_TIMEOUT: 5000, // 5 seconds
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100
};

// Performance metrics storage
const performanceMetrics = {
  longTasks: [],
  memorySnapshots: [],
  networkRequests: [],
  renderTimes: [],
  userInteractions: []
};

/**
 * Enhanced debounce with leading/trailing options and maxWait
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {Object} options - {leading: boolean, trailing: boolean, maxWait: number}
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300, options = {}) => {
  let timeoutId;
  let lastArgs;
  let lastThis;
  let lastCallTime;
  let result;
  
  const {
    leading = false,
    trailing = true,
    maxWait = null
  } = options;
  
  const invokeFunc = (time) => {
    const args = lastArgs;
    const context = lastThis;
    lastArgs = lastThis = undefined;
    lastCallTime = time;
    result = func.apply(context, args);
    return result;
  };
  
  const shouldInvoke = (time) => {
    if (!lastCallTime) return true;
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastCallTime;
    
    // Either time has exceeded maxWait, or we're at the trailing edge
    return (maxWait !== null && timeSinceLastCall >= maxWait) ||
           (timeSinceLastInvoke >= wait);
  };
  
  const trailingEdge = (time) => {
    timeoutId = undefined;
    
    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  };
  
  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastCallTime;
    const timeWaiting = wait - timeSinceLastInvoke;
    
    timeoutId = setTimeout(timerExpired, timeWaiting);
  };
  
  const debounced = function(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    
    lastArgs = args;
    lastThis = this;
    
    if (isInvoking) {
      if (!timeoutId) {
        // Reset any `maxWait` timer
        lastCallTime = time;
        timeoutId = setTimeout(timerExpired, wait);
        return leading ? invokeFunc(time) : result;
      }
      if (maxWait !== null) {
        // Handle invocations in a tight loop
        const timeSinceLastCall = time - lastCallTime;
        if (timeSinceLastCall >= maxWait) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
          lastCallTime = time;
          timeoutId = setTimeout(timerExpired, wait);
          return invokeFunc(time);
        }
      }
    }
    
    if (!timeoutId) {
      timeoutId = setTimeout(timerExpired, wait);
    }
    
    return result;
  };
  
  debounced.cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    lastCallTime = 0;
    lastArgs = lastThis = timeoutId = undefined;
  };
  
  debounced.flush = () => {
    return timeoutId === undefined ? result : trailingEdge(Date.now());
  };
  
  debounced.pending = () => {
    return timeoutId !== undefined;
  };
  
  return debounced;
};

/**
 * Enhanced throttle with leading/trailing options
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @param {Object} options - {leading: boolean, trailing: boolean}
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 300, options = {}) => {
  let timeout;
  let previous = 0;
  let trailingArgs;
  
  const {
    leading = true,
    trailing = true
  } = options;
  
  const later = () => {
    previous = leading === false ? 0 : Date.now();
    timeout = null;
    if (trailingArgs) {
      func.apply(this, trailingArgs);
      trailingArgs = null;
    }
  };
  
  const throttled = function(...args) {
    const now = Date.now();
    
    if (!previous && leading === false) {
      previous = now;
    }
    
    const remaining = limit - (now - previous);
    
    if (remaining <= 0 || remaining > limit) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
      
      if (!timeout) {
        trailingArgs = null;
      }
    } else if (!timeout && trailing !== false) {
      trailingArgs = args;
      timeout = setTimeout(later.bind(this), remaining);
    }
  };
  
  throttled.cancel = () => {
    clearTimeout(timeout);
    timeout = null;
    previous = 0;
    trailingArgs = null;
  };
  
  return throttled;
};

/**
 * Advanced memoization with TTL and cache size limits
 * @param {Function} fn - Function to memoize
 * @param {Object} options - {ttl: number, maxSize: number, serializer: Function}
 * @returns {Function} Memoized function
 */
export const memoize = (fn, options = {}) => {
  const {
    ttl = PERF_CONFIG.CACHE_TTL,
    maxSize = PERF_CONFIG.MAX_CACHE_SIZE,
    serializer = JSON.stringify
  } = options;
  
  const cache = new Map();
  const timestamps = new Map();
  const accessOrder = [];
  
  const cleanup = () => {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, timestamp] of timestamps.entries()) {
      if (now - timestamp > ttl) {
        cache.delete(key);
        timestamps.delete(key);
        const index = accessOrder.indexOf(key);
        if (index > -1) accessOrder.splice(index, 1);
      }
    }
    
    // Remove oldest entries if cache exceeds max size
    while (cache.size > maxSize) {
      const oldestKey = accessOrder.shift();
      cache.delete(oldestKey);
      timestamps.delete(oldestKey);
    }
  };
  
  const memoized = (...args) => {
    cleanup();
    
    const key = serializer(args);
    const now = Date.now();
    
    if (cache.has(key)) {
      // Update access order
      const index = accessOrder.indexOf(key);
      if (index > -1) {
        accessOrder.splice(index, 1);
      }
      accessOrder.push(key);
      timestamps.set(key, now);
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    timestamps.set(key, now);
    accessOrder.push(key);
    
    return result;
  };
  
  memoized.clear = () => {
    cache.clear();
    timestamps.clear();
    accessOrder.length = 0;
  };
  
  memoized.has = (...args) => {
    const key = serializer(args);
    return cache.has(key);
  };
  
  memoized.delete = (...args) => {
    const key = serializer(args);
    const deleted = cache.delete(key);
    timestamps.delete(key);
    const index = accessOrder.indexOf(key);
    if (index > -1) accessOrder.splice(index, 1);
    return deleted;
  };
  
  memoized.size = () => cache.size;
  
  return memoized;
};

/**
 * Preload resources with priority and error handling
 * @param {Array} resources - Array of resource objects {src: string, type: string, priority: number}
 * @returns {Promise} Promise that resolves when all resources are loaded
 */
export const preloadResources = async (resources) => {
  const promises = [];
  
  // Sort by priority (higher priority first)
  const sortedResources = [...resources].sort((a, b) => 
    (b.priority || 0) - (a.priority || 0)
  );
  
  for (const resource of sortedResources) {
    const { src, type, priority = 0 } = resource;
    
    if (!src) continue;
    
    const promise = new Promise((resolve, reject) => {
      let element;
      
      switch (type) {
        case 'image':
          element = new Image();
          break;
        case 'script':
          element = document.createElement('script');
          element.src = src;
          break;
        case 'stylesheet':
          element = document.createElement('link');
          element.rel = 'stylesheet';
          element.href = src;
          break;
        case 'font':
          element = document.createElement('link');
          element.rel = 'preload';
          element.href = src;
          element.as = 'font';
          element.crossOrigin = 'anonymous';
          break;
        default:
          // Generic preload
          element = document.createElement('link');
          element.rel = 'preload';
          element.href = src;
          break;
      }
      
      element.onload = () => {
        trackPerformance('resource_load', {
          type,
          src,
          priority,
          size: getResourceSize(element),
          duration: performance.now() - startTime
        });
        resolve(element);
      };
      
      element.onerror = (error) => {
        trackPerformance('resource_error', {
          type,
          src,
          priority,
          error: error.message
        });
        reject(error);
      };
      
      const startTime = performance.now();
      
      if (type === 'script' || type === 'stylesheet' || type === 'font') {
        document.head.appendChild(element);
      } else {
        // For images, just setting src triggers loading
        if (type === 'image') {
          element.src = src;
        }
      }
    });
    
    promises.push(promise);
    
    // Add slight delay between high-priority loads to prevent blocking
    if (priority >= 2) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return Promise.allSettled(promises);
};

/**
 * Lazy load images with intersection observer and placeholder
 * @param {NodeList|Array} elements - Elements to lazy load
 * @param {Object} options - {root: Element, rootMargin: string, threshold: number, placeholder: string}
 */
export const lazyLoadImages = (elements, options = {}) => {
  const {
    root = null,
    rootMargin = '50px',
    threshold = 0.1,
    placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  } = options;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const dataSrc = img.getAttribute('data-src');
        
        if (dataSrc) {
          // Load image
          img.src = dataSrc;
          img.removeAttribute('data-src');
          
          // Add loaded class for styling
          img.classList.add('lazyloaded');
          
          // Track performance
          trackPerformance('lazy_image_load', {
            src: dataSrc,
            intersectionTime: entry.time,
            element: img.tagName
          });
        }
        
        // Stop observing once loaded
        observer.unobserve(img);
      }
    });
  }, { root, rootMargin, threshold });
  
  // Set placeholder and start observing
  elements.forEach(element => {
    if (element.tagName === 'IMG' && element.getAttribute('data-src')) {
      element.src = placeholder;
      element.classList.add('lazyload');
      observer.observe(element);
    }
  });
  
  return observer;
};

/**
 * Performance monitoring with Web Vitals
 */
export const initPerformanceMonitoring = () => {
  if (!PERF_CONFIG.ENABLE_METRICS || typeof window === 'undefined') return;
  
  // Track Largest Contentful Paint (LCP)
  const trackLCP = () => {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      trackPerformance('lcp', {
        value: lastEntry.startTime,
        element: lastEntry.element?.tagName || 'unknown',
        size: lastEntry.size,
        url: lastEntry.url
      });
    });
    
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  };
  
  // Track First Input Delay (FID)
  const trackFID = () => {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        trackPerformance('fid', {
          value: entry.processingStart - entry.startTime,
          name: entry.name,
          startTime: entry.startTime,
          processingStart: entry.processingStart
        });
      });
    });
    
    observer.observe({ type: 'first-input', buffered: true });
  };
  
  // Track Cumulative Layout Shift (CLS)
  const trackCLS = () => {
    let clsValue = 0;
    let clsEntries = [];
    
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsEntries.push(entry);
          clsValue += entry.value;
        }
      }
      
      // Report CLS when page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          trackPerformance('cls', {
            value: clsValue,
            entries: clsEntries.length
          });
          observer.takeRecords();
        }
      });
    });
    
    observer.observe({ type: 'layout-shift', buffered: true });
  };
  
  // Track long tasks
  const trackLongTasks = () => {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (entry.duration > PERF_CONFIG.LONG_TASK_THRESHOLD) {
          performanceMetrics.longTasks.push({
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name,
            attribution: entry.attribution
          });
          
          if (performanceMetrics.longTasks.length > 100) {
            performanceMetrics.longTasks.shift();
          }
        }
      });
    });
    
    observer.observe({ type: 'longtask', buffered: true });
  };
  
  // Track memory usage (if available)
  const trackMemory = () => {
    if (performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        performanceMetrics.memorySnapshots.push({
          timestamp: Date.now(),
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });
        
        if (performanceMetrics.memorySnapshots.length > 100) {
          performanceMetrics.memorySnapshots.shift();
        }
        
        // Alert if memory usage is high
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        if (memoryUsage > 0.8) {
          console.warn('High memory usage detected:', memoryUsage);
        }
      }, PERF_CONFIG.MEMORY_CHECK_INTERVAL);
    }
  };
  
  // Initialize all trackers
  try {
    trackLCP();
    trackFID();
    trackCLS();
    trackLongTasks();
    trackMemory();
  } catch (error) {
    console.warn('Performance monitoring initialization failed:', error);
  }
};

/**
 * Measure and report function execution time
 * @param {Function} fn - Function to measure
 * @param {string} label - Measurement label
 * @param {Object} options - {log: boolean, threshold: number}
 * @returns {*} Function return value
 */
export const measurePerformance = (fn, label = 'Function', options = {}) => {
  const {
    log = PERF_CONFIG.ENABLE_METRICS,
    threshold = PERF_CONFIG.LONG_TASK_THRESHOLD
  } = options;
  
  const startTime = performance.now();
  const startMemory = performance.memory?.usedJSHeapSize;
  
  try {
    const result = fn();
    const endTime = performance.now();
    const endMemory = performance.memory?.usedJSHeapSize;
    
    const duration = endTime - startTime;
    const memoryDiff = startMemory && endMemory ? endMemory - startMemory : null;
    
    // Store metrics
    performanceMetrics.renderTimes.push({
      label,
      duration,
      memoryDiff,
      timestamp: Date.now()
    });
    
    if (performanceMetrics.renderTimes.length > 1000) {
      performanceMetrics.renderTimes.shift();
    }
    
    // Log if enabled and duration exceeds threshold
    if (log && duration > threshold) {
      console.group(`⏱️ ${label} Performance`);
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      if (memoryDiff !== null) {
        console.log(`Memory: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
      }
      console.groupEnd();
    }
    
    // Track long tasks
    if (duration > PERF_CONFIG.LONG_TASK_THRESHOLD) {
      trackPerformance('long_function', {
        label,
        duration,
        memoryDiff,
        stack: new Error().stack
      });
    }
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    trackPerformance('function_error', {
      label,
      duration: endTime - startTime,
      error: error.message
    });
    throw error;
  }
};

/**
 * Batch React state updates to prevent excessive re-renders
 * @param {Function} setState - React setState function
 * @param {Array|Function} updates - Updates to batch
 * @param {Object} options - {timeout: number, immediate: boolean}
 */
export const batchUpdates = (setState, updates, options = {}) => {
  const {
    timeout = 0,
    immediate = false
  } = options;
  
  if (immediate || timeout === 0) {
    setState(prevState => {
      if (typeof updates === 'function') {
        return updates(prevState);
      }
      return Array.isArray(updates) 
        ? updates.reduce((acc, update) => ({ ...acc, ...update }), prevState)
        : { ...prevState, ...updates };
    });
    return;
  }
  
  // Use requestAnimationFrame for better batching
  let rafId;
  const executeBatch = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    rafId = requestAnimationFrame(() => {
      setState(prevState => {
        if (typeof updates === 'function') {
          return updates(prevState);
        }
        return Array.isArray(updates) 
          ? updates.reduce((acc, update) => ({ ...acc, ...update }), prevState)
          : { ...prevState, ...updates };
      });
    });
  };
  
  // Debounce rapid updates
  const debouncedExecute = debounce(executeBatch, timeout);
  debouncedExecute();
};

/**
 * Virtualized list rendering helper
 * @param {Array} items - Full list of items
 * @param {number} startIndex - Start index
 * @param {number} endIndex - End index
 * @param {number} overscan - Number of extra items to render
 * @returns {Array} Visible items
 */
export const virtualizeList = (items, startIndex, endIndex, overscan = 3) => {
  const start = Math.max(0, startIndex - overscan);
  const end = Math.min(items.length, endIndex + overscan);
  
  return {
    items: items.slice(start, end),
    startIndex: start,
    endIndex: end,
    total: items.length
  };
};

/**
 * Create a worker pool for CPU-intensive tasks
 * @param {string} workerScript - Worker script URL or content
 * @param {number} poolSize - Number of workers
 * @returns {Object} Worker pool interface
 */
export const createWorkerPool = (workerScript, poolSize = navigator.hardwareConcurrency || 4) => {
  const workers = [];
  const taskQueue = [];
  let workerIndex = 0;
  
  // Initialize workers
  for (let i = 0; i < poolSize; i++) {
    const worker = new Worker(workerScript);
    worker.busy = false;
    workers.push(worker);
  }
  
  const executeTask = (worker, task) => {
    worker.busy = true;
    
    return new Promise((resolve, reject) => {
      const messageHandler = (event) => {
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
        worker.busy = false;
        resolve(event.data);
        
        // Process next task in queue
        processQueue();
      };
      
      const errorHandler = (error) => {
        worker.removeEventListener('message', messageHandler);
        worker.removeEventListener('error', errorHandler);
        worker.busy = false;
        reject(error);
        
        // Process next task in queue
        processQueue();
      };
      
      worker.addEventListener('message', messageHandler);
      worker.addEventListener('error', errorHandler);
      worker.postMessage(task);
    });
  };
  
  const processQueue = () => {
    if (taskQueue.length === 0) return;
    
    // Find available worker
    const availableWorker = workers.find(w => !w.busy);
    if (!availableWorker) return;
    
    const task = taskQueue.shift();
    executeTask(availableWorker, task.task)
      .then(task.resolve)
      .catch(task.reject);
  };
  
  return {
    run: (task) => {
      return new Promise((resolve, reject) => {
        taskQueue.push({ task, resolve, reject });
        processQueue();
      });
    },
    
    terminate: () => {
      workers.forEach(worker => worker.terminate());
      workers.length = 0;
      taskQueue.length = 0;
    },
    
    getStats: () => ({
      totalWorkers: workers.length,
      busyWorkers: workers.filter(w => w.busy).length,
      queuedTasks: taskQueue.length
    })
  };
};

/**
 * Track performance metrics
 * @param {string} metric - Metric name
 * @param {Object} data - Metric data
 */
const trackPerformance = (metric, data) => {
  if (!PERF_CONFIG.ENABLE_METRICS) return;
  
  const entry = {
    metric,
    ...data,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    connection: navigator.connection?.effectiveType
  };
  
  // Store for analytics
  performanceMetrics.userInteractions.push(entry);
  if (performanceMetrics.userInteractions.length > 1000) {
    performanceMetrics.userInteractions.shift();
  }
  
  // Send to analytics endpoint in production
  if (import.meta.env.MODE === 'production') {
    // Debounce sending to prevent spam
    const sendMetrics = debounce(() => {
      navigator.sendBeacon?.('/api/performance-metrics', JSON.stringify(entry));
    }, 1000);
    sendMetrics();
  }
};

/**
 * Get resource size for performance tracking
 */
const getResourceSize = (element) => {
  if (element.tagName === 'IMG') {
    return element.naturalWidth * element.naturalHeight;
  }
  return 0;
};

/**
 * Get performance report
 */
export const getPerformanceReport = () => ({
  metrics: performanceMetrics,
  summary: {
    avgRenderTime: performanceMetrics.renderTimes.reduce((sum, t) => sum + t.duration, 0) / 
                   Math.max(1, performanceMetrics.renderTimes.length),
    longTaskCount: performanceMetrics.longTasks.length,
    memoryUsage: performanceMetrics.memorySnapshots.slice(-1)[0],
    userInteractions: performanceMetrics.userInteractions.length
  },
  config: PERF_CONFIG
});

/**
 * Clear performance data
 */
export const clearPerformanceData = () => {
  Object.keys(performanceMetrics).forEach(key => {
    performanceMetrics[key] = [];
  });
};

export default {
  // Core utilities
  debounce,
  throttle,
  memoize,
  
  // Resource management
  preloadResources,
  lazyLoadImages,
  
  // Performance monitoring
  initPerformanceMonitoring,
  measurePerformance,
  getPerformanceReport,
  clearPerformanceData,
  
  // React optimization
  batchUpdates,
  virtualizeList,
  
  // Advanced utilities
  createWorkerPool,
  
  // Configuration
  PERF_CONFIG
};
