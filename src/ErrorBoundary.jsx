// src/ErrorBoundary.jsx
import React, { useState, useEffect, useRef, useCallback, createContext, useContext, memo } from 'react';
import PropTypes from 'prop-types';
import {
  Box, 
  Typography, 
  Button, 
  Container, 
  Paper, 
  Alert, 
  Stack, 
  Divider,
  CircularProgress,
  Chip, 
  Link, 
  alpha, 
  Collapse, 
  Tooltip, 
  Fade, 
  Zoom, 
  useTheme
} from '@mui/material';
import {
  Refresh, 
  Home, 
  ContentCopy, 
  ExpandMore, 
  ExpandLess, 
  BugReport,
  AutoFixHigh, 
  ErrorOutline, 
  CheckCircle, 
  Warning, 
  Info, 
  Send, 
  SupportAgent
} from '@mui/icons-material';

// ===================== CONSTANTS =====================
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  CHUNK: 'chunk',
  SYNTAX: 'syntax',
  RUNTIME: 'runtime',
  INTEGRATION: 'integration',
  UNKNOWN: 'unknown',
};

export const RECOVERY_STRATEGIES = {
  RELOAD: 'reload',
  RESET_STATE: 'reset_state',
  CLEAR_CACHE: 'clear_cache',
  FALLBACK: 'fallback',
};

// ===================== UTILITIES =====================
export const generateErrorId = () => `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const getStorageKey = (key) => `assessly_${key}`;

const getUserInfo = () => {
  try {
    const userData = localStorage.getItem(getStorageKey('user'));
    const orgData = localStorage.getItem(getStorageKey('organization'));
    return {
      user: userData ? JSON.parse(userData) : null,
      organization: orgData ? JSON.parse(orgData) : null,
    };
  } catch {
    return null;
  }
};

const getBrowserInfo = () => {
  try {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${window.screen.width}x${window.screen.height}`,
      online: navigator.onLine,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookies: navigator.cookieEnabled,
    };
  } catch {
    return { error: 'Failed to get browser info' };
  }
};

export const categorizeError = (error) => {
  if (!error) return ERROR_CATEGORIES.UNKNOWN;
  
  const errorName = error.name || '';
  const errorMessage = String(error.message || '').toLowerCase();

  if (errorName.includes('ChunkLoad') || errorMessage.includes('chunk') || errorMessage.includes('loading chunk')) {
    return ERROR_CATEGORIES.CHUNK;
  }
  
  if (errorName.includes('Network') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return ERROR_CATEGORIES.NETWORK;
  }
  
  if (errorName.includes('Syntax') || errorMessage.includes('unexpected token')) {
    return ERROR_CATEGORIES.SYNTAX;
  }
  
  if (errorMessage.includes('api') || errorMessage.includes('cors') || errorMessage.includes('auth')) {
    return ERROR_CATEGORIES.INTEGRATION;
  }
  
  if (errorName.includes('TypeError') || errorName.includes('ReferenceError')) {
    return ERROR_CATEGORIES.RUNTIME;
  }
  
  return ERROR_CATEGORIES.UNKNOWN;
};

export const isRecoverableError = (error) => {
  const category = categorizeError(error);
  return [
    ERROR_CATEGORIES.NETWORK, 
    ERROR_CATEGORIES.CHUNK, 
    ERROR_CATEGORIES.INTEGRATION
  ].includes(category);
};

export const getRecoveryStrategy = (error) => {
  const category = categorizeError(error);
  switch (category) {
    case ERROR_CATEGORIES.CHUNK:
      return RECOVERY_STRATEGIES.CLEAR_CACHE;
    case ERROR_CATEGORIES.NETWORK:
      return RECOVERY_STRATEGIES.RELOAD;
    case ERROR_CATEGORIES.INTEGRATION:
      return RECOVERY_STRATEGIES.RESET_STATE;
    default:
      return RECOVERY_STRATEGIES.FALLBACK;
  }
};

