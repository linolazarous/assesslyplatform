// src/components/ErrorBoundary.jsx
import React from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Collapse,
  Alert,
  Stack,
  Chip,
  Divider,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Link,
} from "@mui/material";
import {
  Refresh,
  BugReport,
  ExpandMore,
  ExpandLess,
  Home,
  ContentCopy,
  Report,
  SupportAgent,
  AutoFixHigh,
  ErrorOutline,
} from "@mui/icons-material";
import PropTypes from "prop-types";
import { trackError } from "../../utils/analytics";

/**
 * 🚀 Enterprise-Grade ErrorBoundary Component
 * - Multi-tenant aware with organization context
 * - Comprehensive error tracking and analytics
 * - User-friendly recovery options
 * - Support ticket generation
 * - Performance monitoring integration
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: this.generateErrorId(),
      componentStack: "",
      userInfo: null,
      recoveryAttempts: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substring(2, 10),
    };
  }

  componentDidMount() {
    // Load user info from context or localStorage
    this.loadUserInfo();
    
    // Listen for global errors
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
      componentStack: errorInfo?.componentStack || "",
    });

    this.logError(error, errorInfo);
    this.trackErrorAnalytics(error, errorInfo);
    
    // Attempt automatic recovery for certain errors
    if (this.isRecoverableError(error)) {
      this.attemptAutoRecovery();
    }
  }

  generateErrorId = () => {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  loadUserInfo = () => {
    try {
      const userData = localStorage.getItem('user');
      const orgData = localStorage.getItem('organization');
      
      if (userData || orgData) {
        this.setState({
          userInfo: {
            user: userData ? JSON.parse(userData) : null,
            organization: orgData ? JSON.parse(orgData) : null,
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load user info for error reporting:', error);
    }
  };

  handleGlobalError = (event) => {
    // Handle global JavaScript errors
    if (event.error && !this.state.hasError) {
      this.setState({
        hasError: true,
        error: event.error,
        errorId: this.generateErrorId(),
      });
      this.logError(event.error, { isGlobalError: true });
    }
  };

  handlePromiseRejection = (event) => {
    // Handle unhandled promise rejections
    if (event.reason && !this.state.hasError) {
      this.setState({
        hasError: true,
        error: event.reason,
        errorId: this.generateErrorId(),
      });
      this.logError(event.reason, { isUnhandledRejection: true });
    }
  };

  isRecoverableError = (error) => {
    // List of errors that can be automatically recovered from
    const recoverableErrors = [
      'NetworkError',
      'ChunkLoadError',
      'TypeError',
      'ReferenceError',
    ];
    
    return recoverableErrors.some(errorType => 
      error.name?.includes(errorType) || 
      error.message?.includes(errorType)
    );
  };

  attemptAutoRecovery = () => {
    const { recoveryAttempts } = this.state;
    const maxAttempts = 3;

    if (recoveryAttempts < maxAttempts && !this.state.isRecovering) {
      this.setState({ isRecovering: true });
      
      setTimeout(() => {
        console.log(`🔄 Auto-recovery attempt ${recoveryAttempts + 1}/${maxAttempts}`);
        this.setState(prevState => ({
          recoveryAttempts: prevState.recoveryAttempts + 1,
          isRecovering: false,
        }));
        
        if (recoveryAttempts + 1 < maxAttempts) {
          this.handleReset();
        }
      }, 2000 * (recoveryAttempts + 1)); // Exponential backoff
    }
  };

  logError = (error, errorInfo) => {
    const { errorId, userInfo } = this.state;
    const { organizationId, userId } = this.props;

    const errorPayload = {
      // Error metadata
      id: errorId,
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE,
      appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      
      // Error details
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      isGlobalError: errorInfo?.isGlobalError,
      isUnhandledRejection: errorInfo?.isUnhandledRejection,
      
      // User and session context
      url: window.location.href,
      path: window.location.pathname,
      query: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Application context
      userId: userId || userInfo?.user?.id,
      organizationId: organizationId || userInfo?.organization?.id,
      userRole: userInfo?.user?.role,
      subscriptionPlan: userInfo?.organization?.subscription?.plan,
      
      // Performance metrics (if available)
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      } : null,
    };

    // Console logging with different levels based on environment
    if (import.meta.env.DEV) {
      console.group('🚨 ErrorBoundary - Development Details');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.table(errorPayload);
      console.groupEnd();
    } else {
      console.error('🚨 Application Error:', {
        id: errorId,
        message: error?.message,
        url: window.location.href,
      });
    }

    // Send to external error tracking service
    this.sendToErrorService(errorPayload);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(errorPayload, error, errorInfo);
    }
  };

  sendToErrorService = async (errorPayload) => {
    try {
      // Send to backend error tracking endpoint
      const response = await fetch('/api/v1/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(errorPayload),
      });

      if (!response.ok) {
        console.warn('Failed to send error to tracking service:', response.status);
      }
    } catch (error) {
      console.warn('Error tracking service unavailable:', error);
    }

    // Track error in analytics
    trackError(this.state.error, {
      errorId: errorPayload.id,
      component: this.props.componentName || 'Unknown',
      ...errorPayload
    });
  };

  trackErrorAnalytics = (error, errorInfo) => {
    const analyticsData = {
      error_type: error?.name || 'Unknown',
      error_message: error?.message?.substring(0, 100),
      component: this.props.componentName || 'ErrorBoundary',
      url: window.location.pathname,
      recovery_attempts: this.state.recoveryAttempts,
    };

    // Track in your analytics service
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error?.message,
        fatal: true,
      });
    }
  };

  handleReload = () => {
    // Clear problematic caches before reload
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Force reload with cache bypass
    window.location.reload();
  };

  handleGoHome = () => {
    // Use react-router if available, otherwise window.location
    if (this.props.navigate) {
      this.props.navigate('/');
    } else {
      window.location.href = '/';
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: this.generateErrorId(),
      componentStack: "",
      isRecovering: false,
    });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  copyErrorDetails = async () => {
    const { error, errorInfo, errorId, userInfo } = this.state;
    
    const details = this.formatErrorDetails({
      errorId,
      error,
      errorInfo,
      userInfo,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    try {
      await navigator.clipboard.writeText(details);
      
      // Show success feedback
      this.setState({ copySuccess: true });
      setTimeout(() => this.setState({ copySuccess: false }), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = details;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  formatErrorDetails = (data) => {
    return `
===== ASSESSLY ERROR REPORT =====
Error ID: ${data.errorId}
Timestamp: ${new Date(data.timestamp).toLocaleString()}
URL: ${data.url}
Environment: ${import.meta.env.MODE}
App Version: ${import.meta.env.VITE_APP_VERSION || '1.0.0'}

----- USER INFO -----
User: ${data.userInfo?.user?.email || 'Not authenticated'}
Organization: ${data.userInfo?.organization?.name || 'None'}
Role: ${data.userInfo?.user?.role || 'Unknown'}

----- ERROR DETAILS -----
Error: ${data.error?.toString() || 'Unknown error'}
Type: ${data.error?.name || 'Unknown'}
Message: ${data.error?.message || 'No message'}

----- STACK TRACE -----
${data.error?.stack || 'No stack trace available'}

----- COMPONENT STACK -----
${data.errorInfo?.componentStack || 'No component stack available'}

----- BROWSER INFO -----
User Agent: ${navigator.userAgent}
Screen: ${window.screen.width}x${window.screen.height}
Language: ${navigator.language}
Platform: ${navigator.platform}
Online: ${navigator.onLine}

----- PERFORMANCE -----
Memory: ${performance.memory ? 
  `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB / ${Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)}MB` : 
  'Not available'
}
    `.trim();
  };

  createSupportTicket = () => {
    const { errorId } = this.state;
    const supportUrl = `https://support.assessly.com/new?error=${errorId}`;
    window.open(supportUrl, '_blank');
  };

  renderErrorContent() {
    const { 
      showDetails, 
      errorId, 
      recoveryAttempts,
      isRecovering,
      copySuccess 
    } = this.state;
    
    const { 
      enableRecovery = true, 
      customMessage,
      alwaysShowDetails,
      showSupportOptions = true,
      theme,
    } = this.props;

    const isDev = import.meta.env.DEV;
    const showTechDetails = isDev || alwaysShowDetails;

    return (
      <Fade in timeout={500}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            p: 3,
            backgroundColor: theme?.palette?.background?.default || "background.default",
            backgroundImage: `radial-gradient(${alpha(theme?.palette?.error?.main || '#f44336', 0.05)} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <Zoom in timeout={600}>
            <Paper 
              elevation={24} 
              sx={{ 
                p: { xs: 3, md: 5 }, 
                maxWidth: 800, 
                borderRadius: 4, 
                textAlign: "center",
                width: "100%",
                position: "relative",
                overflow: "hidden",
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${theme?.palette?.error?.main || '#f44336'}, ${theme?.palette?.warning?.main || '#ff9800'})`,
                }
              }}
            >
              {/* Error ID Badge */}
              <Chip
                icon={<BugReport />}
                label={`Error ID: ${errorId}`}
                color="error"
                size="small"
                sx={{ 
                  mb: 3,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />

              <ErrorOutline 
                sx={{ 
                  fontSize: 80, 
                  color: "error.main", 
                  mb: 3,
                  animation: isRecovering ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  }
                }} 
              />
              
              <Typography 
                variant="h3" 
                color="error" 
                fontWeight={800} 
                gutterBottom
                sx={{ 
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  mb: 2 
                }}
              >
                Oops! Something Went Wrong
              </Typography>
              
              <Typography 
                variant="h6" 
                color="text.secondary" 
                sx={{ 
                  mb: 4,
                  lineHeight: 1.6,
                  maxWidth: '600px',
                  mx: 'auto'
                }}
              >
                {customMessage || "We've encountered an unexpected issue. Our team has been notified and we're working to fix it."}
              </Typography>

              {recoveryAttempts > 0 && (
                <Alert 
                  severity="info" 
                  sx={{ mb: 3, textAlign: 'left' }}
                  icon={<AutoFixHigh />}
                >
                  <Typography variant="body2">
                    {isRecovering 
                      ? `Attempting automatic recovery (${recoveryAttempts}/3)...`
                      : `Recovery attempted ${recoveryAttempts} time${recoveryAttempts > 1 ? 's' : ''}.`
                    }
                  </Typography>
                </Alert>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Action Buttons */}
              <Stack 
                direction={{ xs: "column", sm: "row" }} 
                spacing={2} 
                justifyContent="center" 
                mb={4}
                flexWrap="wrap"
              >
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<Refresh />} 
                  onClick={this.handleReload}
                  size="large"
                  sx={{ minWidth: 180 }}
                  disabled={isRecovering}
                >
                  Refresh Page
                </Button>
                
                <Button 
                  variant="outlined" 
                  startIcon={<Home />} 
                  onClick={this.handleGoHome}
                  size="large"
                  sx={{ minWidth: 180 }}
                  disabled={isRecovering}
                >
                  Go to Dashboard
                </Button>
                
                {enableRecovery && !isRecovering && (
                  <Button 
                    variant="text" 
                    onClick={this.handleReset}
                    size="large"
                    sx={{ minWidth: 180 }}
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
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopy />}
                      onClick={this.copyErrorDetails}
                      color={copySuccess ? "success" : "primary"}
                    >
                      {copySuccess ? "Copied!" : "Copy Error Details"}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SupportAgent />}
                      onClick={this.createSupportTicket}
                    >
                      Create Support Ticket
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Report />}
                      component="a"
                      href={`mailto:support@assessly.com?subject=Error Report ${errorId}&body=Please describe the issue you encountered...`}
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
                    onClick={this.toggleDetails}
                    aria-expanded={showDetails}
                    aria-controls="error-details-collapse"
                    sx={{ mb: 2 }}
                  >
                    {showDetails ? "Hide Technical Details" : "Show Technical Details"}
                  </Button>
                  
                  <Collapse in={showDetails}>
                    <Alert
                      severity="info"
                      sx={{ 
                        textAlign: "left",
                        '& .MuiAlert-message': { width: '100%' }
                      }}
                      id="error-details-collapse"
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
                          maxHeight: 300,
                          mt: 1,
                          p: 2,
                          backgroundColor: 'grey.50',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.200'
                        }}
                      >
                        {this.formatErrorDetails({
                          errorId,
                          error: this.state.error,
                          errorInfo: this.state.errorInfo,
                          userInfo: this.state.userInfo,
                          url: window.location.href,
                          timestamp: new Date().toISOString(),
                        })}
                      </Box>
                    </Alert>
                  </Collapse>
                </Box>
              )}

              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  mt: 4, 
                  display: "block",
                  lineHeight: 1.6,
                  fontSize: '0.75rem'
                }}
              >
                If this issue persists, please contact our support team with the Error ID above.
                <br />
                <Link 
                  href="https://docs.assessly.com/troubleshooting" 
                  target="_blank"
                  sx={{ fontSize: '0.75rem' }}
                >
                  View troubleshooting guide
                </Link>
              </Typography>
            </Paper>
          </Zoom>
        </Box>
      </Fade>
    );
  }

  render() {
    const { hasError, isRecovering } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return React.isValidElement(fallback) 
          ? fallback 
          : fallback(this.state, this);
      }
      return this.renderErrorContent();
    }

    if (isRecovering) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress />
          <Typography>Attempting to recover application...</Typography>
        </Box>
      );
    }

    return children;
  }
}

// CircularProgress component for recovery state
const CircularProgress = ({ size = 40, thickness = 4 }) => (
  <Box
    sx={{
      display: 'inline-block',
      width: size,
      height: size,
      '&::after': {
        content: '""',
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${thickness}px solid`,
        borderColor: 'primary.light',
        borderTopColor: 'primary.main',
        animation: 'spin 1s linear infinite',
      },
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
      }
    }}
  />
);

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onError: PropTypes.func,
  enableRecovery: PropTypes.bool,
  customMessage: PropTypes.string,
  alwaysShowDetails: PropTypes.bool,
  showSupportOptions: PropTypes.bool,
  componentName: PropTypes.string,
  organizationId: PropTypes.string,
  userId: PropTypes.string,
  navigate: PropTypes.func,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  theme: PropTypes.object,
};

ErrorBoundary.defaultProps = {
  enableRecovery: import.meta.env.MODE !== 'production',
  alwaysShowDetails: false,
  showSupportOptions: true,
};

// Higher-order component for easier usage
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
};

// Error boundary context for nested error boundaries
export const ErrorBoundaryContext = React.createContext({
  triggerError: (error, info) => {},
});

export default ErrorBoundary;




