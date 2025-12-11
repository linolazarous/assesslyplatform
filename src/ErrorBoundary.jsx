// src/ErrorBoundary.jsx
import React, { Component } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Container,
  Alert,
  CircularProgress
} from '@mui/material';
import { Refresh, Home, BugReport } from '@mui/icons-material';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isRecovering: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error);
    console.error('Error details:', errorInfo);
    
    // Store for debugging
    this.setState({ errorInfo });
    
    // Report to your API if needed
    this.reportError(error, errorInfo);
  }

  reportError = async (error, errorInfo) => {
    try {
      await fetch('https://assesslyplatform-t49h.onrender.com/api/v1/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message || 'Unknown error',
          stack: error?.stack,
          componentStack: errorInfo?.componentStack,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.warn('Failed to report error:', err);
    }
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isRecovering: false 
    });
  };

  handleReload = () => {
    this.setState({ isRecovering: true });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  render() {
    if (this.state.isRecovering) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          gap: 3
        }}>
          <CircularProgress size={60} />
          <Typography variant="h6">Recovering application...</Typography>
        </Box>
      );
    }

    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Box sx={{ 
            p: 4, 
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: 3
          }}>
            {/* Error Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <BugReport color="error" sx={{ fontSize: 40 }} />
              <Typography variant="h4" fontWeight="bold">
                Something went wrong
              </Typography>
            </Box>

            {/* Error Message */}
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="medium">
                {this.state.error?.message || 'An unexpected error occurred'}
              </Typography>
            </Alert>

            {/* Development Details */}
            {isDev && this.state.errorInfo && (
              <Box sx={{ 
                mb: 3, 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 300
              }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Error Details:
                </Typography>
                <pre style={{ 
                  margin: 0, 
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error?.toString()}
                </pre>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                  Component Stack:
                </Typography>
                <pre style={{ 
                  margin: 0, 
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleReload}
                size="large"
                sx={{ minWidth: 180 }}
              >
                Reload Application
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={() => window.location.href = '/'}
                size="large"
                sx={{ minWidth: 180 }}
              >
                Go to Home
              </Button>
              
              {isDev && (
                <Button
                  variant="text"
                  onClick={this.handleReset}
                  size="large"
                >
                  Try to Recover
                </Button>
              )}
            </Box>

            {/* Help Text */}
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center" 
              sx={{ mt: 4 }}
            >
              If the problem persists, please contact support at{' '}
              <a href="mailto:assesslyinc@gmail.com" style={{ color: '#1976d2' }}>
                assesslyinc@gmail.com
              </a>
            </Typography>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
