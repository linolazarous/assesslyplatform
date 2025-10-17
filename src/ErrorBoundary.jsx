import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
// FIX: Added the necessary import for PropTypes
import PropTypes from 'prop-types'; 

/**
 * A class component that catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire application.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    // State to track if an error has occurred, and store the error details
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // Catches errors during rendering, in lifecycle methods, and in constructors
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  // Used to log error information
  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // Log error to an error reporting service (e.g., Sentry)
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI (Material UI based)
      return (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            p: 4,
            backgroundColor: 'background.default'
          }}
        >
          <Paper elevation={8} sx={{ p: 5, maxWidth: 600, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h3" color="error" gutterBottom sx={{ mb: 2 }}>
              Application Error
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
              Something critical went wrong. Please refresh the page. If the problem persists, please contact support.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
            
            {/* Optional: Show details in development mode only */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 4, p: 2, border: '1px dashed #ef9a9a', borderRadius: 1, backgroundColor: '#ffebee', textAlign: 'left', overflowX: 'auto' }}>
                <Typography variant="subtitle2" color="error">
                  Error Details (Development Only):
                </Typography>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  {this.state.error && this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
