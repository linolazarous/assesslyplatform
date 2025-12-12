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
 * ðŸš€ Production-Ready ErrorBoundary
 * - Clean design
 * - Error tracking integration ready
 * - Copy error details
 * - Safe recovery options
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
    const payload = {
      id: this.state.errorId,
      message: error?.toString(),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    console.error("ðŸš¨ ErrorBoundary caught an error:", payload);

    // ðŸ”§ Optional: Send to external service (e.g., Sentry)
    if (this.props.onError) {
      this.props.onError(payload);
    }
  };

  handleReload = () => window.location.reload();
  handleGoHome = () => (window.location.href = "/");
  handleReset = () => this.setState({ hasError: false, error: null, errorInfo: null });
  toggleDetails = () => this.setState((prev) => ({ showDetails: !prev.showDetails }));

  copyErrorDetails = async () => {
    const { error, errorInfo, errorId } = this.state;
    const details = `Error ID: ${errorId}\nTime: ${new Date().toLocaleString()}\nURL: ${
      window.location.href
    }\nError: ${error?.toString()}\nStack: ${error?.stack}\nComponent Stack: ${
      errorInfo?.componentStack
    }`;
    try {
      await navigator.clipboard.writeText(details);
      alert("Error details copied to clipboard");
    } catch {
      alert("Failed to copy error details");
    }
  };

  renderErrorContent() {
    const { showDetails, errorId } = this.state;
    const { enableRecovery = true } = this.props;

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
      >
        <Paper elevation={8} sx={{ p: { xs: 3, md: 5 }, maxWidth: 600, borderRadius: 3, textAlign: "center" }}>
          <BugReport sx={{ fontSize: 64, color: "error.main", mb: 2 }} />
          <Typography variant="h4" color="error" fontWeight="bold" gutterBottom>
            Something Went Wrong
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Weâ€™ve encountered an unexpected issue. Please try again.
            {errorId && (
              <Box component="span" sx={{ display: "block", mt: 1, fontFamily: "monospace" }}>
                Error ID: {errorId}
              </Box>
            )}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" mb={3}>
            <Button variant="contained" color="primary" startIcon={<Refresh />} onClick={this.handleReload}>
              Refresh
            </Button>
            <Button variant="outlined" startIcon={<Home />} onClick={this.handleGoHome}>
              Home
            </Button>
            {enableRecovery && (
              <Button variant="text" onClick={this.handleReset}>
                Try Again
              </Button>
            )}
          </Stack>

          {/* ðŸ§© Toggle Technical Details (only in dev) */}
          {process.env.NODE_ENV === "development" && (
            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                variant="text"
                endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
                onClick={this.toggleDetails}
              >
                {showDetails ? "Hide" : "Show"} Details
              </Button>
              <Collapse in={showDetails}>
                <Alert
                  severity="error"
                  action={
                    <IconButton size="small" onClick={this.copyErrorDetails}>
                      <Report fontSize="small" />
                    </IconButton>
                  }
                  sx={{ textAlign: "left", mt: 2 }}
                >
                  <Typography variant="subtitle2">Technical Details</Typography>
                  <Box
                    component="pre"
                    sx={{
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      overflow: "auto",
                      maxHeight: 180,
                      mt: 1,
                    }}
                  >
                    {this.state.error?.stack || "No stack trace available."}
                  </Box>
                </Alert>
              </Collapse>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: "block" }}>
            Contact support with the above Error ID if this issue persists.
          </Typography>
        </Paper>
      </Box>
    );
  }

  render() {
    return this.state.hasError ? this.renderErrorContent() : this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onError: PropTypes.func,
  enableRecovery: PropTypes.bool,
};

ErrorBoundary.defaultProps = {
  enableRecovery: process.env.NODE_ENV === "development",
};

export default ErrorBoundary;
