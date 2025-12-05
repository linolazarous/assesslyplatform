// src/pages/Auth.jsx
import { alpha } from '@mui/material/styles';
import React, { useState, useEffect, useMemo } from 'react';
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
import authApi from '../api/authApi';

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
  const { currentUser, isLoading: authLoading } = useAuth();
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
          const response = await authApi.verifyResetToken(queryParams.token);
          if (response.success) {
            setFormData(prev => ({ ...prev, email: response.data.email }));
            showSnackbar('Please enter your new password', 'info');
          } else {
            showError('Invalid or expired reset token');
            setMode('login');
          }
        } catch (error) {
          showError('Invalid reset token');
          setMode('login');
        }
      }

      // Handle invite tokens
      if (queryParams.invite) {
        setMode('signup');
        try {
          const response = await authApi.verifyInvite(queryParams.invite);
          if (response.success) {
            setFormData(prev => ({ 
              ...prev, 
              email: response.data.email,
              organizationId: response.data.organizationId,
              organizationName: response.data.organizationName,
            }));
          }
        } catch (error) {
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

  const validateForm = () => {
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
  };

  const handleInputChange = (field) => (event) => {
    const value = field === 'acceptTerms' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

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
          response = await authApi.login({
            email: formData.email,
            password: formData.password,
            organizationId: queryParams.organization,
            rememberMe: formData.rememberMe,
          });
          break;

        case 'signup':
          response = await authApi.register({
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
          response = await authApi.forgotPassword({
            email: formData.email,
            redirectUrl: `${window.location.origin}/auth?token=reset_`,
          });
          break;

        case 'reset':
          response = await authApi.resetPassword({
            token: queryParams.token,
            password: formData.password,
          });
          break;

        default:
          throw new Error('Invalid authentication mode');
      }

      if (response.success) {
        if (mode === 'login') {
          // Store token and redirect
          localStorage.setItem('accessToken', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          if (formData.rememberMe) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
          }
          showSuccess('Login successful!');
          navigate(queryParams.redirect, { replace: true });
        } else if (mode === 'signup') {
          if (response.data.requiresVerification) {
            showSuccess('Account created! Please check your email to verify your account.');
            setMode('login');
          } else {
            // Auto-login after signup
            localStorage.setItem('accessToken', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
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
        throw new Error(response.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Authentication failed';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
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
      
      // Google OAuth URL - FIXED: Use Vite environment variable
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const googleAuthUrl = `${apiUrl}/api/v1/auth/google?state=${encodedState}`;
      
      // Redirect to Google OAuth
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error('Google OAuth error:', error);
      showError('Failed to initiate Google authentication');
      setOauthLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setValidationErrors({});
    navigate(`/auth?mode=${newMode}${queryParams.organization ? `&organization=${queryParams.organization}` : ''}`, { replace: true });
  };

  const renderHeader = () => (
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
  );

  const renderEmailField = () => (
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
    />
  );

  const renderPasswordField = () => (
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
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2 }}
    />
  );

  const renderConfirmPasswordField = () => (
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
    />
  );

  const renderNameFields = () => (
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
      />
      <TextField
        fullWidth
        label="Last Name"
        value={formData.lastName}
        onChange={handleInputChange('lastName')}
        error={!!validationErrors.lastName}
        helperText={validationErrors.lastName}
      />
    </Box>
  );

  const renderOrganizationField = () => (
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
    />
  );

  const renderTermsCheckbox = () => (
    <FormControlLabel
      control={
        <Checkbox
          checked={formData.acceptTerms}
          onChange={handleInputChange('acceptTerms')}
          color="primary"
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
  );

  const renderRememberMe = () => (
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
  );

  const renderSubmitButton = () => {
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
        }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : buttonText}
      </Button>
    );
  };

  const renderGoogleAuthButton = () => (
    <Button
      variant="outlined"
      fullWidth
      size="large"
      startIcon={oauthLoading ? <CircularProgress size={20} /> : <Google />}
      onClick={handleGoogleAuth}
      disabled={oauthLoading}
      sx={{ 
        py: 1.5,
        mb: 3,
        borderColor: theme.palette.divider,
        '&:hover': {
          borderColor: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.grey[100], 0.5),
        },
      }}
    >
      Continue with Google
    </Button>
  );

  const renderDivider = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
      <Divider sx={{ flex: 1 }} />
      <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
        OR
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  );

  const renderModeLinks = () => {
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
              sx={{ textTransform: 'none' }}
            >
              Sign up
            </Button>
          </Typography>
          <Button
            color="secondary"
            onClick={() => switchMode('forgot')}
            size="small"
            sx={{ textTransform: 'none' }}
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
              sx={{ textTransform: 'none' }}
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
            sx={{ textTransform: 'none' }}
          >
            Back to Sign In
          </Button>
        </Box>
      );
    }

    return null;
  };

  const renderForm = () => {
    if (authLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <form onSubmit={handleEmailAuth}>
        {renderHeader()}
        
        {queryParams.invite && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
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
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.secondary.light, 0.1)} 100%)`,
        }}
      >
        <Card
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: compact ? 400 : 480,
            borderRadius: 3,
            overflow: 'visible',
            position: 'relative',
            '&:before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            },
          }}
        >
          <CardContent sx={{ p: compact ? 3 : 4, pt: compact ? 4 : 5 }}>
            {renderForm()}
            
            <Typography variant="caption" color="text.secondary" sx={{ 
              display: 'block', 
              textAlign: 'center', 
              mt: 4,
              pt: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
            }}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
              Need help?{' '}
              <Link component={RouterLink} to="/support" color="primary">
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
