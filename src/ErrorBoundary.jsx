// src/ErrorBoundary.jsx
import React, { useState, useEffect, useRef, useCallback, memo, createContext, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Box, Typography, Button, Container, Paper, Alert, Stack, Divider, CircularProgress,
  Chip, Link, alpha, Collapse, Tooltip, Fade, Zoom, useTheme
} from '@mui/material';
import {
  Refresh, Home, ContentCopy, ExpandMore, ExpandLess, BugReport,
  AutoFixHigh, ErrorOutline, CheckCircle, Warning, Info, Send, SupportAgent
} from '@mui/icons-material';

// ===================== CONSTANTS =====================
export const ERROR_CATEGORIES = {
  NETWORK: 'network',
  CHUNK: 'chunk',
  SYNTAX: 'syntax',
  RUNTIME: 'runtime',
  INTEGRATION: 'integration',
  UNKNOWN: 'unknown',
};

export const RECOVERY_STRATEGIES = {
  RELOAD: 'reload',
  RESET_STATE: 'reset_state',
  CLEAR_CACHE: 'clear_cache',
  FALLBACK: 'fallback',
};

// ===================== UTILITIES =====================
export const generateErrorId = () => `err_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const getStorageKey = (key) => `assessly_${key}`;

const getUserInfo = () => {
  try {
    const userData = localStorage.getItem(getStorageKey('user'));
    const orgData = localStorage.getItem(getStorageKey('organization'));
    return {
      user: userData ? JSON.parse(userData) : null,
      organization: orgData ? JSON.parse(orgData) : null,
    };
  } catch {
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
  } catch {
    return { error: 'Failed to get browser info' };
  }
};

export const categorizeError = (error) => {
  if (!error) return ERROR_CATEGORIES.UNKNOWN;
  const { name = '', message = '' } = error;

  if (name.includes('Network') || message.includes('Network') || message.includes('fetch') || message.includes('offline')) {
    return ERROR_CATEGORIES.NETWORK;
  }
  if (name.includes('ChunkLoad') || message.includes('chunk') || message.includes('dynamic import')) {
    return ERROR_CATEGORIES.CHUNK;
  }
  if (name.includes('Syntax') || message.includes('Unexpected token') || message.includes('Invalid or unexpected token')) {
    return ERROR_CATEGORIES.SYNTAX;
  }
  if (message.includes('API') || message.includes('CORS') || message.includes('auth') || message.includes('token')) {
    return ERROR_CATEGORIES.INTEGRATION;
  }
  if (name.includes('TypeError') || name.includes('ReferenceError') || name.includes('RangeError')) {
    return ERROR_CATEGORIES.RUNTIME;
  }
  return ERROR_CATEGORIES.UNKNOWN;
};

export const isRecoverableError = (error) => {
  const category = categorizeError(error);
  return [ERROR_CATEGORIES.NETWORK, ERROR_CATEGORIES.CHUNK, ERROR_CATEGORIES.INTEGRATION].includes(category);
};

export const getRecoveryStrategy = (error) => {
  const category = categorizeError(error);
  switch (category) {
    case ERROR_CATEGORIES.NETWORK: return RECOVERY_STRATEGIES.RELOAD;
    case ERROR_CATEGORIES.CHUNK: return RECOVERY_STRATEGIES.CLEAR_CACHE;
    case ERROR_CATEGORIES.INTEGRATION: return RECOVERY_STRATEGIES.RESET_STATE;
    default: return RECOVERY_STRATEGIES.FALLBACK;
  }
};

export const formatErrorDetails = (error, errorInfo, errorId) => {
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

User ID: ${userInfo?.user?.id || 'Not authenticated'}
Organization: ${userInfo?.organization?.id || 'None'}

Error: ${error?.name || 'Unknown'} - ${error?.message || 'No message'}
Stack Trace: ${error?.stack || 'No stack trace available'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}

Browser: ${browserInfo.userAgent || 'Unknown'}, ${browserInfo.language || 'Unknown'}, ${browserInfo.platform || 'Unknown'}
Online: ${browserInfo.online ? 'Yes' : 'No'}, Timezone: ${browserInfo.timezone || 'Unknown'}
`.trim();
};

