// src/ErrorBoundary.jsx
import React, { Component, useEffect, useRef, useState, useCallback, memo } from 'react';
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
  ThemeProvider,
  useTheme,
  Collapse,
  IconButton,
  Tooltip,
  Fade,
  Zoom,
} from '@mui/material';
import { 
  Refresh, 
  Home, 
  ContentCopy, 
  ExpandMore, 
  ExpandLess,
  BugReport,
  Report,
  SupportAgent,
  AutoFixHigh,
  ErrorOutline,
  Close,
  CheckCircle,
  Warning,
  Info,
  Send,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

// ===================== CONSTANTS =====================
const ERROR_CATEGORIES = {
  NETWORK: 'network',
  CHUNK: 'chunk',
  SYNTAX: 'syntax',
  RUNTIME: 'runtime',
  INTEGRATION: 'integration',
  UNKNOWN: 'unknown',
};

const RECOVERY_STRATEGIES = {
  RELOAD: 'reload',
  RESET_STATE: 'reset_state',
  CLEAR_CACHE: 'clear_cache',
  FALLBACK: 'fallback',
};

// ===================== UTILITIES =====================
const generateErrorId = () => `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const getStorageKey = (key) => {
  const prefix = 'assessly';
  return `${prefix}_${key}`;
};

const getUserInfo = () => {
  try {
    const userData = localStorage.getItem(getStorageKey('user'));
    const orgData = localStorage.getItem(getStorageKey('organization'));
    
    return {
      user: userData ? JSON.parse(userData) : null,
      organization: orgData ? JSON.parse(orgData) : null,
    };
  } catch (error) {
    console.warn('Failed to load user info for error reporting:', error);
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
      jsEnabled: true,
    };
  } catch (error) {
    return { error: 'Failed to get browser info' };
  }
};

const categorizeError = (error) => {
  if (!error) return ERROR_CATEGORIES.UNKNOWN;

  const errorName = error.name || '';
  const errorMessage = error.message || '';
  const errorStack = error.stack || '';

  // Network errors
  if (
    errorName.includes('Network') ||
    errorMessage.includes('Network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('offline')
  ) {
    return ERROR_CATEGORIES.NETWORK;
  }

  // Chunk loading errors (common in code splitting)
  if (
    errorName.includes('ChunkLoad') ||
    errorMessage.includes('chunk') ||
    errorMessage.includes('loading chunk') ||
    errorMessage.includes('dynamic import')
  ) {
    return ERROR_CATEGORIES.CHUNK;
  }

  // Syntax errors
  if (
    errorName.includes('Syntax') ||
    errorMessage.includes('Unexpected token') ||
    errorMessage.includes('Invalid or unexpected token')
  ) {
    return ERROR_CATEGORIES.SYNTAX;
  }

  // Integration errors (API, third-party services)
  if (
    errorMessage.includes('API') ||
    errorMessage.includes('CORS') ||
    errorMessage.includes('auth') ||
    errorMessage.includes('token')
  ) {
    return ERROR_CATEGORIES.INTEGRATION;
  }

  // Runtime errors
  if (
    errorName.includes('TypeError') ||
    errorName.includes('ReferenceError') ||
    errorName.includes('RangeError')
  ) {
    return ERROR_CATEGORIES.RUNTIME;
  }

  return ERROR_CATEGORIES.UNKNOWN;
};

const isRecoverableError = (error) => {
  const category = categorizeError(error);
  
  const recoverableCategories = [
    ERROR_CATEGORIES.NETWORK,
    ERROR_CATEGORIES.CHUNK,
    ERROR_CATEGORIES.INTEGRATION,
  ];

  return recoverableCategories.includes(category);
};

const getRecoveryStrategy = (error) => {
  const category = categorizeError(error);
  
  switch (category) {
    case ERROR_CATEGORIES.NETWORK:
      return RECOVERY_STRATEGIES.RELOAD;
    case ERROR_CATEGORIES.CHUNK:
      return RECOVERY_STRATEGIES.CLEAR_CACHE;
    case ERROR_CATEGORIES.INTEGRATION:
      return RECOVERY_STRATEGIES.RESET_STATE;
    default:
      return RECOVERY_STRATEGIES.FALLBACK;
  }
};

const formatErrorDetails = (error, errorInfo, errorId) => {
  const userInfo = getUserInfo();
  const browserInfo = getBrowserInfo();
  
  return `
====== ASSESSLY ERROR REPORT ======
Error ID: ${errorId}
Category: ${categorizeError(error)}
Timestamp: ${new Date().toISOString()}
Environment: ${import.meta.env.MODE || 'unknown'}
App Version: ${import.meta.env.VITE_APP_VERSION || 'unknown'}
URL: ${window.location.href}
Path: ${window.location.pathname}
Hash: ${window.location.hash}
Search: ${window.location.search}

----- USER INFORMATION -----
User ID: ${userInfo?.user?.id || 'Not authenticated'}
User Email: ${userInfo?.user?.email || 'Not available'}
User Role: ${userInfo?.user?.role || 'Unknown'}
Organization: ${userInfo?.organization?.name || 'None'}
Organization ID: ${userInfo?.organization?.id || 'None'}

----- ERROR DETAILS -----
Name: ${error?.name || 'Unknown'}
Message: ${error?.message || 'No message'}
Type: ${categorizeError(error)}
Code: ${error?.code || error?.status || 'N/A'}

----- STACK TRACE -----
${error?.stack || 'No stack trace available'}

----- COMPONENT STACK -----
${errorInfo?.componentStack || 'No component stack'}

----- BROWSER INFORMATION -----
User Agent: ${browserInfo.userAgent || 'Unknown'}
Language: ${browserInfo.language || 'Unknown'}
Platform: ${browserInfo.platform || 'Unknown'}
Screen: ${browserInfo.screen || 'Unknown'}
Online: ${browserInfo.online ? 'Yes' : 'No'}
Timezone: ${browserInfo.timezone || 'Unknown'}
Cookies: ${browserInfo.cookies ? 'Enabled' : 'Disabled'}

----- PERFORMANCE METRICS -----
Memory: ${performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB used` : 'N/A'}
Load Time: ${performance.timing ? `${performance.timing.loadEventEnd - performance.timing.navigationStart}ms` : 'N/A'}
DOM Ready: ${performance.timing ? `${performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart}ms` : 'N/A'}
  `.trim();
};

// ===================== HOOKS =====================
const useErrorReporting = (errorId, error, errorInfo, userId, organizationId) => {
  const hasReportedRef = useRef(false);

  useEffect(() => {
    if (hasReportedRef.current || !error) return;
    
    const reportError = async () => {
      hasReportedRef.current = true;
      
      const errorPayload = {
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
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        userId: userId || getUserInfo()?.user?.id,
        organizationId: organizationId || getUserInfo()?.organization?.id,
        browserInfo: getBrowserInfo(),
      };

      // Console logging
      if (import.meta.env.DEV) {
        console.group('🚨 ErrorBoundary - Detailed Error Information');
        console.error('Error Object:', error);
        console.error('Error Info:', errorInfo);
        console.error('Error Category:', categorizeError(error));
        console.error('Error Payload:', errorPayload);
        console.groupEnd();
      } else {
        console.error('🚨 Application Error:', {
          id: errorId,
          category: categorizeError(error),
          message: error.message,
          url: window.location.href,
        });
      }

      // Send to error tracking service
      await sendToErrorService(errorPayload);

      // Track in analytics
      trackErrorInAnalytics(errorPayload);
    };

    reportError();
  }, [errorId, error, errorInfo, userId, organizationId]);
};

const sendToErrorService = async (errorPayload) => {
  try {
    let token = null;
    try {
      token = localStorage.getItem(getStorageKey('token'));
    } catch (storageError) {
      console.warn('Failed to access localStorage:', storageError);
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Error-ID': errorPayload.id,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/v1/errors/log', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...errorPayload,
        source: 'error_boundary',
        recovery_suggested: isRecoverableError({ name: errorPayload.name, message: errorPayload.message }),
      }),
    });

    if (!response.ok) {
      console.warn('Error tracking service responded with:', response.status);
    }
  } catch (error) {
    console.warn('Error tracking service unavailable:', error);
    // Fallback to localStorage for offline tracking
    storeErrorOffline(errorPayload);
  }
};

