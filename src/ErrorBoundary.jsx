// src/ErrorBoundary.jsx
import React, { Component } from 'react';
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

// Create a separate theme-aware functional component for error display
const ErrorDisplay = React.memo(({ 
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
}) => {
  const theme = useTheme();
  const isDev = import.meta.env.DEV;
  const showTechDetails = isDev || alwaysShowDetails;

  if (isRecovering) {
    return (
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
          Attempt {recoveryAttempts + 1} of 3
        </Typography>
      </Box>
    );
  }

  const formatErrorDetails = () => {
    const userInfo = getUserInfo();
    return `
===== ASSESSLY ERROR REPORT =====
Error ID: ${errorId}
Timestamp: ${new Date().toLocaleString()}
URL: ${window.location.href}
Environment: ${import.meta.env.MODE}
App Version: ${import.meta.env.VITE_APP_VERSION || '1.0.0'}

----- USER INFO -----
User: ${userInfo?.user?.email || 'Not authenticated'}
Organization: ${userInfo?.organization?.name || 'None'}
Role: ${userInfo?.user?.role || 'Unknown'}

----- ERROR DETAILS -----
Error: ${error?.toString() || 'Unknown error'}
Type: ${error?.name || 'Unknown'}
Message: ${error?.message || 'No message'}

----- STACK TRACE -----
${error?.stack || 'No stack trace available'}

----- COMPONENT STACK -----
${errorInfo?.componentStack || 'No component stack available'}

----- BROWSER INFO -----
User Agent: ${navigator.userAgent}
Screen: ${window.screen.width}x${window.screen.height}
Language: ${navigator.language}
Platform: ${navigator.platform}
Online: ${navigator.onLine}
    `.trim();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8 }} role="alert" aria-live="assertive">
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
          aria-hidden="true"
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
          
          {enableRecovery && (
            <Button 
              variant="text" 
              onClick={onReset}
              size="large"
              sx={{ minWidth: 180 }}
              aria-label="Try again"
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
                onClick={onCopyErrorDetails}
                color={copySuccess ? "success" : "primary"}
                aria-label={copySuccess ? "Error details copied" : "Copy error details"}
              >
                {copySuccess ? "Copied!" : "Copy Error Details"}
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<SupportAgent />}
                onClick={onCreateSupportTicket}
                aria-label="Create support ticket"
              >
                Create Support Ticket
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<Report />}
                component="a"
                href={`mailto:support@assessly.com?subject=Error Report ${errorId}&body=Please describe the issue you encountered...`}
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
            
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  maxHeight: showDetails ? '300px' : '0',
                  opacity: showDetails ? 1 : 0,
                  transition: 'all 0.3s ease',
                }}
              >
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
                      maxHeight: 250,
                      mt: 1,
                      p: 2,
                      backgroundColor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    {formatErrorDetails()}
                  </Box>
                </Alert>
              </div>
            </div>
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
});

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
};

// Helper function to get user info
const getUserInfo = () => {
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

// Helper function to check if error is recoverable
const isRecoverableError = (error) => {
  if (!error) return false;
  
  const recoverableErrors = [
    'NetworkError',
    'ChunkLoadError',
    'TypeError',
    'ReferenceError',
  ];
  
  const errorName = error.name || '';
  const errorMessage = error.message || '';
  
  return recoverableErrors.some(errorType => 
    errorName.includes(errorType) || 
    errorMessage.includes(errorType)
  );
};

// Main ErrorBoundary class component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: this.generateErrorId(),
      recoveryAttempts: 0,
      isRecovering: false,
      copySuccess: false,
    };
    
    // Bind methods
    this.handleReload = this.handleReload.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.toggleDetails = this.toggleDetails.bind(this);
    this.copyErrorDetails = this.copyErrorDetails.bind(this);
    this.createSupportTicket = this.createSupportTicket.bind(this);
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
    });

    this.logError(error, errorInfo);
    
    // Don't attempt auto-recovery immediately, wait for next render
    this.recoveryTimeout = setTimeout(() => {
      if (isRecoverableError(error)) {
        this.attemptAutoRecovery();
      }
    }, 100);
  }

  componentWillUnmount() {
    // Clean up any timeouts
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }
  }

  generateErrorId = () => {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  attemptAutoRecovery = () => {
    const { recoveryAttempts } = this.state;
    const maxAttempts = 3;

    if (recoveryAttempts < maxAttempts && !this.state.isRecovering) {
      this.setState({ isRecovering: true });
      
      this.autoRecoveryTimeout = setTimeout(() => {
        console.log(`🔄 Auto-recovery attempt ${recoveryAttempts + 1}/${maxAttempts}`);
        
        this.setState(prevState => ({
          recoveryAttempts: prevState.recoveryAttempts + 1,
          isRecovering: false,
        }));
        
        if (recoveryAttempts + 1 < maxAttempts) {
          this.handleReset();
        }
      }, 2000 * (recoveryAttempts + 1));
    }
  };

  logError = async (error, errorInfo) => {
    const { errorId } = this.state;
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
      url: window.location.href,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      userId: this.props.userId || userInfo?.user?.id,
      organizationId: this.props.organizationId || userInfo?.organization?.id,
    };

    // Console logging
    if (import.meta.env.DEV) {
      console.group('🚨 ErrorBoundary - Development Details');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    } else {
      console.error('🚨 Application Error:', {
        id: errorId,
        message: error?.message,
        url: window.location.href,
      });
    }

    // Send to error service
    await this.sendToErrorService(errorPayload);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(errorPayload, error, errorInfo);
    }
  };

  sendToErrorService = async (errorPayload) => {
    try {
      // Get token safely
      let token = null;
      try {
        token = localStorage.getItem('assessly_token');
      } catch (storageError) {
        console.warn('Failed to access localStorage:', storageError);
      }

      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/errors/log', {
        method: 'POST',
        headers,
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
          caches.delete(cacheName).catch(() => {
            // Ignore deletion errors
          });
        });
      });
    }
    
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
      copySuccess: false,
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  copyErrorDetails = async () => {
    const { errorId, error, errorInfo } = this.state;
    const userInfo = getUserInfo();
    
    const details = `
===== ASSESSLY ERROR REPORT =====
Error ID: ${errorId}
Timestamp: ${new Date().toLocaleString()}
URL: ${window.location.href}

----- ERROR DETAILS -----
Error: ${error?.toString() || 'Unknown error'}
Message: ${error?.message || 'No message'}

----- STACK TRACE -----
${error?.stack || 'No stack trace available'}
    `.trim();

    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copySuccess: true });
      setTimeout(() => this.setState({ copySuccess: false }), 3000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = details;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.setState({ copySuccess: true });
        setTimeout(() => this.setState({ copySuccess: false }), 3000);
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
      copySuccess 
    } = this.state;
    
    const { 
      children, 
      fallback,
      enableRecovery = import.meta.env.MODE !== 'production',
      customMessage,
      alwaysShowDetails = false,
      showSupportOptions = true,
    } = this.props;

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
          enableRecovery={enableRecovery}
          customMessage={customMessage}
          alwaysShowDetails={alwaysShowDetails}
          showSupportOptions={showSupportOptions}
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
  enableRecovery: import.meta.env.MODE !== 'production',
  alwaysShowDetails: false,
  showSupportOptions: true,
};

export default ErrorBoundary;

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
