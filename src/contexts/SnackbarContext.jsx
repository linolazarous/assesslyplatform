// src/contexts/SnackbarContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

const SnackbarContext = createContext(null);

export const useSnackbar = () => {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return ctx;
};

export const SnackbarProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({
    id: 0,
    open: false,
    message: '',
    severity: 'info',
    title: null,
    autoHideDuration: 6000,
    action: null,
    vertical: 'bottom',
    horizontal: 'left',
    onClose: null,
  });

  const showSnackbar = useCallback((message, severity = 'info', options = {}) => {
    setSnackbar({
      id: Date.now(),
      open: true,
      message,
      severity,
      title: options.title ?? null,
      autoHideDuration: options.autoHideDuration ?? 6000,
      action: options.action ?? null,
      vertical: options.vertical ?? 'bottom',
      horizontal: options.horizontal ?? 'left',
      onClose: options.onClose ?? null,
    });
  }, []);

  const hideSnackbar = useCallback((event, reason) => {
    if (reason === 'clickaway') return;

    setSnackbar(prev => {
      prev.onClose?.(event, reason);
      return { ...prev, open: false };
    });
  }, []);

  const handleExited = () => {
    setSnackbar(prev => ({ ...prev, message: '' }));
  };

  const showSuccess = useCallback(
    (msg, opt = {}) => showSnackbar(msg, 'success', opt),
    [showSnackbar]
  );
  const showError = useCallback(
    (msg, opt = {}) =>
      showSnackbar(msg, 'error', {
        title: 'Error',
        autoHideDuration: 8000,
        ...opt,
      }),
    [showSnackbar]
  );
  const showWarning = useCallback(
    (msg, opt = {}) => showSnackbar(msg, 'warning', opt),
    [showSnackbar]
  );
  const showInfo = useCallback(
    (msg, opt = {}) => showSnackbar(msg, 'info', opt),
    [showSnackbar]
  );

  return (
    <SnackbarContext.Provider
      value={{
        showSnackbar,
        hideSnackbar,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        snackbarState: snackbar,
      }}
    >
      {children}
      <Snackbar
        key={snackbar.id}
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration}
        onClose={hideSnackbar}
        anchorOrigin={{
          vertical: snackbar.vertical,
          horizontal: snackbar.horizontal,
        }}
        TransitionProps={{ onExited: handleExited }}
      >
        <Alert
          onClose={hideSnackbar}
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
          action={snackbar.action}
          sx={{ width: '100%' }}
        >
          {snackbar.title && <AlertTitle>{snackbar.title}</AlertTitle>}
          {snackbar.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

SnackbarProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