// ===================== ERROR REPORTING HOOK =====================
export const useErrorReporting = (errorId, error, errorInfo, userId, organizationId) => {
  const hasReportedRef = useRef(false);

  useEffect(() => {
    if (hasReportedRef.current || !error) return;
    hasReportedRef.current = true;

    const reportError = async () => {
      const payload = {
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
        userId: userId || getUserInfo()?.user?.id,
        organizationId: organizationId || getUserInfo()?.organization?.id,
        browserInfo: getBrowserInfo(),
      };

      if (import.meta.env.DEV) {
        console.group('🚨 ErrorBoundary - Detailed Error');
        console.error(payload);
        console.groupEnd();
      }

      try {
        await fetch('/api/v1/errors/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, source: 'error_boundary' }),
        });
      } catch {
        console.warn('Error service unreachable, storing offline.');
        const offlineErrors = JSON.parse(localStorage.getItem('assessly_offline_errors') || '[]');
        offlineErrors.push(payload);
        localStorage.setItem('assessly_offline_errors', JSON.stringify(offlineErrors.slice(-50)));
      }
    };

    reportError();
  }, [errorId, error, errorInfo, userId, organizationId]);
};

// ===================== COMPONENTS =====================
const ErrorIcon = memo(({ category, size = 80 }) => {
  const theme = useTheme();
  const color = category === ERROR_CATEGORIES.NETWORK ? theme.palette.warning.main : theme.palette.error.main;

  return (
    <Box sx={{ position: 'relative' }}>
      <ErrorOutline sx={{ fontSize: size, color }} />
      {category === ERROR_CATEGORIES.NETWORK && (
        <Warning sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', fontSize: size * 0.4, color: theme.palette.warning.contrastText
        }} />
      )}
    </Box>
  );
});

ErrorIcon.displayName = 'ErrorIcon';

const ErrorDisplay = ({
  error, errorInfo, errorId, recoveryAttempts, isRecovering, copySuccess, showDetails,
  onReload, onGoHome, onReset, onToggleDetails, onCopyErrorDetails, onCreateSupportTicket,
  enableRecovery, customMessage, alwaysShowDetails, showSupportOptions, errorCategory, recoveryStrategy
}) => {
  const theme = useTheme();
  const showTechDetails = import.meta.env.DEV || alwaysShowDetails;

  if (isRecovering) {
    return (
      <Fade in={isRecovering}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2, p: 3 }}>
          <CircularProgress size={60} thickness={4} />
          <Typography>Attempting to recover...</Typography>
          <Typography variant="body2">Strategy: {recoveryStrategy.replace('_', ' ').toUpperCase()}</Typography>
          <Typography variant="caption">Attempt {recoveryAttempts + 1} of 3</Typography>
        </Box>
      </Fade>
    );
  }

  const errorTitle = (() => {
    switch (errorCategory) {
      case ERROR_CATEGORIES.NETWORK: return 'Network Issue';
      case ERROR_CATEGORIES.CHUNK: return 'Loading Issue';
      case ERROR_CATEGORIES.SYNTAX: return 'Syntax Error';
      case ERROR_CATEGORIES.INTEGRATION: return 'Service Error';
      default: return 'Something went wrong';
    }
  })();

  const errorMessage = customMessage || (() => {
    switch (errorCategory) {
      case ERROR_CATEGORIES.NETWORK: return 'Network error. Check your connection.';
      case ERROR_CATEGORIES.CHUNK: return 'Problem loading the app.';
      case ERROR_CATEGORIES.INTEGRATION: return 'Service integration failed.';
      default: return 'Unexpected issue. Our team has been notified.';
    }
  })();

  const handleCopy = useCallback(async () => {
    const details = formatErrorDetails(error, errorInfo, errorId);
    await onCopyErrorDetails(details);
  }, [error, errorInfo, errorId, onCopyErrorDetails]);

  return (
    <Zoom in>
      <Container maxWidth="md" sx={{ mt: 8, mb: 8 }} role="alert" aria-live="assertive">
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, borderLeft: '6px solid', borderColor: errorCategory === ERROR_CATEGORIES.NETWORK ? 'warning.main' : 'error.main' }}>
          <Chip icon={<BugReport />} label={`Error ID: ${errorId}`} color={errorCategory === ERROR_CATEGORIES.NETWORK ? "warning" : "error"} size="small" sx={{ mb: 2 }} />
          <ErrorIcon category={errorCategory} size={80} />
          <Typography variant="h4" color={errorCategory === ERROR_CATEGORIES.NETWORK ? "warning.main" : "error"} gutterBottom>{errorTitle}</Typography>
          <Typography sx={{ mb: 4 }}>{errorMessage}</Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" mb={4}>
            <Button variant="contained" color={errorCategory === ERROR_CATEGORIES.NETWORK ? "warning" : "primary"} startIcon={<Refresh />} onClick={onReload}>Reload Page</Button>
            <Button variant="outlined" startIcon={<Home />} onClick={onGoHome}>Go Home</Button>
            {enableRecovery && isRecoverableError(error) && <Button startIcon={<AutoFixHigh />} onClick={onReset}>Try Again</Button>}
          </Stack>

          {showSupportOptions && (
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button startIcon={copySuccess ? <CheckCircle /> : <ContentCopy />} onClick={handleCopy} color={copySuccess ? "success" : "primary"}>{copySuccess ? "Copied!" : "Copy Details"}</Button>
              <Button startIcon={<SupportAgent />} onClick={onCreateSupportTicket}>Support Ticket</Button>
              <Button startIcon={<Send />} component="a" href={`mailto:assesslyinc@gmail.com?subject=Error Report ${errorId}`}>Email Support</Button>
            </Stack>
          )}

          {showTechDetails && (
            <Box sx={{ mt: 4 }}>
              <Button endIcon={showDetails ? <ExpandLess /> : <ExpandMore />} onClick={onToggleDetails}>
                {showDetails ? "Hide Technical Details" : "Show Technical Details"}
              </Button>
              <Collapse in={showDetails}>
                <Alert severity="info" sx={{ textAlign: 'left', mt: 2 }}>
                  <Box component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 250, overflow: 'auto', backgroundColor: 'grey.50', p: 2, borderRadius: 1 }}>
                    {formatErrorDetails(error, errorInfo, errorId)}
                  </Box>
                </Alert>
              </Collapse>
            </Box>
          )}
        </Paper>
      </Container>
    </Zoom>
  );
};