export const formatErrorDetails = (error, errorInfo, errorId) => {
  const userInfo = getUserInfo();
  const browserInfo = getBrowserInfo();
  
  return `
===== ASSESSLY ERROR REPORT =====
Error ID: ${errorId}
Timestamp: ${new Date().toISOString()}
Environment: ${import.meta.env.MODE || 'unknown'}
URL: ${window.location.href}

Error: ${error?.name || 'Unknown'} - ${error?.message || 'No message'}
Category: ${categorizeError(error)}

User: ${userInfo?.user?.id || 'Not authenticated'}
Organization: ${userInfo?.organization?.id || 'None'}

Browser: ${browserInfo.userAgent || 'Unknown'}
Screen: ${browserInfo.screen || 'Unknown'}
Online: ${browserInfo.online ? 'Yes' : 'No'}

Stack Trace:
${error?.stack || 'No stack trace'}

Component Stack:
${errorInfo?.componentStack || 'No component stack'}
`.trim();
};

// ===================== ERROR REPORTING =====================
const reportErrorToService = async (errorPayload) => {
  try {
    // Try to report to backend
    await fetch('/api/v1/errors/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorPayload),
    });
  } catch (err) {
    // Fallback to localStorage
    try {
      const offlineErrors = JSON.parse(localStorage.getItem('assessly_offline_errors') || '[]');
      offlineErrors.push({
        ...errorPayload,
        storedAt: new Date().toISOString(),
      });
      localStorage.setItem('assessly_offline_errors', JSON.stringify(offlineErrors.slice(-50)));
    } catch (storageErr) {
      console.warn('Failed to store error offline:', storageErr);
    }
  }
};

const useErrorReporting = (errorId, error, errorInfo, userId, organizationId) => {
  const hasReportedRef = useRef(false);

  useEffect(() => {
    if (hasReportedRef.current || !error) return;
    hasReportedRef.current = true;

    const report = async () => {
      const payload = {
        id: errorId,
        timestamp: new Date().toISOString(),
        environment: import.meta.env.MODE,
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        category: categorizeError(error),
        url: window.location.href,
        userId: userId || getUserInfo()?.user?.id,
        organizationId: organizationId || getUserInfo()?.organization?.id,
        browserInfo: getBrowserInfo(),
      };

      // Development logging
      if (import.meta.env.DEV) {
        console.group('🚨 Error Details');
        console.error('Error:', error);
        console.error('Category:', categorizeError(error));
        console.error('Payload:', payload);
        console.groupEnd();
      }

      // Report to service
      await reportErrorToService(payload);

      // Track in analytics if available
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          category: categorizeError(error),
        });
      }
    };

    report();
  }, [errorId, error, errorInfo, userId, organizationId]);
};

// ===================== COMPONENTS =====================
const ErrorIcon = memo(({ category, size = 80 }) => {
  const theme = useTheme();
  const color = category === ERROR_CATEGORIES.NETWORK ? theme.palette.warning.main : theme.palette.error.main;

  return (
    <Box sx={{ position: 'relative' }}>
      <ErrorOutline sx={{ fontSize: size, color }} />
      {category === ERROR_CATEGORIES.NETWORK && (
        <Warning sx={{
          position: 'absolute', 
          top: '50%', 
          left: '50%',
          transform: 'translate(-50%, -50%)', 
          fontSize: size * 0.4, 
          color: theme.palette.warning.contrastText
        }} />
      )}
    </Box>
  );
});

ErrorIcon.displayName = 'ErrorIcon';

