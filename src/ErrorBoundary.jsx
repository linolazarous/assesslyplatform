// src/ErrorBoundary.jsx
import React, { Component } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  Paper,
  Alert,
  IconButton,
  Collapse,
  Stack,
  Divider,
  CircularProgress,
  Chip,
  Link,
  alpha,
  useTheme,
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
} from '@mui/icons-material';
import PropTypes from 'prop-types';

// Higher-order component to provide theme
const withTheme = (WrappedComponent) => {
  return function WithThemeComponent(props) {
    const theme = useTheme();
    return <WrappedComponent {...props} theme={theme} />;
  };
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: this.generateErrorId(),
      componentStack: '',
      userInfo: this.getUserInfo(),
      recoveryAttempts: 0,
      isRecovering: false,
      copySuccess: false,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substring(2, 10),
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
      componentStack: errorInfo?.componentStack || '',
    });

    this.logError(error, errorInfo);
    
    // Attempt automatic recovery for certain errors
    if (this.isRecoverableError(error)) {
      this.attemptAutoRecovery();
    }
  }

  generateErrorId = () => {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  getUserInfo = () => {
    try {
      const userData = localStorage.getItem('assessly_user');
      const orgData = localStorage.getItem('assessly_organization');
      
      if (userData || orgData) {
        return {
          user: userData ? JSON.parse(userData) : null,
          organization: orgData ? JSON.parse(orgData) : null,
        };
      }
    } catch (error) {
      console.warn('Failed to load user info for error reporting:', error);
    }
    return null;
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
      
      // User and session context
      url: window.location.href,
      path: window.location.pathname,
      query: window.location.search,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Application context
      userId: userId || userInfo?.user?.id,
      organizationId: organizationId || userInfo?.organization?.id,
      userRole: userInfo?.user?.role,
      subscriptionPlan: userInfo?.organization?.subscription?.plan,
      
      // Performance metrics
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
          'Authorization': `Bearer ${localStorage.getItem('assessly_token')}`,
        },
        body: JSON.stringify(errorPayload),
      });

      if (!response.ok) {
        console.warn('Failed to send error to tracking service:', response.status);
      }
    } catch (error) {
      console.warn('Error tracking service unavailable:', error);
    }

    // Track in analytics if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: errorPayload.message,
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
    window.location.href = '/';
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
      copySuccess: false,
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  copyErrorDetails = async () => {
    const { errorId, error, errorInfo, userInfo } = this.state;
    
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
      this.setState({ copySuccess: true });
      setTimeout(() => this.setState({ copySuccess: false }), 3000);
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
    `.trim();
  };

  createSupportTicket = () => {
    const { errorId } = this.state;
    const supportUrl = `https://support.assessly.com/new?error=${errorId}`;
    window.open(supportUrl, '_blank');
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
      copySuccess 
    } = this.state;
    
    const { 
      children, 
      fallback,
      enableRecovery = import.meta.env.MODE !== 'production',
      customMessage,
      alwaysShowDetails = false,
      showSupportOptions = true,
      theme,
    } = this.props;

    const isDev = import.meta.env.DEV;
    const showTechDetails = isDev || alwaysShowDetails;

    if (hasError) {
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback(error, errorInfo, errorId) 
          : fallback;
      }

      if (isRecovering) {
        return (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: '100vh',
            flexDirection: 'column',
            gap: 2,
            background: `linear-gradient(135deg, ${alpha(theme?.palette?.primary?.light || '#bbdefb', 0.05)} 0%, ${alpha(theme?.palette?.secondary?.light || '#f8bbd0', 0.05)} 100%)`,
          }}>
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" color="text.secondary">
              Attempting to recover application...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Attempt {recoveryAttempts + 1} of 3
            </Typography>
          </Box>
        );
      }

      return (
        <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 3,
              borderLeft: '6px solid',
              borderColor: 'error.main',
              position: 'relative',
              overflow: 'hidden',
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
            
            <Typography variant="h4" color="error" fontWeight={600} gutterBottom>
              Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              {customMessage || "We've encountered an unexpected issue. Our team has been notified and we're working to fix it."}
            </Typography>

            {recoveryAttempts > 0 && (
              <Alert 
                severity="info" 
                sx={{ mb: 3, textAlign: 'left' }}
                icon={<AutoFixHigh />}
              >
                <Typography variant="body2">
                  Recovery attempted {recoveryAttempts} time{recoveryAttempts > 1 ? 's' : ''}.
                </Typography>
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Action Buttons */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" mb={4}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<Refresh />} 
                onClick={this.handleReload}
                size="large"
                sx={{ minWidth: 180 }}
              >
                Reload Page
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<Home />} 
                onClick={this.handleGoHome}
                size="large"
                sx={{ minWidth: 180 }}
              >
                Go to Homepage
              </Button>
              
              {enableRecovery && (
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
                  sx={{ mb: 2 }}
                >
                  {showDetails ? "Hide Technical Details" : "Show Technical Details"}
                </Button>
                
                <Collapse in={showDetails}>
                  <Alert
                    severity="info"
                    sx={{ textAlign: "left" }}
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
                        error,
                        errorInfo,
                        userInfo: this.state.userInfo,
                        url: window.location.href,
                        timestamp: new Date().toISOString(),
                      })}
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
                View troubleshooting guide
              </Link>
            </Typography>
          </Paper>
        </Container>
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
  theme: PropTypes.object,
};

ErrorBoundary.defaultProps = {
  enableRecovery: import.meta.env.MODE !== 'production',
  alwaysShowDetails: false,
  showSupportOptions: true,
};

// Export with theme HOC
export default withTheme(ErrorBoundary);

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