// ===================== MAIN FUNCTIONAL ERROR BOUNDARY =====================
const ErrorBoundary = ({
  children, userId, organizationId, enableRecovery = true, customMessage, alwaysShowDetails = import.meta.env.DEV,
  showSupportOptions = true, fallback
}) => {
  const [error, setError] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [errorId, setErrorId] = useState(generateErrorId());
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorCategory, setErrorCategory] = useState(ERROR_CATEGORIES.UNKNOWN);
  const [recoveryStrategy, setRecoveryStrategy] = useState(RECOVERY_STRATEGIES.FALLBACK);
  const [showDetails, setShowDetails] = useState(false);

  useErrorReporting(errorId, error, errorInfo, userId, organizationId);

  const handleError = (err, info) => {
    setError(err);
    setErrorInfo(info);
    const category = categorizeError(err);
    setErrorCategory(category);
    setRecoveryStrategy(getRecoveryStrategy(err));
    setErrorId(generateErrorId());
    if (isRecoverableError(err)) attemptRecovery();
  };

  const attemptRecovery = () => {
    if (recoveryAttempts < 3) {
      setIsRecovering(true);
      setTimeout(() => {
        setRecoveryAttempts(prev => prev + 1);
        setIsRecovering(false);
      }, 2000 * (recoveryAttempts + 1));
    }
  };

  const handleReset = () => {
    setError(null); setErrorInfo(null); setErrorId(generateErrorId()); setRecoveryAttempts(0);
    setIsRecovering(false); setCopySuccess(false); setErrorCategory(ERROR_CATEGORIES.UNKNOWN); setRecoveryStrategy(RECOVERY_STRATEGIES.FALLBACK);
  };

  const handleCopy = async (details) => {
    try { await navigator.clipboard.writeText(details); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 3000); } catch {}
  };

  const handleCreateSupportTicket = () => window.open(`https://support.assessly.com/new?error=${errorId}`, '_blank');

  if (error) {
    if (fallback) return typeof fallback === 'function' ? fallback(error, errorInfo, errorId) : fallback;

    return (
      <ErrorDisplay
        error={error} errorInfo={errorInfo} errorId={errorId} recoveryAttempts={recoveryAttempts} isRecovering={isRecovering}
        copySuccess={copySuccess} showDetails={showDetails} onReload={() => window.location.reload()} onGoHome={() => window.location.href = '/'}
        onReset={handleReset} onToggleDetails={() => setShowDetails(prev => !prev)} onCopyErrorDetails={handleCopy}
        onCreateSupportTicket={handleCreateSupportTicket} enableRecovery={enableRecovery && isRecoverableError(error)}
        customMessage={customMessage} alwaysShowDetails={alwaysShowDetails} showSupportOptions={showSupportOptions}
        errorCategory={errorCategory} recoveryStrategy={recoveryStrategy}
      />
    );
  }

  return children;
};

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  userId: PropTypes.string,
  organizationId: PropTypes.string,
  enableRecovery: PropTypes.bool,
  customMessage: PropTypes.string,
  alwaysShowDetails: PropTypes.bool,
  showSupportOptions: PropTypes.bool,
  fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
};

export default ErrorBoundary;

// ===================== HOC =====================
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => (props) => (
  <ErrorBoundary {...errorBoundaryProps}><WrappedComponent {...props} /></ErrorBoundary>
);

// ===================== CONTEXT =====================
export const ErrorContext = createContext({ reportError: () => {}, clearError: () => {} });
export const useErrorHandler = () => useContext(ErrorContext);
