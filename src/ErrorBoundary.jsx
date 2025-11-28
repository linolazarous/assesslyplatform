// src/ErrorBoundary.jsx
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
} from "@mui/material";
import { Refresh, BugReport, ExpandMore, ExpandLess, Home, Report } from "@mui/icons-material";
import PropTypes from "prop-types";

/**
 * 🚀 Production-Ready ErrorBoundary
 * - Clean design with better accessibility
 * - Error tracking integration ready
 * - Copy error details functionality
 * - Safe recovery options
 * - Environment-aware behavior
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      errorId: null,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substring(2, 10),
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    this.logError(error, errorInfo);
  }

  logError = (error, errorInfo) => {
    const errorPayload = {
      id: this.state.errorId,
      message: error?.toString(),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      environment: import.meta.env.MODE,
    };

    console.error("🚨 ErrorBoundary caught an error:", errorPayload);

    // 🔧 Optional: Send to external service (e.g., Sentry, LogRocket)
    if (this.props.onError) {
      this.props.onError(errorPayload);
    }

    // Development-only: Show in console for easier debugging
    if (import.meta.env.DEV) {
      console.group("🚨 Error Details");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.groupEnd();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
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
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  copyErrorDetails = async () => {
    const { error, errorInfo, errorId } = this.state;
    const details = `
Error ID: ${errorId}
Time: ${new Date().toLocaleString()}
URL: ${window.location.href}
Environment: ${import.meta.env.MODE}
User Agent: ${navigator.userAgent}

Error: ${error?.toString()}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
    `.trim();

    try {
      await navigator.clipboard.writeText(details);
      // You could replace this with a toast notification
      if (import.meta.env.DEV) {
        alert("✅ Error details copied to clipboard");
      }
    } catch (err) {
      console.warn("Failed to copy error details:", err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = details;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  renderErrorContent() {
    const { showDetails, errorId } = this.state;
    const { enableRecovery = true, customMessage } = this.props;

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          p: 3,
          backgroundColor: "background.default",
        }}
        role="alert"
        aria-live="polite"
      >
        <Paper 
          elevation={8} 
          sx={{ 
            p: { xs: 3, md: 5 }, 
            maxWidth: 600, 
            borderRadius: 3, 
            textAlign: "center",
            width: "100%"
          }}
        >
          <BugReport 
            sx={{ 
              fontSize: 64, 
              color: "error.main", 
              mb: 2,
              ariaHidden: "true"
            }} 
          />
          
          <Typography variant="h4" color="error" fontWeight="bold" gutterBottom>
            Something Went Wrong
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {customMessage || "We've encountered an unexpected issue. Our team has been notified and we're working to fix it."}
            {errorId && (
              <Box 
                component="span" 
                sx={{ 
                  display: "block", 
                  mt: 2, 
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  backgroundColor: "grey.100",
                  p: 1,
                  borderRadius: 1
                }}
              >
                Error ID: {errorId}
              </Box>
            )}
          </Typography>

          <Stack 
            direction={{ xs: "column", sm: "row" }} 
            spacing={2} 
            justifyContent="center" 
            mb={3}
          >
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Refresh />} 
              onClick={this.handleReload}
              size="large"
            >
              Refresh Page
            </Button>
            
            <Button 
              variant="outlined" 
              startIcon={<Home />} 
              onClick={this.handleGoHome}
              size="large"
            >
              Go Home
            </Button>
            
            {enableRecovery && (
              <Button 
                variant="text" 
                onClick={this.handleReset}
                size="large"
              >
                Try Again
              </Button>
            )}
          </Stack>

          {/* 🧩 Technical Details (shown in development or when explicitly enabled) */}
          {(import.meta.env.DEV || this.props.alwaysShowDetails) && (
            <Box sx={{ mt: 3 }}>
              <Button
                size="small"
                variant="outlined"
                endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                onClick={this.toggleDetails}
                aria-expanded={showDetails}
                aria-controls="error-details-collapse"
              >
                {showDetails ? "Hide Technical Details" : "Show Technical Details"}
              </Button>
              
              <Collapse in={showDetails}>
                <Alert
                  severity="info"
                  action={
                    <IconButton 
                      size="small" 
                      onClick={this.copyErrorDetails}
                      aria-label="Copy error details"
                    >
                      <Report fontSize="small" />
                    </IconButton>
                  }
                  sx={{ 
                    textAlign: "left", 
                    mt: 2,
                    '& .MuiAlert-message': { width: '100%' }
                  }}
                  id="error-details-collapse"
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Technical Details
                  </Typography>
                  
                  <Box
                    component="pre"
                    sx={{
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflow: "auto",
                      maxHeight: 200,
                      mt: 1,
                      p: 1,
                      backgroundColor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    {this.state.error?.toString() || "No error message available."}
                    {"\n\nStack Trace:\n"}
                    {this.state.error?.stack || "No stack trace available."}
                    {"\n\nComponent Stack:\n"}
                    {this.state.errorInfo?.componentStack || "No component stack available."}
                  </Box>
                </Alert>
              </Collapse>
            </Box>
          )}

          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              mt: 3, 
              display: "block",
              lineHeight: 1.6
            }}
          >
            If this issue persists, please contact our support team and provide the Error ID above.
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
  customMessage: PropTypes.string,
  alwaysShowDetails: PropTypes.bool, // Force show details even in production
};

ErrorBoundary.defaultProps = {
  enableRecovery: import.meta.env.DEV, // Only enable recovery in development by default
  alwaysShowDetails: false,
};

export default ErrorBoundary;
