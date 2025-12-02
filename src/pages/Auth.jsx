// src/pages/Auth.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  TextField,
  Typography,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  InputAdornment,
  IconButton,
  Paper,
  FormControl,
  InputLabel,
  Container,
  Card,
  CardContent,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google,
  AccountCircle,
  Lock,
  Email,
  PersonAdd,
  Login as LoginIcon,
  VpnKey,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { authApi } from '../api/authApi';

/**
 * Authentication Page
 * Supports: Login, Signup, Forgot Password, Reset Password, Magic Link
 * Multi-tenant aware with organization support
 */
export default function AuthPage({ 
  defaultMode = 'login',
  disableSignup = false,
  organizationId = null,
  inviteToken = null,
  showTitle = true,
  compact = false,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, currentUser, isLoading: authLoading } = useAuth();
  const { showSnackbar, showSuccess, showError } = useSnackbar();

  // Parse URL parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      token: params.get('token') || params.get('reset_token'),
      magicToken: params.get('magic_token'),
      oauthToken: params.get('oauth_token'),
      mode: params.get('mode') || params.get('tab') || defaultMode,
      invite: params.get('invite') || inviteToken,
      redirect: params.get('redirect') || '/dashboard',
      organization: params.get('organization') || organizationId,
      email: params.get('email'),
    };
  }, [location.search, defaultMode, inviteToken, organizationId]);

  // Form state
  const [formData, setFormData] = useState({
    email: queryParams.email || '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'assessor',
    organizationName: '',
    acceptTerms: false,
  });

  const [mode, setMode] = useState(queryParams.mode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Handle URL tokens and mode changes
  useEffect(() => {
    const handleUrlTokens = async () => {
      if (queryParams.token) {
        // Handle password reset token
        setMode('reset');
        try {
          // Verify reset token
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
      } else if (queryParams.magicToken) {
        // Handle magic link token
        try {
          setLoading(true);
          const response = await authApi.verifyMagicLink(queryParams.magicToken);
          if (response.success) {
            await login({ token: queryParams.magicToken, type: 'magic' });
            showSuccess('Magic link login successful!');
            navigate(queryParams.redirect, { replace: true });
          }
        } catch (error) {
          showError('Invalid or expired magic link');
          setMode('login');
        } finally {
          setLoading(false);
        }
      } else if (queryParams.oauthToken) {
        // Handle OAuth callback
        try {
          setLoading(true);
          await login({ token: queryParams.oauthToken, type: 'oauth' });
          showSuccess('OAuth login successful!');
          navigate(queryParams.redirect, { replace: true });
        } catch (error) {
          showError('OAuth login failed');
          setMode('login');
        } finally {
          setLoading(false);
        }
      } else if (queryParams.invite) {
        // Handle organization invitation
        setMode('signup');
        try {
          const response = await authApi.verifyInvite(queryParams.invite);
          if (response.success) {
            setFormData(prev => ({ 
              ...prev, 
              email: response.data.email,
              organizationId: response.data.organizationId,
              role: response.data.role,
            }));
          }
        } catch (error) {
          showError('Invalid or expired invitation');
        }
      }
    };

    handleUrlTokens();
  }, [queryParams, login, navigate, showSuccess, showError, showSnackbar]);

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser && !authLoading) {
      const redirectTo = location.state?.from || queryParams.redirect;
      navigate(redirectTo, { replace: true });
    }
  }, [currentUser, authLoading, navigate, location.state, queryParams.redirect]);

  const validateForm = () => {
    const errors = {};

    // Email validation
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation (for login, signup, reset)
    if (['login', 'signup', 'reset'].includes(mode)) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password = 'Password must contain uppercase, lowercase, and numbers';
      }
    }

    // Confirm password validation
    if (mode === 'reset' || mode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    // Name validation for signup
    if (mode === 'signup') {
      if (!formData.firstName?.trim()) {
        errors.firstName = 'First name is required';
      }
      if (!formData.lastName?.trim()) {
        errors.lastName = 'Last name is required';
      }
    }

    // Organization name for new organization signup
    if (mode === 'signup' && !queryParams.organization && !formData.organizationName) {
      errors.organizationName = 'Organization name is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      switch (mode) {
        case 'login':
          await handleLogin();
          break;
        case 'signup':
          await handleSignup();
          break;
        case 'forgot':
          await handleForgotPassword();
          break;
        case 'reset':
          await handleResetPassword();
          break;
        case 'magic':
          await handleMagicLink();
          break;
        default:
          throw new Error('Invalid auth mode');
      }
    } catch (error) {
      console.error('Auth error:', error);
      showError(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const result = await login({
      email: formData.email,
      password: formData.password,
      organizationId: queryParams.organization,
    });

    if (result.success) {
      showSuccess('Login successful!');
      navigate(queryParams.redirect, { replace: true });
    } else {
      throw new Error(result.message || 'Invalid credentials');
    }
  };

  const handleSignup = async () => {
    const signupData = {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      organizationId: queryParams.organization,
      organizationName: formData.organizationName,
      inviteToken: queryParams.invite,
    };

    const result = await register(signupData);
    
    if (result.success) {
      if (result.data?.requiresVerification) {
        showSuccess('Account created! Please check your email to verify your account.');
        setMode('login');
      } else {
        showSuccess('Account created successfully!');
        navigate('/auth?mode=login', { replace: true });
      }
    } else {
      throw new Error(result.message || 'Registration failed');
    }
  };

  const handleForgotPassword = async () => {
    const response = await authApi.forgotPassword({
      email: formData.email,
      redirectUrl: `${window.location.origin}/auth?mode=reset&reset_token=`,
    });

    if (response.success) {
      showSuccess('Password reset link sent to your email');
      setMode('login');
    } else {
      throw new Error(response.message || 'Failed to send reset link');
    }
  };

  const handleResetPassword = async () => {
    const response = await authApi.resetPassword({
      token: queryParams.token,
      password: formData.password,
    });

    if (response.success) {
      showSuccess('Password reset successful!');
      setMode('login');
    } else {
      throw new Error(response.message || 'Password reset failed');
    }
  };

  const handleMagicLink = async () => {
    const response = await authApi.requestMagicLink({
      email: formData.email,
      redirectUrl: `${window.location.origin}/auth?magic_token=`,
    });

    if (response.success) {
      showSuccess('Magic link sent to your email');
      setMode('login');
    } else {
      throw new Error(response.message || 'Failed to send magic link');
    }
  };

  const handleSocialLogin = (provider) => {
    const redirectUrl = `${window.location.origin}/auth?oauth_token=`;
    const state = JSON.stringify({
      redirect: queryParams.redirect,
      organization: queryParams.organization,
      invite: queryParams.invite,
    });
    
    window.location.href = `/api/auth/${provider}?redirect_uri=${encodeURIComponent(redirectUrl)}&state=${encodeURIComponent(state)}`;
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setValidationErrors({});
    navigate(`/auth?mode=${newMode}${queryParams.organization ? `&organization=${queryParams.organization}` : ''}`, { replace: true });
  };

  const renderHeader = () => (
    <Box sx={{ textAlign: 'center', mb: compact ? 2 : 3 }}>
      {showTitle && (
        <Typography variant={compact ? "h5" : "h4"} color="primary" gutterBottom sx={{ fontWeight: 600 }}>
          Assessly Platform
        </Typography>
      )}
      <Typography variant={compact ? "h6" : "h5"} sx={{ fontWeight: 500 }}>
        {mode === 'reset' ? 'Reset Password' :
         mode === 'forgot' ? 'Forgot Password' :
         mode === 'magic' ? 'Magic Link Login' :
         mode === 'signup' ? 'Create Account' : 'Welcome Back'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {mode === 'reset' ? 'Enter your new password' :
         mode === 'forgot' ? "We'll send a reset link to your email" :
         mode === 'magic' ? 'Receive a secure login link in your email' :
         mode === 'signup' ? 'Join thousands of organizations using Assessly' :
         'Sign in to your account to continue'}
      </Typography>
    </Box>
  );

  const renderEmailField = () => (
    <TextField
      label="Email Address"
      type="email"
      fullWidth
      value={formData.email}
      onChange={handleInputChange('email')}
      error={!!validationErrors.email}
      helperText={validationErrors.email}
      required
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

  const renderPasswordField = (label = 'Password', field = 'password') => (
    <TextField
      label={label}
      type={showPassword ? 'text' : 'password'}
      fullWidth
      value={formData[field]}
      onChange={handleInputChange(field)}
      error={!!validationErrors[field]}
      helperText={validationErrors[field]}
      required
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

  const renderNameFields = () => (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <TextField
        label="First Name"
        fullWidth
        value={formData.firstName}
        onChange={handleInputChange('firstName')}
        error={!!validationErrors.firstName}
        helperText={validationErrors.firstName}
        required
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <AccountCircle color="action" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        label="Last Name"
        fullWidth
        value={formData.lastName}
        onChange={handleInputChange('lastName')}
        error={!!validationErrors.lastName}
        helperText={validationErrors.lastName}
        required
      />
    </Box>
  );

  const renderOrganizationField = () => (
    <TextField
      label="Organization Name"
      fullWidth
      value={formData.organizationName}
      onChange={handleInputChange('organizationName')}
      error={!!validationErrors.organizationName}
      helperText={validationErrors.organizationName || 'Leave empty if joining existing organization'}
      disabled={!!queryParams.organization}
      sx={{ mb: 2 }}
    />
  );

  const renderRoleField = () => (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <InputLabel>Role</InputLabel>
      <Select
        value={formData.role}
        label="Role"
        onChange={handleInputChange('role')}
        disabled={!!queryParams.invite}
      >
        <MenuItem value="admin">Administrator</MenuItem>
        <MenuItem value="assessor">Assessor</MenuItem>
        <MenuItem value="candidate">Candidate</MenuItem>
      </Select>
    </FormControl>
  );

  const renderSubmitButton = () => {
    const buttonText = {
      login: 'Sign In',
      signup: 'Create Account',
      forgot: 'Send Reset Link',
      reset: 'Reset Password',
      magic: 'Send Magic Link',
    }[mode];

    return (
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        size={compact ? 'medium' : 'large'}
        disabled={loading}
        startIcon={
          loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : mode === 'login' ? (
            <LoginIcon />
          ) : mode === 'signup' ? (
            <PersonAdd />
          ) : (
            <VpnKey />
          )
        }
        sx={{ py: compact ? 1.2 : 1.5, mt: 2 }}
      >
        {loading ? 'Processing...' : buttonText}
      </Button>
    );
  };

  const renderSocialLogin = () => {
    if (mode !== 'login' && mode !== 'signup') return null;

    return (
      <>
        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.secondary">
            OR CONTINUE WITH
          </Typography>
        </Divider>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<Google />}
          onClick={() => handleSocialLogin('google')}
          sx={{ mb: 1 }}
        >
          Google
        </Button>
      </>
    );
  };

  const renderModeSwitcher = () => {
    const modeSwitches = {
      login: [
        { text: "Don't have an account?", action: () => switchMode('signup'), disabled: disableSignup },
        { text: 'Forgot password?', action: () => switchMode('forgot') },
        { text: 'Use magic link', action: () => switchMode('magic') },
      ],
      signup: [
        { text: 'Already have an account?', action: () => switchMode('login') },
      ],
      forgot: [
        { text: 'Back to login', action: () => switchMode('login') },
      ],
      reset: [
        { text: 'Back to login', action: () => switchMode('login') },
      ],
      magic: [
        { text: 'Back to login', action: () => switchMode('login') },
      ],
    };

    const switches = modeSwitches[mode] || [];

    return (
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        {switches.map((switchItem, index) => (
          <Typography key={index} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {switchItem.text}
            <Button
              color="primary"
              onClick={switchItem.action}
              disabled={switchItem.disabled || loading}
              size="small"
              sx={{ ml: 1 }}
            >
              {switchItem.action.toString().includes('signup') ? 'Sign up' :
               switchItem.action.toString().includes('login') ? 'Sign in' : 'Click here'}
            </Button>
          </Typography>
        ))}
      </Box>
    );
  };

  const renderTerms = () => {
    if (mode !== 'signup') return null;

    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
        By creating an account, you agree to our{' '}
        <RouterLink to="/terms" style={{ color: theme.palette.primary.main }}>
          Terms of Service
        </RouterLink>{' '}
        and{' '}
        <RouterLink to="/privacy" style={{ color: theme.palette.primary.main }}>
          Privacy Policy
        </RouterLink>
      </Typography>
    );
  };

  const renderInviteNotice = () => {
    if (!queryParams.invite) return null;

    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          You've been invited to join an organization. Complete your registration below.
        </Typography>
      </Alert>
    );
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Card
          elevation={compact ? 1 : 3}
          sx={{
            width: '100%',
            maxWidth: compact ? 400 : 480,
            borderRadius: compact ? 2 : 3,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: compact ? 3 : 4 }}>
            <form onSubmit={handleSubmit}>
              {renderHeader()}
              {renderInviteNotice()}
              {renderEmailField()}

              {mode === 'signup' && renderNameFields()}
              {mode === 'signup' && !queryParams.organization && renderOrganizationField()}
              {mode === 'signup' && renderRoleField()}

              {['login', 'signup', 'reset'].includes(mode) && renderPasswordField()}
              {['reset', 'signup'].includes(mode) && renderPasswordField('Confirm Password', 'confirmPassword')}

              {renderSubmitButton()}
              {renderSocialLogin()}
              {renderModeSwitcher()}
              {renderTerms()}
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

AuthPage.propTypes = {
  /** Default authentication mode */
  defaultMode: PropTypes.oneOf(['login', 'signup', 'forgot', 'reset', 'magic']),
  /** Disable signup mode (for invite-only systems) */
  disableSignup: PropTypes.bool,
  /** Organization ID for multi-tenant signup/login */
  organizationId: PropTypes.string,
  /** Invite token for organization invitations */
  inviteToken: PropTypes.string,
  /** Show platform title */
  showTitle: PropTypes.bool,
  /** Compact mode for embedded/auth modal use */
  compact: PropTypes.bool,
};

AuthPage.defaultProps = {
  defaultMode: 'login',
  disableSignup: false,
  organizationId: null,
  inviteToken: null,
  showTitle: true,
  compact: false,
};