const ErrorDisplay = memo(({
  error, 
  errorInfo, 
  errorId, 
  recoveryAttempts, 
  isRecovering, 
  copySuccess, 
  showDetails,
  onReload, 
  onGoHome, 
  onReset, 
  onToggleDetails, 
  onCopyErrorDetails, 
  onCreateSupportTicket,
  enableRecovery, 
  customMessage, 
  alwaysShowDetails, 
  showSupportOptions, 
  errorCategory, 
  recoveryStrategy
}) => {
  const theme = useTheme();
  const showTechDetails = import.meta.env.DEV || alwaysShowDetails;

  if (isRecovering) {
    return (
      <Fade in={isRecovering}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          gap: 2, 
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
        }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6">Attempting to recover...</Typography>
          <Typography variant="body2" color="text.secondary">
            Strategy: {recoveryStrategy.replace('_', ' ').toUpperCase()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Attempt {recoveryAttempts + 1} of 3
          </Typography>
        </Box>
      </Fade>
    );
  }

  const getErrorTitle = () => {
    switch (errorCategory) {
      case ERROR_CATEGORIES.NETWORK: return 'Network Connection Issue';
      case ERROR_CATEGORIES.CHUNK: return 'Application Loading Issue';
      case ERROR_CATEGORIES.SYNTAX: return 'Application Syntax Error';
      case ERROR_CATEGORIES.INTEGRATION: return 'Service Integration Error';
      default: return 'Something went wrong';
    }
  };

  const getErrorMessage = () => {
    if (customMessage) return customMessage;
    
    switch (errorCategory) {
      case ERROR_CATEGORIES.NETWORK:
        return 'We encountered a network issue. Please check your connection and try again.';
      case ERROR_CATEGORIES.CHUNK:
        return 'There was a problem loading the application. This is usually temporary.';
      case ERROR_CATEGORIES.INTEGRATION:
        return 'A service integration failed. This might be a temporary service issue.';
      default:
        return "We've encountered an unexpected issue. Our team has been notified.";
    }
  };

  const handleCopy = useCallback(async () => {
    const details = formatErrorDetails(error, errorInfo, errorId);
    await onCopyErrorDetails(details);
  }, [error, errorInfo, errorId, onCopyErrorDetails]);

  return (
    <Zoom in>
      <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
        <Paper sx={{ 
          p: 4, 
          textAlign: 'center', 
          borderRadius: 2,
          borderLeft: '4px solid',
          borderColor: errorCategory === ERROR_CATEGORIES.NETWORK ? 'warning.main' : 'error.main',
          boxShadow: 3,
        }}>
          {/* Error ID */}
          <Chip 
            icon={<BugReport />} 
            label={`Error ID: ${errorId}`} 
            color={errorCategory === ERROR_CATEGORIES.NETWORK ? "warning" : "error"} 
            size="small" 
            sx={{ mb: 3 }}
          />
          
          {/* Error Icon */}
          <ErrorIcon category={errorCategory} size={60} />
          
          {/* Title */}
          <Typography variant="h5" color="text.primary" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
            {getErrorTitle()}
          </Typography>
          
          {/* Message */}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {getErrorMessage()}
          </Typography>

          {/* Recovery attempts notice */}
          {recoveryAttempts > 0 && (
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              Recovery attempted {recoveryAttempts} time{recoveryAttempts > 1 ? 's' : ''}
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" mb={4}>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<Refresh />} 
              onClick={onReload}
              size="medium"
              sx={{ minWidth: 140 }}
            >
              Reload Page
            </Button>
            
            <Button 
              variant="outlined" 
              color="primary"
              startIcon={<Home />} 
              onClick={onGoHome}
              size="medium"
              sx={{ minWidth: 140 }}
            >
              Go to Home
            </Button>
            
            {enableRecovery && isRecoverableError(error) && (
              <Button 
                variant="text" 
                color="primary"
                startIcon={<AutoFixHigh />} 
                onClick={onReset}
                size="medium"
                sx={{ minWidth: 140 }}
              >
                Try Again
              </Button>
            )}
          </Stack>

          {/* Support Options */}
          {showSupportOptions && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Need additional help?
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                <Tooltip title={copySuccess ? "Copied!" : "Copy error details"}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={copySuccess ? <CheckCircle color="success" /> : <ContentCopy />}
                    onClick={handleCopy}
                  >
                    {copySuccess ? "Copied!" : "Copy Details"}
                  </Button>
                </Tooltip>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SupportAgent />}
                  onClick={onCreateSupportTicket}
                >
                  Support
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Send />}
                  component="a"
                  href={`mailto:assesslyinc@gmail.com?subject=Error Report ${errorId}`}
                  target="_blank"
                >
                  Email
                </Button>
              </Stack>
            </Box>
          )}

          {/* Technical Details */}
          {showTechDetails && (
            <Box sx={{ mt: 3 }}>
              <Button
                size="small"
                variant="outlined"
                endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                onClick={onToggleDetails}
                sx={{ mb: 1 }}
              >
                {showDetails ? "Hide Details" : "Technical Details"}
              </Button>
              
              <Collapse in={showDetails}>
                <Alert severity="info" sx={{ textAlign: 'left', mt: 1 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Technical Information
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 200,
                      overflow: 'auto',
                      backgroundColor: 'grey.50',
                      p: 2,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    {formatErrorDetails(error, errorInfo, errorId)}
                  </Box>
                </Alert>
              </Collapse>
            </Box>
          )}
        </Paper>
      </Container>
    </Zoom>
  );
});

ErrorDisplay.displayName = 'ErrorDisplay';

ErrorDisplay.propTypes = {
  error: PropTypes.instanceOf(Error),
  errorInfo: PropTypes.object,
  errorId: PropTypes.string.isRequired,
  recoveryAttempts: PropTypes.number,
  isRecovering: PropTypes.bool,
  copySuccess: PropTypes.bool,
  showDetails: PropTypes.bool,
  onReload: PropTypes.func.isRequired,
  onGoHome: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onToggleDetails: PropTypes.func.isRequired,
  onCopyErrorDetails: PropTypes.func.isRequired,
  onCreateSupportTicket: PropTypes.func.isRequired,
  enableRecovery: PropTypes.bool,
  customMessage: PropTypes.string,
  alwaysShowDetails: PropTypes.bool,
  showSupportOptions: PropTypes.bool,
  errorCategory: PropTypes.string,
  recoveryStrategy: PropTypes.string,
};

// ===================== MAIN ERROR BOUNDARY =====================
const ErrorBoundary = ({
  children,
  userId,
  organizationId,
  enableRecovery = true,
  customMessage,
  alwaysShowDetails = import.meta.env.DEV,
  showSupportOptions = true,
  fallback,
  onError
}) => {
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [errorId, setErrorId] = useState(generateErrorId());
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorCategory, setErrorCategory] = useState(ERROR_CATEGORIES.UNKNOWN);
  const [recoveryStrategy, setRecoveryStrategy] = useState(RECOVERY_STRATEGIES.FALLBACK);
  const [showDetails, setShowDetails] = useState(false);

  // Error reporting
  useErrorReporting(errorId, error, errorInfo, userId, organizationId);

  // Handle errors
  useEffect(() => {
    const handleError = (event) => {
      if (!error && event.error) {
        const err = event.error;
        const category = categorizeError(err);
        const strategy = getRecoveryStrategy(err);
        
        setError(err);
        setErrorCategory(category);
        setRecoveryStrategy(strategy);
        setErrorId(generateErrorId());
        
        // Call custom error handler
        if (onError) {
          onError(err, { category, strategy, timestamp: new Date().toISOString() });
        }
        
        // Attempt recovery for recoverable errors
        if (isRecoverableError(err)) {
          attemptRecovery();
        }
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [error, onError]);

  // Attempt recovery
  const attemptRecovery = useCallback(() => {
    if (recoveryAttempts < 2) { // Max 2 attempts
      setIsRecovering(true);
      setTimeout(() => {
        setRecoveryAttempts(prev => prev + 1);
        setIsRecovering(false);
        
        if (recoveryAttempts === 0) {
          executeRecoveryStrategy();
        }
      }, 1500 * (recoveryAttempts + 1));
    }
  }, [recoveryAttempts]);

  // Execute recovery strategy
  const executeRecoveryStrategy = useCallback(() => {
    switch (recoveryStrategy) {
      case RECOVERY_STRATEGIES.CLEAR_CACHE:
        clearCache();
        break;
      case RECOVERY_STRATEGIES.RESET_STATE:
        resetState();
        break;
      default:
        // Do nothing, let user reload
        break;
    }
  }, [recoveryStrategy]);

  // Clear cache for chunk errors
  const clearCache = useCallback(() => {
    try {
      // Clear problematic cache keys
      Object.keys(localStorage).forEach(key => {
        if (key.includes('chunk') || key.includes('module')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear service worker cache
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => caches.delete(cacheName));
        });
      }
    } catch (err) {
      console.warn('Cache clearing failed:', err);
    }
  }, []);

  // Reset state for integration errors
  const resetState = useCallback(() => {
    try {
      // Clear authentication state
      localStorage.removeItem(getStorageKey('token'));
      localStorage.removeItem(getStorageKey('user'));
    } catch (err) {
      console.warn('State reset failed:', err);
    }
  }, []);

  // Reset error boundary
  const handleReset = useCallback(() => {
    setError(null);
    setErrorInfo(null);
    setErrorId(generateErrorId());
    setRecoveryAttempts(0);
    setIsRecovering(false);
    setCopySuccess(false);
    setErrorCategory(ERROR_CATEGORIES.UNKNOWN);
    setRecoveryStrategy(RECOVERY_STRATEGIES.FALLBACK);
    setShowDetails(false);
  }, []);

  // Copy error details
  const handleCopyErrorDetails = useCallback(async (details) => {
    try {
      await navigator.clipboard.writeText(details);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = details;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  }, []);

  // Create support ticket
  const handleCreateSupportTicket = useCallback(() => {
    const supportUrl = `https://support.assessly.com/new?error=${errorId}`;
    window.open(supportUrl, '_blank', 'noopener,noreferrer');
  }, [errorId]);

  // Handle component errors
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      
      // Check for React errors
      const errorStr = args.join(' ').toLowerCase();
      if (errorStr.includes('error boundary') || errorStr.includes('react error')) {
        const syntheticError = new Error('React component error');
        setError(syntheticError);
        setErrorCategory(ERROR_CATEGORIES.RUNTIME);
      }
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // If we have an error, show error display
  if (error) {
    if (fallback) {
      return typeof fallback === 'function' 
        ? fallback(error, errorInfo, errorId) 
        : fallback;
    }

    return (
      <ErrorDisplay
        error={error}
        errorInfo={errorInfo}
        errorId={errorId}
        recoveryAttempts={recoveryAttempts}
        isRecovering={isRecovering}
        copySuccess={copySuccess}
        showDetails={showDetails}
        onReload={() => window.location.reload()}
        onGoHome={() => window.location.href = '/'}
        onReset={handleReset}
        onToggleDetails={() => setShowDetails(prev => !prev)}
        onCopyErrorDetails={handleCopyErrorDetails}
        onCreateSupportTicket={handleCreateSupportTicket}
        enableRecovery={enableRecovery && isRecoverableError(error)}
        customMessage={customMessage}
        alwaysShowDetails={alwaysShowDetails}
        showSupportOptions={showSupportOptions}
        errorCategory={errorCategory}
        recoveryStrategy={recoveryStrategy}
      />
    );
  }

  // Otherwise, render children
  return children;
};

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  userId: PropTypes.string,
  organizationId: PropTypes.string,
  enableRecovery: PropTypes.bool,
  customMessage: PropTypes.string,
  alwaysShowDetails: PropTypes.bool,
  showSupportOptions: PropTypes.bool,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  onError: PropTypes.func,
};

ErrorBoundary.defaultProps = {
  enableRecovery: true,
  alwaysShowDetails: import.meta.env.DEV,
  showSupportOptions: true,
};

// ===================== EXPORT UTILITIES =====================
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const ComponentWithErrorBoundary = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return ComponentWithErrorBoundary;
};

export const ErrorContext = createContext({
  reportError: () => {},
  clearError: () => {},
});

export const useErrorHandler = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  return context;
};

export default ErrorBoundary;
