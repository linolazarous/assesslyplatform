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
  Divider
} from '@mui/material';
import { 
  Refresh, 
  Home, 
  ContentCopy, 
  ExpandMore, 
  ExpandLess,
  BugReport 
} from '@mui/icons-material';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: this.generateErrorId(),
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
    });

    // Log error in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    } else {
      console.error('🚨 Error caught by ErrorBoundary:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  generateErrorId = () => {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  logErrorToService = async (error, errorInfo) => {
    try {
      const errorData = {
        id: this.state.errorId,
        name: error?.name,
        message: error?.message?.substring(0, 200),
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      // Only log in production
      if (process.env.NODE_ENV === 'production') {
        // You can send this to your error tracking service
        // Example: await fetch('/api/log-error', { method: 'POST', body: JSON.stringify(errorData) });
        console.log('Error logged:', errorData);
      }
    } catch (err) {
      console.warn('Failed to log error:', err);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  copyErrorDetails = async () => {
    const { errorId, error, errorInfo } = this.state;
    const details = `
Error ID: ${errorId}
Error: ${error?.toString()}
Message: ${error?.message}
URL: ${window.location.href}
Time: ${new Date().toLocaleString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(details);
      alert('Error details copied to clipboard!');
    } catch (err) {
      console.warn('Failed to copy:', err);
    }
  };

  render() {
    const { hasError, error, errorInfo, showDetails, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback(error, errorInfo, errorId) 
          : fallback;
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
              borderColor: 'error.main'
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" color="error" gutterBottom fontWeight={600}>
                Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                We're sorry for the inconvenience. Our team has been notified.
              </Typography>
              
              <Alert 
                severity="info" 
                sx={{ mb: 3, textAlign: 'left' }}
                icon={<BugReport />}
              >
                <Typography variant="body2">
                  <strong>Error ID:</strong> {errorId}
                </Typography>
              </Alert>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" mb={3}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Refresh />}
                onClick={this.handleReload}
                size="large"
              >
                Reload Page
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={this.handleGoHome}
                size="large"
              >
                Go Home
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={this.copyErrorDetails}
                size="large"
              >
                Copy Details
              </Button>
            </Stack>

            {/* Only show details in development */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 3 }}>
                <Button
                  size="small"
                  variant="text"
                  endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                  onClick={this.toggleDetails}
                  sx={{ mb: 2 }}
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </Button>
                
                <Collapse in={showDetails}>
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      p: 2,
                      backgroundColor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200',
                      maxHeight: 300,
                      overflow: 'auto',
                    }}
                  >
                    {error?.toString()}
                    {'\n\n'}
                    {errorInfo?.componentStack}
                  </Box>
                </Collapse>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 4, display: 'block' }}>
              If this issue persists, please contact support with the Error ID above.
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
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

export default ErrorBoundary;
