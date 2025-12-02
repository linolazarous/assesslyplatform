// src/contexts/SnackbarContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

/**
 * Snackbar Context for managing application-wide notifications
 * Provides a consistent way to show success, error, warning, and info messages
 */
const SnackbarContext = createContext({
  showSnackbar: () => {},
  hideSnackbar: () => {},
  snackbarState: null,
});

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

export const SnackbarProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info', // 'success', 'error', 'warning', 'info'
    title: null,
    autoHideDuration: 6000,
    action: null,
    vertical: 'bottom',
    horizontal: 'left',
  });

  const showSnackbar = useCallback((
    message,
    severity = 'info',
    options = {}
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
      title: options.title || null,
      autoHideDuration: options.autoHideDuration || 6000,
      action: options.action || null,
      vertical: options.vertical || 'bottom',
      horizontal: options.horizontal || 'left',
      onClose: options.onClose || null,
    });
  }, []);

  const hideSnackbar = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handleExited = () => {
    setSnackbar(prev => ({ ...prev, message: '' }));
  };

  // Pre-configured snackbar methods for common use cases
  const showSuccess = useCallback((message, options = {}) => {
    showSnackbar(message, 'success', options);
  }, [showSnackbar]);

  const showError = useCallback((message, options = {}) => {
    const defaultOptions = {
      title: 'Error',
      autoHideDuration: 8000,
      ...options,
    };
    showSnackbar(message, 'error', defaultOptions);
  }, [showSnackbar]);

  const showWarning = useCallback((message, options = {}) => {
    showSnackbar(message, 'warning', options);
  }, [showSnackbar]);

  const showInfo = useCallback((message, options = {}) => {
    showSnackbar(message, 'info', options);
  }, [showSnackbar]);

  const value = {
    showSnackbar,
    hideSnackbar,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    snackbarState: snackbar,
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        key={snackbar.message}
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration}
        onClose={hideSnackbar}
        anchorOrigin={{
          vertical: snackbar.vertical,
          horizontal: snackbar.horizontal,
        }}
        TransitionProps={{ onExited: handleExited }}
        sx={{
          '& .MuiSnackbarContent-root': {
            maxWidth: 600,
          },
        }}
      >
        <Alert
          onClose={hideSnackbar}
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
          sx={{ 
            width: '100%',
            alignItems: 'center',
            '& .MuiAlert-message': {
              flex: 1,
            },
          }}
          action={snackbar.action}
        >
          {snackbar.title && (
            <AlertTitle sx={{ mb: 0.5 }}>
              {snackbar.title}
            </AlertTitle>
          )}
          {snackbar.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

SnackbarProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default SnackbarContext;
