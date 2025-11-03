import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  IconButton,
  Collapse,
  Alert,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Refresh, 
  BugReport, 
  ExpandMore, 
  ExpandLess,
  Home,
  Report
} from '@mui/icons-material';
import PropTypes from 'prop-types';

/**
 * Enhanced Error Boundary with better UX, recovery options, and error reporting
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Enhanced error logging
    this.logError(error, errorInfo);
  }

  logError = (error, errorInfo) => {
    const errorDetails = {
      id: this.state.errorId,
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    console.error('🚨 ErrorBoundary Caught Error:', errorDetails);

    // Send to error reporting service (Sentry, LogRocket, etc.)
    if (this.props.onError) {
      this.props.onError(errorDetails);
    }

    // Log to analytics if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: true
      });
    }
  };

  handleRefresh = () => {
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
      showDetails: false
    });
  };

  toggleDetails = () => {
    this.setState(prevState => ({ 
      showDetails: !prevState.showDetails 
    }));
  };

  copyErrorDetails = async () => {
    const errorText = `Error ID: ${this.state.errorId}
Time: ${new Date().toLocaleString()}
URL: ${window.location.href}
Error: ${this.state.error?.toString()}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}`;

    try {
      await navigator.clipboard.writeText(errorText);
      // You could show a toast here if needed
      console.log('Error details copied to clipboard');
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  renderErrorContent() {
    const { showDetails, errorId } = this.state;
    const { enableRecovery = true } = this.props;

    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          p: 2,
          backgroundColor: 'background.default'
        }}
      >
        <Paper 
          elevation={8} 
          sx={{ 
            p: { xs: 3, md: 5 }, 
            maxWidth: 600, 
            width: '100%',
            textAlign: 'center', 
            borderRadius: 3
          }}
        >
          {/* Error Icon & Title */}
          <Box sx={{ mb: 3 }}>
            <BugReport 
              sx={{ 
                fontSize: 64, 
                color: 'error.main',
                mb: 2
              }} 
            />
            <Typography 
              variant="h4" 
              color="error" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '1.75rem', md: '2.125rem' }
              }}
            >
              Something Went Wrong
            </Typography>
          </Box>

          {/* Error Message */}
          <Typography 
            variant="body1" 
            color="text.secondary" 
            paragraph 
            sx={{ 
              mb: 4,
              fontSize: { xs: '0.9rem', md: '1rem' }
            }}
          >
            We've encountered an unexpected error. Our team has been notified.
            {errorId && (
              <Box component="span" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                Error ID: {errorId}
              </Box>
            )}
          </Typography>

          {/* Action Buttons */}
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            sx={{ 
              mb: 3,
              justifyContent: 'center'
            }}
          >
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              startIcon={<Refresh />}
              onClick={this.handleRefresh}
              sx={{ flex: { xs: 1, sm: 'none' } }}
            >
              Refresh Page
            </Button>
            
            <Button 
              variant="outlined" 
              size="large"
              startIcon={<Home />}
              onClick={this.handleGoHome}
              sx={{ flex: { xs: 1, sm: 'none' } }}
            >
              Go Home
            </Button>

            {enableRecovery && (
              <Button 
                variant="text" 
                size="large"
                onClick={this.handleReset}
                sx={{ flex: { xs: 1, sm: 'none' } }}
              >
                Try Again
              </Button>
            )}
          </Stack>

          {/* Error Details Toggle */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="text"
                size="small"
                endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                onClick={this.toggleDetails}
                sx={{ mb: 2 }}
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </Button>

              <Collapse in={showDetails}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    textAlign: 'left',
                    '& .MuiAlert-message': { width: '100%' }
                  }}
                  action={
                    <IconButton 
                      size="small" 
                      onClick={this.copyErrorDetails}
                      title="Copy error details"
                    >
                      <Report fontSize="small" />
                    </IconButton>
                  }
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Error Details:
                  </Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      fontSize: '0.75rem', 
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      margin: 0,
                      maxHeight: 200,
                      overflow: 'auto'
                    }}
                  >
                    {this.state.error?.toString()}
                    {'\n\n'}
                    {this.state.error?.stack}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </Box>
                </Alert>
              </Collapse>
            </Box>
          )}

          {/* Support Contact */}
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              display: 'block', 
              mt: 3,
              fontSize: '0.75rem'
            }}
          >
            If this continues, please contact support with the Error ID above.
          </Typography>
        </Paper>
      </Box>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorContent();
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onError: PropTypes.func,
  enableRecovery: PropTypes.bool,
  fallback: PropTypes.func
};

ErrorBoundary.defaultProps = {
  enableRecovery: process.env.NODE_ENV === 'development'
};

export default ErrorBoundary;
