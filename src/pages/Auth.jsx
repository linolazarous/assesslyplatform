// src/pages/Auth.jsx
import { alpha } from '@mui/material/styles';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  TextField,
  Typography,
  Divider,
  CircularProgress,
  InputAdornment,
  IconButton,
  Container,
  Card,
  CardContent,
  Alert,
  Checkbox,
  FormControlLabel,
  Link,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google,
  Email,
  Lock,
  Person,
  Business,
  VpnKey,
  ArrowBack,
} from '@mui/icons-material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import api, { API_ENDPOINTS, TokenManager } from '../api'; // Updated import

/**
 * Authentication Page - Google OAuth & Email/Password
 * Multi-tenant B2B SaaS authentication with organization support
 */
export default function AuthPage({ 
  defaultMode = 'login',
  disableSignup = false,
  organizationId = null,
  inviteToken = null,
  compact = false,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isLoading: authLoading, setAuthData } = useAuth(); // Updated to include setAuthData
  const { showSnackbar, showSuccess, showError } = useSnackbar();

  // Parse URL parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      token: params.get('token'),
      error: params.get('error'),
      message: params.get('message'),
      mode: params.get('mode') || params.get('tab') || defaultMode,
      invite: params.get('invite') || inviteToken,
      organization: params.get('organization') || organizationId,
      email: params.get('email') || '',
      redirect: params.get('redirect') || location.state?.from?.pathname || '/dashboard',
    };
  }, [location.search, location.state, defaultMode, inviteToken, organizationId]);

  // Form state
  const [formData, setFormData] = useState({
    email: queryParams.email || '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: '',
    acceptTerms: false,
    rememberMe: false,
  });

  const [mode, setMode] = useState(queryParams.mode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [oauthLoading, setOauthLoading] = useState(false);

  // Handle URL parameters and OAuth callbacks
  useEffect(() => {
    const handleUrlParameters = async () => {
      // Handle OAuth errors
      if (queryParams.error) {
        showError(queryParams.message || `OAuth authentication failed: ${queryParams.error}`);
        setMode('login');
        return;
      }

      // Handle password reset token
      if (queryParams.token && queryParams.token.startsWith('reset_')) {
        setMode('reset');
        try {
          // Using the unified API
          const response = await api.post('/auth/verify-reset-token', { token: queryParams.token });
          if (response.data.success) {
            setFormData(prev => ({ ...prev, email: response.data.email }));
            showSnackbar('Please enter your new password', 'info');
          } else {
            showError('Invalid or expired reset token');
            setMode('login');
          }
        } catch (error) {
          console.error('Reset token verification error:', error);
          showError('Invalid reset token');
          setMode('login');
        }
      }

      // Handle invite tokens
      if (queryParams.invite) {
        setMode('signup');
        try {
          const response = await api.post('/auth/verify-invite', { token: queryParams.invite });
          if (response.data.success) {
            setFormData(prev => ({ 
              ...prev, 
              email: response.data.email,
              organizationId: response.data.organizationId,
              organizationName: response.data.organizationName,
            }));
          }
        } catch (error) {
          console.error('Invite verification error:', error);
          showError('Invalid or expired invitation');
        }
      }
    };

    handleUrlParameters();
  }, [queryParams, showError, showSnackbar]);

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser && !authLoading) {
      navigate(queryParams.redirect, { replace: true });
    }
  }, [currentUser, authLoading, navigate, queryParams.redirect]);

  const validateForm = useCallback(() => {
    const errors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (['login', 'signup', 'reset'].includes(mode) && formData.password) {
      if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = 'Must contain uppercase, lowercase, and numbers';
      }
    } else if (['login', 'signup'].includes(mode) && !formData.password) {
      errors.password = 'Password is required';
    }

    // Confirm password validation
    if (['reset', 'signup'].includes(mode) && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Name validation for signup
    if (mode === 'signup') {
      if (!formData.firstName?.trim()) {
        errors.firstName = 'First name is required';
      }
      if (!formData.lastName?.trim()) {
        errors.lastName = 'Last name is required';
      }
      if (!queryParams.organization && !formData.organizationName?.trim()) {
        errors.organizationName = 'Organization name is required';
      }
      if (!formData.acceptTerms) {
        errors.acceptTerms = 'You must accept the terms and conditions';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, mode, queryParams.organization]);

  const handleInputChange = useCallback((field) => (event) => {
    const value = field === 'acceptTerms' || field === 'rememberMe' 
      ? event.target.checked 
      : event.target.value;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [validationErrors]);

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let response;

      switch (mode) {
        case 'login':
          response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
            email: formData.email,
            password: formData.password,
            organizationId: queryParams.organization,
            rememberMe: formData.rememberMe,
          });
          break;

        case 'signup':
          response = await api.post(API_ENDPOINTS.AUTH.REGISTER, {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            organizationId: queryParams.organization,
            organizationName: formData.organizationName,
            inviteToken: queryParams.invite,
            acceptTerms: formData.acceptTerms,
          });
          break;

        case 'forgot':
          response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
            email: formData.email,
            redirectUrl: `${window.location.origin}/auth?token=reset_`,
          });
          break;

        case 'reset':
          response = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
            token: queryParams.token,
            password: formData.password,
          });
          break;

        default:
          throw new Error('Invalid authentication mode');
      }

      const result = response.data;
      
      if (result.success) {
        if (mode === 'login') {
          // Use TokenManager from unified API
          TokenManager.setTokens(
            result.token,
            formData.rememberMe ? result.refreshToken : null,
            result.expiresIn ? new Date(Date.now() + result.expiresIn * 1000).toISOString() : null
          );
          
          if (result.user) {
            TokenManager.setUserInfo(result.user);
            // Update auth context
            if (setAuthData) {
              setAuthData({ user: result.user, token: result.token });
            }
          }
          
          // Set tenant context if organization is available
          if (result.organization) {
            TokenManager.setTenantContext(result.organization.id);
          }
          
          showSuccess('Login successful!');
          navigate(queryParams.redirect, { replace: true });
          
        } else if (mode === 'signup') {
          if (result.requiresVerification) {
            showSuccess('Account created! Please check your email to verify your account.');
            setMode('login');
          } else {
            // Auto-login after signup
            TokenManager.setTokens(result.token, result.refreshToken);
            if (result.user) {
              TokenManager.setUserInfo(result.user);
              if (setAuthData) {
                setAuthData({ user: result.user, token: result.token });
              }
            }
            showSuccess('Account created successfully!');
            navigate(queryParams.redirect, { replace: true });
          }
        } else if (mode === 'forgot') {
          showSuccess('Password reset link sent to your email');
          setMode('login');
        } else if (mode === 'reset') {
          showSuccess('Password reset successful!');
          setMode('login');
        }
      } else {
        throw new Error(result.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      // Extract error message from unified error format
      const errorMessage = error?.message || 
                          error?.response?.data?.message || 
                          'Authentication failed. Please try again.';
      
      showError(errorMessage);
      
      // Clear form on invalid credentials
      if (error?.response?.status === 401 || error?.code === 'INVALID_CREDENTIALS') {
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = useCallback(async () => {
    try {
      setOauthLoading(true);
      
      // Generate OAuth state
      const state = JSON.stringify({
        mode,
        redirect: queryParams.redirect,
        organization: queryParams.organization,
        invite: queryParams.invite,
        timestamp: Date.now(),
      });

      // Encode state for URL
      const encodedState = encodeURIComponent(state);
      
      // Use unified API base URL
      const googleAuthUrl = `${API_ENDPOINTS.AUTH.GOOGLE}?state=${encodedState}`;
      
      // Redirect to Google OAuth
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error('Google OAuth error:', error);
      showError('Failed to initiate Google authentication');
      setOauthLoading(false);
    }
  }, [mode, queryParams.redirect, queryParams.organization, queryParams.invite, showError]);

  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    setValidationErrors({});
    
    // Clear password fields when switching modes
    setFormData(prev => ({
      ...prev,
      password: '',
      confirmPassword: '',
    }));
    
    navigate(`/auth?mode=${newMode}${queryParams.organization ? `&organization=${queryParams.organization}` : ''}`, { replace: true });
  }, [navigate, queryParams.organization]);

  // Memoized render functions for better performance
  const renderHeader = useMemo(() => () => (
    <Box sx={{ textAlign: 'center', mb: compact ? 3 : 4 }}>
      <Typography variant="h4" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
        Assessly
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
        {mode === 'reset' ? 'Reset Password' :
         mode === 'forgot' ? 'Forgot Password' :
         mode === 'signup' ? 'Create Account' : 'Welcome Back'}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {mode === 'reset' ? 'Enter your new password below' :
         mode === 'forgot' ? "We'll send a reset link to your email" :
         mode === 'signup' ? 'Join our platform to start creating assessments' :
         'Sign in to your account to continue'}
      </Typography>
    </Box>
  ), [mode, compact]);

  const renderEmailField = useMemo(() => () => (
    <TextField
      fullWidth
      label="Email Address"
      type="email"
      value={formData.email}
      onChange={handleInputChange('email')}
      error={!!validationErrors.email}
      helperText={validationErrors.email}
      disabled={mode === 'reset' || !!queryParams.invite}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Email color="action" />
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2 }}
      autoComplete="email"
    />
  ), [formData.email, validationErrors.email, mode, queryParams.invite, handleInputChange]);

  const renderPasswordField = useMemo(() => () => (
    <TextField
      fullWidth
      label="Password"
      type={showPassword ? 'text' : 'password'}
      value={formData.password}
      onChange={handleInputChange('password')}
      error={!!validationErrors.password}
      helperText={validationErrors.password}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Lock color="action" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={() => setShowPassword(!showPassword)}
              edge="end"
              aria-label="toggle password visibility"
              size="small"
            >
              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2 }}
      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
    />
  ), [formData.password, validationErrors.password, showPassword, mode, handleInputChange]);

  const renderConfirmPasswordField = useMemo(() => () => (
    <TextField
      fullWidth
      label="Confirm Password"
      type={showPassword ? 'text' : 'password'}
      value={formData.confirmPassword}
      onChange={handleInputChange('confirmPassword')}
      error={!!validationErrors.confirmPassword}
      helperText={validationErrors.confirmPassword}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <VpnKey color="action" />
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2 }}
      autoComplete="new-password"
    />
  ), [formData.confirmPassword, validationErrors.confirmPassword, showPassword, handleInputChange]);

  const renderNameFields = useMemo(() => () => (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <TextField
        fullWidth
        label="First Name"
        value={formData.firstName}
        onChange={handleInputChange('firstName')}
        error={!!validationErrors.firstName}
        helperText={validationErrors.firstName}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Person color="action" />
            </InputAdornment>
          ),
        }}
        autoComplete="given-name"
      />
      <TextField
        fullWidth
        label="Last Name"
        value={formData.lastName}
        onChange={handleInputChange('lastName')}
        error={!!validationErrors.lastName}
        helperText={validationErrors.lastName}
        autoComplete="family-name"
      />
    </Box>
  ), [formData.firstName, formData.lastName, validationErrors.firstName, validationErrors.lastName, handleInputChange]);

  const renderOrganizationField = useMemo(() => () => (
    <TextField
      fullWidth
      label="Organization Name"
      value={formData.organizationName}
      onChange={handleInputChange('organizationName')}
      error={!!validationErrors.organizationName}
      helperText={validationErrors.organizationName || 'For new organizations only'}
      disabled={!!queryParams.organization}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Business color="action" />
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2 }}
      autoComplete="organization"
    />
  ), [formData.organizationName, validationErrors.organizationName, queryParams.organization, handleInputChange]);

  const renderTermsCheckbox = useMemo(() => () => (
    <FormControlLabel
      control={
        <Checkbox
          checked={formData.acceptTerms}
          onChange={handleInputChange('acceptTerms')}
          color="primary"
          required
        />
      }
      label={
        <Typography variant="body2">
          I agree to the{' '}
          <Link component={RouterLink} to="/terms" color="primary">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link component={RouterLink} to="/privacy" color="primary">
            Privacy Policy
          </Link>
        </Typography>
      }
      sx={{ 
        mb: 2,
        '& .MuiFormControlLabel-label': {
          color: validationErrors.acceptTerms ? theme.palette.error.main : 'inherit'
        }
      }}
    />
  ), [formData.acceptTerms, validationErrors.acceptTerms, theme, handleInputChange]);

  const renderRememberMe = useMemo(() => () => (
    <FormControlLabel
      control={
        <Checkbox
          checked={formData.rememberMe}
          onChange={handleInputChange('rememberMe')}
          color="primary"
        />
      }
      label="Remember me"
      sx={{ mb: 2 }}
    />
  ), [formData.rememberMe, handleInputChange]);

  const renderSubmitButton = useMemo(() => () => {
    const buttonText = {
      login: 'Sign In',
      signup: 'Create Account',
      forgot: 'Send Reset Link',
      reset: 'Reset Password',
    }[mode];

    return (
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        disabled={loading}
        sx={{ 
          py: 1.5, 
          mb: 3,
          fontWeight: 600,
          fontSize: '1rem',
          '&:disabled': {
            backgroundColor: theme.palette.action.disabledBackground,
          }
        }}
      >
        {loading ? (
          <CircularProgress 
            size={24} 
            color="inherit" 
            sx={{ color: theme.palette.primary.contrastText }} 
          />
        ) : buttonText}
      </Button>
    );
  }, [mode, loading, theme]);

  const renderGoogleAuthButton = useMemo(() => () => (
    <Button
      variant="outlined"
      fullWidth
      size="large"
      startIcon={oauthLoading ? <CircularProgress size={20} /> : <Google />}
      onClick={handleGoogleAuth}
      disabled={oauthLoading || loading}
      sx={{ 
        py: 1.5,
        mb: 3,
        borderColor: theme.palette.divider,
        '&:hover': {
          borderColor: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.grey[100], 0.5),
        },
        '&:disabled': {
          borderColor: theme.palette.action.disabled,
          color: theme.palette.action.disabled,
        }
      }}
    >
      Continue with Google
    </Button>
  ), [oauthLoading, loading, theme, handleGoogleAuth]);

  const renderDivider = useMemo(() => () => (
    <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
      <Divider sx={{ flex: 1 }} />
      <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
        OR
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  ), []);

  const renderModeLinks = useMemo(() => () => {
    if (mode === 'login') {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Don't have an account?{' '}
            <Button
              color="primary"
              onClick={() => switchMode('signup')}
              disabled={disableSignup}
              size="small"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Sign up
            </Button>
          </Typography>
          <Button
            color="secondary"
            onClick={() => switchMode('forgot')}
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Forgot your password?
          </Button>
        </Box>
      );
    }

    if (mode === 'signup') {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Button
              color="primary"
              onClick={() => switchMode('login')}
              size="small"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Sign in
            </Button>
          </Typography>
        </Box>
      );
    }

    if (mode === 'forgot' || mode === 'reset') {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <Button
            color="primary"
            onClick={() => switchMode('login')}
            startIcon={<ArrowBack />}
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back to Sign In
          </Button>
        </Box>
      );
    }

    return null;
  }, [mode, disableSignup, switchMode]);

  const renderForm = useMemo(() => {
    if (authLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <form onSubmit={handleEmailAuth} noValidate>
        {renderHeader()}
        
        {queryParams.invite && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            icon={<Business />}
          >
            <Typography variant="body2" component="div">
              You've been invited to join an organization. Complete your registration below.
            </Typography>
          </Alert>
        )}

        {renderEmailField()}

        {mode === 'signup' && renderNameFields()}
        {mode === 'signup' && !queryParams.organization && renderOrganizationField()}

        {['login', 'signup', 'reset'].includes(mode) && renderPasswordField()}
        {['reset', 'signup'].includes(mode) && renderConfirmPasswordField()}

        {mode === 'login' && renderRememberMe()}
        {mode === 'signup' && renderTermsCheckbox()}

        {renderSubmitButton()}

        {mode !== 'forgot' && mode !== 'reset' && (
          <>
            {renderDivider()}
            {renderGoogleAuthButton()}
          </>
        )}

        {renderModeLinks()}
      </form>
    );
  }, [
    authLoading, handleEmailAuth, renderHeader, queryParams.invite, renderEmailField, 
    mode, renderNameFields, queryParams.organization, renderOrganizationField, 
    renderPasswordField, renderConfirmPasswordField, renderRememberMe, renderTermsCheckbox, 
    renderSubmitButton, renderDivider, renderGoogleAuthButton, renderModeLinks
  ]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
        }}
      >
        <Card
          elevation={2}
          sx={{
            width: '100%',
            maxWidth: compact ? 400 : 480,
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            '&:before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            },
          }}
        >
          <CardContent sx={{ p: compact ? 3 : 4, pt: compact ? 4 : 5 }}>
            {renderForm}
            
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                display: 'block', 
                textAlign: 'center', 
                mt: 4,
                pt: 2,
                borderTop: `1px solid ${theme.palette.divider}`,
                fontSize: '0.75rem',
                lineHeight: 1.5,
              }}
            >
              By continuing, you agree to our Terms of Service and Privacy Policy.
              <br />
              Need help?{' '}
              <Link 
                component={RouterLink} 
                to="/support" 
                color="primary"
                sx={{ fontSize: '0.75rem', fontWeight: 600 }}
              >
                Contact Support
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

AuthPage.propTypes = {
  defaultMode: PropTypes.oneOf(['login', 'signup', 'forgot', 'reset']),
  disableSignup: PropTypes.bool,
  organizationId: PropTypes.string,
  inviteToken: PropTypes.string,
  compact: PropTypes.bool,
};

AuthPage.defaultProps = {
  defaultMode: 'login',
  disableSignup: false,
  organizationId: null,
  inviteToken: null,
  compact: false,
};