const storeErrorOffline = (errorPayload) => {
  try {
    const offlineErrors = JSON.parse(localStorage.getItem(getStorageKey('offline_errors')) || '[]');
    offlineErrors.push({
      ...errorPayload,
      storedAt: new Date().toISOString(),
    });
    
    // Keep only last 50 errors
    const limitedErrors = offlineErrors.slice(-50);
    localStorage.setItem(getStorageKey('offline_errors'), JSON.stringify(limitedErrors));
  } catch (error) {
    console.warn('Failed to store error offline:', error);
  }
};

const trackErrorInAnalytics = (errorPayload) => {
  if (window.gtag) {
    window.gtag('event', 'exception', {
      description: errorPayload.message,
      fatal: true,
      category: errorPayload.category,
    });
  }
  
  if (window.trackError && typeof window.trackError === 'function') {
    window.trackError({
      message: errorPayload.message,
      category: errorPayload.category,
      id: errorPayload.id,
    }, {
      component: 'ErrorBoundary',
      severity: 'high',
    });
  }
};

// ===================== COMPONENTS =====================
const ErrorIcon = memo(({ category, size = 80 }) => {
  const theme = useTheme();
  
  const getIconColor = () => {
    switch (category) {
      case ERROR_CATEGORIES.NETWORK:
        return theme.palette.warning.main;
      case ERROR_CATEGORIES.CHUNK:
        return theme.palette.info.main;
      default:
        return theme.palette.error.main;
    }
  };

  const getIconAnimation = () => {
    switch (category) {
      case ERROR_CATEGORIES.NETWORK:
        return 'pulse 2s infinite';
      default:
        return 'none';
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <ErrorOutline 
        sx={{ 
          fontSize: size, 
          color: getIconColor(),
          animation: getIconAnimation(),
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.6 },
          }
        }} 
        aria-hidden="true"
      />
      {category === ERROR_CATEGORIES.NETWORK && (
        <Warning
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: size * 0.4,
            color: theme.palette.warning.contrastText,
          }}
        />
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
  recoveryStrategy,
}) => {
  const theme = useTheme();
  const isDev = import.meta.env.DEV;
  const showTechDetails = isDev || alwaysShowDetails;

  const [localCopySuccess, setLocalCopySuccess] = useState(copySuccess);
  
  useEffect(() => {
    setLocalCopySuccess(copySuccess);
  }, [copySuccess]);

  const handleCopy = useCallback(async () => {
    const details = formatErrorDetails(error, errorInfo, errorId);
    await onCopyErrorDetails(details);
  }, [error, errorInfo, errorId, onCopyErrorDetails]);

  if (isRecovering) {
    return (
      <Fade in={isRecovering}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
          p: 3,
        }}>
          <CircularProgress 
            size={60} 
            thickness={4} 
            aria-label="Recovering application"
          />
          <Typography variant="h6" color="text.secondary" align="center">
            Attempting to recover application...
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Strategy: {recoveryStrategy.replace('_', ' ').toUpperCase()}
          </Typography>
          <Typography variant="caption" color="text.secondary" align="center">
            Attempt {recoveryAttempts + 1} of 3
          </Typography>
        </Box>
      </Fade>
    );
  }

  const getErrorTitle = () => {
    switch (errorCategory) {
      case ERROR_CATEGORIES.NETWORK:
        return 'Network Connection Issue';
      case ERROR_CATEGORIES.CHUNK:
        return 'Application Loading Issue';
      case ERROR_CATEGORIES.SYNTAX:
        return 'Application Syntax Error';
      case ERROR_CATEGORIES.INTEGRATION:
        return 'Service Integration Error';
      default:
        return 'Something went wrong';
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
        return "We've encountered an unexpected issue. Our team has been notified and we're working to fix it.";
    }
  };

  return (
    <Zoom in={!isRecovering} style={{ transitionDelay: '100ms' }}>
      <Container maxWidth="md" sx={{ mt: 8, mb: 8 }} role="alert" aria-live="assertive">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 3,
            borderLeft: '6px solid',
            borderColor: errorCategory === ERROR_CATEGORIES.NETWORK ? 'warning.main' : 'error.main',
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
          }}
        >
          {/* Error ID Badge */}
          <Chip
            icon={<BugReport />}
            label={`Error ID: ${errorId}`}
            color={errorCategory === ERROR_CATEGORIES.NETWORK ? "warning" : "error"}
            size="small"
            sx={{ 
              mb: 3,
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
            }}
          />

          {/* Category Badge */}
          <Chip
            label={errorCategory.toUpperCase()}
            size="small"
            variant="outlined"
            sx={{ 
              mb: 2,
              mx: 1,
              fontSize: '0.7rem',
              letterSpacing: '0.5px',
            }}
          />

          <ErrorIcon category={errorCategory} size={80} />
          
          <Typography variant="h4" color={errorCategory === ERROR_CATEGORIES.NETWORK ? "warning.main" : "error"} fontWeight={600} gutterBottom>
            {getErrorTitle()}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
            {getErrorMessage()}
          </Typography>

          {recoveryAttempts > 0 && (
            <Alert 
              severity="info" 
              sx={{ mb: 3, textAlign: 'left' }}
              icon={<AutoFixHigh />}
            >
              <Typography variant="body2">
                Recovery attempted {recoveryAttempts} time{recoveryAttempts > 1 ? 's' : ''} using {recoveryStrategy.replace('_', ' ')} strategy.
              </Typography>
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" mb={4}>
            <Button 
              variant="contained" 
              color={errorCategory === ERROR_CATEGORIES.NETWORK ? "warning" : "primary"}
              startIcon={<Refresh />} 
              onClick={onReload}
              size="large"
              sx={{ minWidth: 180 }}
              aria-label="Reload page"
            >
              Reload Page
            </Button>
            
            <Button 
              variant="outlined" 
              startIcon={<Home />} 
              onClick={onGoHome}
              size="large"
              sx={{ minWidth: 180 }}
              aria-label="Go to homepage"
            >
              Go to Homepage
            </Button>
            
            {enableRecovery && isRecoverableError(error) && (
              <Button 
                variant="text" 
                onClick={onReset}
                size="large"
                sx={{ minWidth: 180 }}
                aria-label="Try again"
                startIcon={<AutoFixHigh />}
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
              <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                <Tooltip title={localCopySuccess ? "Copied to clipboard!" : "Copy error details"}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={localCopySuccess ? <CheckCircle /> : <ContentCopy />}
                    onClick={handleCopy}
                    color={localCopySuccess ? "success" : "primary"}
                    aria-label={localCopySuccess ? "Error details copied" : "Copy error details"}
                  >
                    {localCopySuccess ? "Copied!" : "Copy Details"}
                  </Button>
                </Tooltip>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SupportAgent />}
                  onClick={onCreateSupportTicket}
                  aria-label="Create support ticket"
                >
                  Support Ticket
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Send />}
                  component="a"
                  href={`mailto:assesslyinc@gmail.com?subject=Error Report ${errorId}&body=Error ID: ${errorId}%0D%0A%0D%0APlease describe what you were doing when the error occurred:`}
                  aria-label="Email support"
                >
                  Email Support
                </Button>
              </Stack>
            </Box>
          )}

          {/* Technical Details Section */}
          {showTechDetails && (
            <Box sx={{ mt: 4 }}>
              <Button
                size="medium"
                variant="outlined"
                endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                onClick={onToggleDetails}
                aria-expanded={showDetails}
                sx={{ mb: 2 }}
              >
                {showDetails ? "Hide Technical Details" : "Show Technical Details"}
              </Button>
              
              <Collapse in={showDetails}>
                <Alert
                  severity="info"
                  sx={{ textAlign: "left" }}
                  icon={<Info />}
                >
                  <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                    Technical Details
                  </Typography>
                  
                  <Box
                    component="pre"
                    sx={{
                      fontSize: "0.75rem",
                      fontFamily: "'Roboto Mono', monospace",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflow: "auto",
                      maxHeight: 250,
                      mt: 1,
                      p: 2,
                      backgroundColor: 'grey.50',
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

          <Typography variant="caption" color="text.secondary" sx={{ mt: 4, display: "block", lineHeight: 1.6 }}>
            If this issue persists, please contact our support team with the Error ID above.
            <br />
            <Link 
              href="https://docs.assessly.com/troubleshooting" 
              target="_blank"
              sx={{ fontSize: '0.75rem' }}
            >
              View troubleshooting guide →
            </Link>
          </Typography>
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
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: generateErrorId(),
      recoveryAttempts: 0,
      isRecovering: false,
      copySuccess: false,
      errorCategory: ERROR_CATEGORIES.UNKNOWN,
      recoveryStrategy: RECOVERY_STRATEGIES.FALLBACK,
    };
  }

  static getDerivedStateFromError(error) {
    const errorCategory = categorizeError(error);
    const recoveryStrategy = getRecoveryStrategy(error);
    
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
      errorCategory,
      recoveryStrategy,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log immediately
    this.logError(error, errorInfo);
    
    // Schedule recovery check
    this.recoveryTimeout = setTimeout(() => {
      if (isRecoverableError(error)) {
        this.attemptAutoRecovery();
      }
    }, 300);
  }

  componentWillUnmount() {
    if (this.recoveryTimeout) clearTimeout(this.recoveryTimeout);
    if (this.autoRecoveryTimeout) clearTimeout(this.autoRecoveryTimeout);
    if (this.copySuccessTimeout) clearTimeout(this.copySuccessTimeout);
  }

  attemptAutoRecovery = () => {
    const { recoveryAttempts, recoveryStrategy } = this.state;
    const maxAttempts = 3;

    if (recoveryAttempts < maxAttempts && !this.state.isRecovering) {
      this.setState({ isRecovering: true });
      
      this.autoRecoveryTimeout = setTimeout(() => {
        console.log(`🔄 Auto-recovery attempt ${recoveryAttempts + 1}/${maxAttempts} using ${recoveryStrategy}`);
        
        this.setState(prevState => ({
          recoveryAttempts: prevState.recoveryAttempts + 1,
          isRecovering: false,
        }));
        
        if (recoveryAttempts + 1 < maxAttempts) {
          this.executeRecoveryStrategy();
        }
      }, 2000 * (recoveryAttempts + 1));
    }
  };

  executeRecoveryStrategy = () => {
    const { recoveryStrategy } = this.state;
    
    switch (recoveryStrategy) {
      case RECOVERY_STRATEGIES.CLEAR_CACHE:
        this.clearCache();
        break;
      case RECOVERY_STRATEGIES.RESET_STATE:
        this.resetState();
        break;
      case RECOVERY_STRATEGIES.FALLBACK:
      default:
        this.handleReset();
        break;
    }
  };

  clearCache = () => {
    // Clear problematic caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName).catch(() => {
            // Ignore deletion errors
          });
        });
      });
    }
    
    // Clear localStorage for this app
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('assessly')) {
        localStorage.removeItem(key);
      }
    });
    
    this.handleReset();
  };

  resetState = () => {
    // Reset specific state that might be causing issues
    try {
      localStorage.removeItem(getStorageKey('user'));
      localStorage.removeItem(getStorageKey('organization'));
    } catch (error) {
      console.warn('Failed to reset user state:', error);
    }
    
    this.handleReset();
  };

  logError = async (error, errorInfo) => {
    const { errorId, errorCategory } = this.state;
    const userInfo = getUserInfo();

    const errorPayload = {
      id: errorId,
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE,
      appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      category: errorCategory,
      url: window.location.href,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      userId: this.props.userId || userInfo?.user?.id,
      organizationId: this.props.organizationId || userInfo?.organization?.id,
      browserInfo: getBrowserInfo(),
      recoveryStrategy: this.state.recoveryStrategy,
      recoverable: isRecoverableError(error),
    };

    // Development logging
    if (import.meta.env.DEV) {
      console.group('🚨 ErrorBoundary - Development Details');
      console.error('Error:', error);
      console.error('Category:', errorCategory);
      console.error('Recovery Strategy:', this.state.recoveryStrategy);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }

    // Send to error service
    await sendToErrorService(errorPayload);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(errorPayload, error, errorInfo);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: generateErrorId(),
      copySuccess: false,
      errorCategory: ERROR_CATEGORIES.UNKNOWN,
      recoveryStrategy: RECOVERY_STRATEGIES.FALLBACK,
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  copyErrorDetails = async (details) => {
    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copySuccess: true });
      
      // Reset copy success after 3 seconds
      this.copySuccessTimeout = setTimeout(() => {
        this.setState({ copySuccess: false });
      }, 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = details;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.setState({ copySuccess: true });
        this.copySuccessTimeout = setTimeout(() => {
          this.setState({ copySuccess: false });
        }, 3000);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  createSupportTicket = () => {
    const { errorId } = this.state;
    const supportUrl = `https://support.assessly.com/new?error=${errorId}`;
    window.open(supportUrl, '_blank', 'noopener,noreferrer');
  };

  render() {
    const { 
      hasError, 
      error, 
      errorInfo, 
      showDetails, 
      errorId, 
      recoveryAttempts,
      isRecovering,
      copySuccess,
      errorCategory,
      recoveryStrategy,
    } = this.state;
    
    const { 
      children, 
      fallback,
      enableRecovery = true,
      customMessage,
      alwaysShowDetails = import.meta.env.DEV,
      showSupportOptions = true,
      userId,
      organizationId,
    } = this.props;

    // Use error reporting hook
    useErrorReporting(errorId, error, errorInfo, userId, organizationId);

    if (hasError) {
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
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          onReset={this.handleReset}
          onToggleDetails={this.toggleDetails}
          onCopyErrorDetails={this.copyErrorDetails}
          onCreateSupportTicket={this.createSupportTicket}
          enableRecovery={enableRecovery && isRecoverableError(error)}
          customMessage={customMessage}
          alwaysShowDetails={alwaysShowDetails}
          showSupportOptions={showSupportOptions}
          errorCategory={errorCategory}
          recoveryStrategy={recoveryStrategy}
        />
      );
    }

    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onError: PropTypes.func,
  enableRecovery: PropTypes.bool,
  customMessage: PropTypes.string,
  alwaysShowDetails: PropTypes.bool,
  showSupportOptions: PropTypes.bool,
  organizationId: PropTypes.string,
  userId: PropTypes.string,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

ErrorBoundary.defaultProps = {
  enableRecovery: true,
  alwaysShowDetails: import.meta.env.DEV,
  showSupportOptions: true,
};

export default ErrorBoundary;

// ===================== UTILITY FUNCTIONS =====================
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const ComponentWithErrorBoundary = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return ComponentWithErrorBoundary;
};

export const ErrorContext = React.createContext({
  reportError: (error, context) => {},
  clearError: () => {},
});

export const useErrorHandler = () => {
  const context = React.useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  return context;
};
