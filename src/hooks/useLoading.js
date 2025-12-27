// src/hooks/useLoading.js
import { useState, useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";

/**
 * Enhanced loading hook for Assessly Platform
 * Features:
 * - Multiple loading states (idle, loading, success, error)
 * - Loading timeout protection
 * - Progress tracking
 * - Loading queue management
 * - Retry functionality
 * - Loading state persistence
 */

export const useLoading = (initialState = false, options = {}) => {
  const {
    timeout = 30000, // 30 seconds default timeout
    autoReset = false,
    autoResetDelay = 3000,
    maxRetries = 3,
    onTimeout = null,
    onError = null,
    onSuccess = null,
    onStateChange = null,
  } = options;

  // State management
  const [loadingState, setLoadingState] = useState({
    isLoading: initialState,
    status: initialState ? "loading" : "idle",
    progress: 0,
    message: "",
    error: null,
    retryCount: 0,
    startTime: null,
    elapsedTime: 0,
    data: null,
  });

  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const startTimeRef = useRef(null);

  // Update elapsed time while loading
  useEffect(() => {
    if (loadingState.isLoading && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        setLoadingState(prev => ({
          ...prev,
          elapsedTime: Date.now() - startTimeRef.current,
        }));
      }, 100);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [loadingState.isLoading]);

  // Handle timeout
  useEffect(() => {
    if (loadingState.isLoading && timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        const error = new Error(`Loading timeout after ${timeout / 1000} seconds`);
        
        setLoadingState(prev => ({
          ...prev,
          isLoading: false,
          status: "error",
          error: error.message,
        }));

        if (onTimeout) {
          onTimeout(error, loadingState);
        }

        if (onError) {
          onError(error);
        }
      }, timeout);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [loadingState.isLoading, timeout, onTimeout, onError, loadingState]);

  // Handle auto-reset
  useEffect(() => {
    if (autoReset && !loadingState.isLoading && loadingState.status !== "idle") {
      const resetTimer = setTimeout(() => {
        reset();
      }, autoResetDelay);

      return () => clearTimeout(resetTimer);
    }
  }, [loadingState.isLoading, loadingState.status, autoReset, autoResetDelay]);

  // Core methods
  const startLoading = useCallback((message = "", initialProgress = 0) => {
    startTimeRef.current = Date.now();
    
    setLoadingState({
      isLoading: true,
      status: "loading",
      progress: initialProgress,
      message,
      error: null,
      retryCount: 0,
      startTime: startTimeRef.current,
      elapsedTime: 0,
      data: null,
    });

    if (onStateChange) {
      onStateChange("loading", { message, progress: initialProgress });
    }
  }, [onStateChange]);

  const stopLoading = useCallback((status = "success", data = null, message = "") => {
    // Clear timeouts and intervals
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const finalState = {
      isLoading: false,
      status,
      progress: status === "success" ? 100 : loadingState.progress,
      message: message || (status === "success" ? "Operation completed successfully" : ""),
      error: status === "error" ? loadingState.error : null,
      retryCount: loadingState.retryCount,
      startTime: startTimeRef.current,
      elapsedTime: Date.now() - (startTimeRef.current || Date.now()),
      data,
    };

    setLoadingState(finalState);

    // Callbacks
    if (onStateChange) {
      onStateChange(status, finalState);
    }

    if (status === "success" && onSuccess) {
      onSuccess(data, finalState);
    }

    if (status === "error" && onError) {
      onError(loadingState.error, finalState);
    }

    startTimeRef.current = null;
  }, [loadingState.progress, loadingState.error, loadingState.retryCount, onStateChange, onSuccess, onError]);

  const setProgress = useCallback((progress, message = "") => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
      message: message || prev.message,
    }));

    if (onStateChange) {
      onStateChange("progress", { progress, message });
    }
  }, [onStateChange]);

  const setError = useCallback((error, retry = false) => {
    const errorMessage = error?.message || error || "An unknown error occurred";
    
    if (retry && loadingState.retryCount < maxRetries) {
      // Schedule retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, loadingState.retryCount), 10000);
      
      setLoadingState(prev => ({
        ...prev,
        status: "retrying",
        message: `Retrying... (${prev.retryCount + 1}/${maxRetries})`,
        retryCount: prev.retryCount + 1,
      }));

      retryTimeoutRef.current = setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          isLoading: true,
          status: "loading",
          error: null,
        }));
      }, delay);

      if (onStateChange) {
        onStateChange("retrying", { 
          error: errorMessage, 
          retryCount: loadingState.retryCount + 1,
          delay,
        });
      }
    } else {
      stopLoading("error", null, errorMessage);
    }
  }, [loadingState.retryCount, maxRetries, stopLoading, onStateChange]);

  const setSuccess = useCallback((data = null, message = "") => {
    stopLoading("success", data, message);
  }, [stopLoading]);

  const retry = useCallback((message = "Retrying...") => {
    if (loadingState.retryCount >= maxRetries) {
      setError("Maximum retry attempts reached", false);
      return;
    }

    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      status: "loading",
      message,
      error: null,
      retryCount: prev.retryCount + 1,
    }));

    if (onStateChange) {
      onStateChange("retrying", { 
        retryCount: loadingState.retryCount + 1,
        message,
      });
    }
  }, [loadingState.retryCount, maxRetries, setError, onStateChange]);

  const reset = useCallback(() => {
    // Clear all timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setLoadingState({
      isLoading: false,
      status: "idle",
      progress: 0,
      message: "",
      error: null,
      retryCount: 0,
      startTime: null,
      elapsedTime: 0,
      data: null,
    });

    startTimeRef.current = null;

    if (onStateChange) {
      onStateChange("idle", {});
    }
  }, [onStateChange]);

  const toggleLoading = useCallback(() => {
    if (loadingState.isLoading) {
      stopLoading();
    } else {
      startLoading();
    }
  }, [loadingState.isLoading, startLoading, stopLoading]);

  // Wrapper for async operations
  const withLoading = useCallback(async (asyncFn, loadingMessage = "", successMessage = "", errorMessage = "") => {
    startLoading(loadingMessage);
    
    try {
      const result = await asyncFn();
      setSuccess(result, successMessage || "Operation completed successfully");
      return result;
    } catch (error) {
      const message = errorMessage || error?.message || "Operation failed";
      setError(message, false);
      throw error;
    }
  }, [startLoading, setSuccess, setError]);

  // Wrapper with retry logic
  const withRetry = useCallback(async (asyncFn, options = {}) => {
    const {
      maxAttempts = maxRetries,
      retryDelay = 1000,
      onRetry = null,
      loadingMessage = "",
      successMessage = "",
      errorMessage = "",
    } = options;

    let attempts = 0;
    
    const attempt = async () => {
      attempts++;
      
      if (attempts === 1) {
        startLoading(loadingMessage);
      } else {
        setLoadingState(prev => ({
          ...prev,
          status: "retrying",
          message: `Retry attempt ${attempts}/${maxAttempts}`,
          retryCount: attempts - 1,
        }));

        if (onRetry) {
          onRetry(attempts - 1, maxAttempts);
        }
      }

      try {
        const result = await asyncFn();
        setSuccess(result, successMessage || `Completed after ${attempts} attempt(s)`);
        return result;
      } catch (error) {
        if (attempts < maxAttempts) {
          // Exponential backoff
          const delay = Math.min(retryDelay * Math.pow(2, attempts - 1), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attempt();
        } else {
          const finalMessage = errorMessage || `Failed after ${maxAttempts} attempts: ${error.message}`;
          setError(finalMessage, false);
          throw error;
        }
      }
    };

    return attempt();
  }, [startLoading, setSuccess, setError, maxRetries]);

  // Helper to wrap multiple loading operations
  const createLoadingQueue = useCallback((operations = []) => {
    const queue = {
      total: operations.length,
      completed: 0,
      results: [],
      errors: [],
    };

    const executeQueue = async () => {
      startLoading(`Processing ${operations.length} operations`, 0);
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const progress = ((i + 1) / operations.length) * 100;
        
        setProgress(progress, `Processing ${i + 1} of ${operations.length}`);
        
        try {
          const result = await operation();
          queue.results.push(result);
          queue.completed++;
        } catch (error) {
          queue.errors.push({
            operation: i,
            error: error.message,
          });
        }
      }

      if (queue.errors.length === 0) {
        setSuccess(queue.results, `Completed ${queue.completed} of ${queue.total} operations`);
      } else {
        setError(
          `${queue.errors.length} operations failed`,
          false
        );
      }

      return queue;
    };

    return executeQueue();
  }, [startLoading, setProgress, setSuccess, setError]);

  // Format elapsed time
  const formatElapsedTime = useCallback(() => {
    const seconds = Math.floor(loadingState.elapsedTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, [loadingState.elapsedTime]);

  // Check loading status
  const isIdle = useCallback(() => loadingState.status === "idle", [loadingState.status]);
  const isLoading = useCallback(() => loadingState.status === "loading", [loadingState.status]);
  const isSuccess = useCallback(() => loadingState.status === "success", [loadingState.status]);
  const isError = useCallback(() => loadingState.status === "error", [loadingState.status]);
  const isRetrying = useCallback(() => loadingState.status === "retrying", [loadingState.status]);

  // Get loading state as percentage (0-100)
  const getProgressPercentage = useCallback(() => loadingState.progress, [loadingState.progress]);

  // Get readable status
  const getStatusText = useCallback(() => {
    switch (loadingState.status) {
      case "idle": return "Ready";
      case "loading": return "Loading...";
      case "success": return "Completed";
      case "error": return "Error";
      case "retrying": return "Retrying...";
      default: return loadingState.status;
    }
  }, [loadingState.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  return {
    // State
    ...loadingState,
    
    // Core methods
    startLoading,
    stopLoading,
    toggleLoading,
    setProgress,
    setError,
    setSuccess,
    reset,
    retry,
    
    // Async wrappers
    withLoading,
    withRetry,
    createLoadingQueue,
    
    // Status checkers
    isIdle: isIdle(),
    isLoading: isLoading(),
    isSuccess: isSuccess(),
    isError: isError(),
    isRetrying: isRetrying(),
    
    // Utility methods
    formatElapsedTime,
    getProgressPercentage,
    getStatusText,
    
    // Raw state checkers (functions)
    checkIsIdle: () => loadingState.status === "idle",
    checkIsLoading: () => loadingState.status === "loading",
    checkIsSuccess: () => loadingState.status === "success",
    checkIsError: () => loadingState.status === "error",
    checkIsRetrying: () => loadingState.status === "retrying",
  };
};

// PropTypes for options
useLoading.optionsPropTypes = {
  timeout: PropTypes.number,
  autoReset: PropTypes.bool,
  autoResetDelay: PropTypes.number,
  maxRetries: PropTypes.number,
  onTimeout: PropTypes.func,
  onError: PropTypes.func,
  onSuccess: PropTypes.func,
  onStateChange: PropTypes.func,
};

useLoading.defaultOptions = {
  timeout: 30000,
  autoReset: false,
  autoResetDelay: 3000,
  maxRetries: 3,
  onTimeout: null,
  onError: null,
  onSuccess: null,
  onStateChange: null,
};

/**
 * Higher-order hook for component-specific loading states
 */
export const createUseLoading = (componentName, defaultOptions = {}) => {
  return (initialState = false, options = {}) => {
    const mergedOptions = { ...useLoading.defaultOptions, ...defaultOptions, ...options };
    
    const loadingHook = useLoading(initialState, {
      ...mergedOptions,
      onStateChange: (status, data) => {
        console.debug(`[${componentName}] Loading state changed:`, status, data);
        if (mergedOptions.onStateChange) {
          mergedOptions.onStateChange(status, data);
        }
      },
    });

    return loadingHook;
  };
};

/**
 * Hook for managing multiple loading states
 */
export const useMultiLoading = (loadingStates = {}) => {
  const [states, setStates] = useState(loadingStates);
  
  const updateState = useCallback((key, updates) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  }, []);

  const startLoading = useCallback((key, message = "") => {
    updateState(key, {
      isLoading: true,
      status: "loading",
      message,
      error: null,
      startTime: Date.now(),
    });
  }, [updateState]);

  const stopLoading = useCallback((key, status = "success", data = null, message = "") => {
    updateState(key, {
      isLoading: false,
      status,
      data,
      message,
      elapsedTime: Date.now() - (states[key]?.startTime || Date.now()),
    });
  }, [updateState, states]);

  const setError = useCallback((key, error) => {
    updateState(key, {
      isLoading: false,
      status: "error",
      error: error?.message || error,
    });
  }, [updateState]);

  const getLoadingCount = useCallback(() => {
    return Object.values(states).filter(state => state.isLoading).length;
  }, [states]);

  const isAnyLoading = useCallback(() => {
    return getLoadingCount() > 0;
  }, [getLoadingCount]);

  const areAllLoading = useCallback(() => {
    return Object.values(states).every(state => state.isLoading);
  }, [states]);

  const resetAll = useCallback(() => {
    setStates(loadingStates);
  }, [loadingStates]);

  return {
    states,
    updateState,
    startLoading,
    stopLoading,
    setError,
    getLoadingCount,
    isAnyLoading,
    areAllLoading,
    resetAll,
  };
};

export default useLoading;
