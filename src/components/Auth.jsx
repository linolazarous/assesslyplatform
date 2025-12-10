// src/components/Auth.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  TextField,
  Paper,
  Typography,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  InputAdornment,
  IconButton,
  Box,
  FormControl,
  InputLabel,
  Alert,
  Fade,
  Slide,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Google,
  Facebook,
  GitHub,
  Microsoft,
  Apple,
  AccountCircle,
  Person,
  Business,
  School,
  VpnKey,
  Email,
  Lock,
  Fingerprint,
  Security,
  VerifiedUser,
  CorporateFare,
  Groups,
  AdminPanelSettings,
  ArrowForward,
  ArrowBack,
  CheckCircle,
  Error,
  Info,
  HelpOutline,
  Phone,
  Language,
  Public,
  LockReset,
  QrCode2,
  Download,
  CloudUpload,
  History,
  Settings,
  MoreVert,
  Login as LoginIcon,
  PersonAdd,
  BusinessCenter,
  Dashboard,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import PropTypes from "prop-types";
import { Link as RouterLink, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "./ui/LoadingScreen";

const AUTH_METHODS = {
  email: { label: "Email", icon: <Email />, color: "primary" },
  google: { label: "Google", icon: <Google />, color: "error" },
  microsoft: { label: "Microsoft", icon: <Microsoft />, color: "info" },
  github: { label: "GitHub", icon: <GitHub />, color: "default" },
  facebook: { label: "Facebook", icon: <Facebook />, color: "primary" },
  apple: { label: "Apple", icon: <Apple />, color: "default" },
  sso: { label: "SSO", icon: <Fingerprint />, color: "warning" },
};

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin", icon: <AdminPanelSettings />, description: "Full system administrator" },
  { value: "organization_admin", label: "Organization Admin", icon: <Business />, description: "Manage organization settings" },
  { value: "assessor", label: "Assessor", icon: <Groups />, description: "Create and evaluate assessments" },
  { value: "candidate", label: "Candidate", icon: <Person />, description: "Take assessments and view results" },
  { value: "viewer", label: "Viewer", icon: <Visibility />, description: "View-only access to content" },
];

export default function Auth({
  mode = "login", // 'login', 'register', 'forgot-password', 'reset-password'
  organizationId = null,
  redirectTo = "/dashboard",
  showSocialLogin = true,
  showOrganizationSelector = true,
  showRememberMe = true,
  showTerms = true,
  compact = false,
  embedded = false,
  onSuccess = null,
  onCancel = null,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, register, forgotPassword, resetPassword, isAuthenticated, isLoading } = useAuth();
  
  // State management
  const [activeTab, setActiveTab] = useState(mode === "login" ? 0 : 1);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [verificationSent, setVerificationSent] = useState(false);
  const [selectedAuthMethod, setSelectedAuthMethod] = useState("email");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("invite") || "");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "assessor",
    organizationName: "",
    phone: "",
    jobTitle: "",
    department: "",
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !embedded) {
      const from = location.state?.from?.pathname || redirectTo;
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, embedded, navigate, location, redirectTo]);

  // Auto-fill from invite code
  useEffect(() => {
    if (inviteCode && mode === "register") {
      // In a real app, you would fetch invite details
      setFormData(prev => ({
        ...prev,
        email: searchParams.get("email") || prev.email,
        role: searchParams.get("role") || prev.role,
      }));
    }
  }, [inviteCode, mode, searchParams]);

  // Password strength calculator
  const calculatePasswordStrength = useCallback((password) => {
    if (!password) return 0;
    
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    
    return Math.min(strength, 100);
  }, []);

  // Update password strength on change
  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    }
  }, [formData.password, calculatePasswordStrength]);

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (mode === "register" || mode === "login") {
      if (!formData.email) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
      
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (mode === "register" && formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
    }
    
    if (mode === "register") {
      if (!formData.name.trim()) {
        newErrors.name = "Full name is required";
      } else if (formData.name.trim().length < 2) {
        newErrors.name = "Name must be at least 2 characters";
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      
      if (showTerms && !acceptedTerms) {
        newErrors.terms = "You must accept the terms and conditions";
      }
    }
    
    if (mode === "forgot-password") {
      if (!formData.email) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }
    
    if (mode === "reset-password") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }
    
    if (twoFactorRequired && !twoFactorCode) {
      newErrors.twoFactorCode = "Two-factor authentication code is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [mode, formData, acceptedTerms, showTerms, twoFactorRequired, twoFactorCode]);

  // Input handlers
  const handleInputChange = useCallback((field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  }, [errors]);

  // Auth handlers
  const handleLogin = useCallback(async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const result = await login(formData.email, formData.password, rememberMe);
      
      if (result.requiresTwoFactor) {
        setTwoFactorRequired(true);
        enqueueSnackbar("Two-factor authentication required", { variant: "info" });
      } else {
        enqueueSnackbar("Login successful!", { variant: "success" });
        
        if (onSuccess) {
          onSuccess(result);
        } else if (!embedded) {
          const from = location.state?.from?.pathname || redirectTo;
          navigate(from, { replace: true });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      enqueueSnackbar(error.message || "Login failed. Please check your credentials.", {
        variant: "error",
        autoHideDuration: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [validateForm, login, formData, rememberMe, enqueueSnackbar, onSuccess, embedded, location, redirectTo, navigate]);

  const handleRegister = useCallback(async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
        jobTitle: formData.jobTitle,
        department: formData.department,
        organizationName: formData.organizationName,
        inviteCode: inviteCode || undefined,
      };
      
      const result = await register(userData);
      
      enqueueSnackbar("Account created successfully!", { variant: "success" });
      
      if (result.requiresVerification) {
        setVerificationSent(true);
        enqueueSnackbar("Verification email sent. Please check your inbox.", {
          variant: "info",
          autoHideDuration: 8000,
        });
      } else {
        if (onSuccess) {
          onSuccess(result);
        } else if (!embedded) {
          navigate("/login", { 
            replace: true,
            state: { message: "Account created. Please sign in." }
          });
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      enqueueSnackbar(error.message || "Registration failed. Please try again.", {
        variant: "error",
        autoHideDuration: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [validateForm, register, formData, inviteCode, enqueueSnackbar, onSuccess, embedded, navigate]);

  const handleForgotPassword = useCallback(async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await forgotPassword(formData.email);
      
      setVerificationSent(true);
      enqueueSnackbar("Password reset instructions sent to your email", {
        variant: "success",
        autoHideDuration: 8000,
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      enqueueSnackbar(error.message || "Failed to send reset instructions", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [validateForm, forgotPassword, formData.email, enqueueSnackbar]);

  // FIXED LINE: Changed process.env.REACT_APP_API_BASE_URL to import.meta.env.VITE_API_BASE_URL
  const handleSocialLogin = useCallback((provider) => {
    const socialAuthUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com/api/v1'}/auth/${provider}?redirect=${encodeURIComponent(window.location.origin + redirectTo)}`;
    window.location.href = socialAuthUrl;
  }, [redirectTo]);

  const handleTwoFactorSubmit = useCallback(async () => {
    if (!twoFactorCode) {
      setErrors(prev => ({ ...prev, twoFactorCode: "Code is required" }));
      return;
    }
    
    setLoading(true);
    try {
      // In a real app, you would submit the 2FA code
      // await verifyTwoFactor(twoFactorCode);
      
      enqueueSnackbar("Two-factor authentication successful!", { variant: "success" });
      
      if (onSuccess) {
        onSuccess({ twoFactorVerified: true });
      } else if (!embedded) {
        const from = location.state?.from?.pathname || redirectTo;
        navigate(from, { replace: true });
      }
    } catch (error) {
      enqueueSnackbar("Invalid two-factor code", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [twoFactorCode, enqueueSnackbar, onSuccess, embedded, location, redirectTo, navigate]);

  // Tab/step navigation
  const handleNextStep = () => {
    if (activeStep < 2) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  // Get password strength color
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return "error";
    if (passwordStrength < 75) return "warning";
    return "success";
  };

  // Get password strength label
  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 25) return "Very Weak";
    if (passwordStrength < 50) return "Weak";
    if (passwordStrength < 75) return "Good";
    if (passwordStrength < 100) return "Strong";
    return "Very Strong";
  };

  // Render based on mode
  const renderContent = () => {
    if (isLoading && !embedded) {
      return <LoadingScreen message="Loading authentication..." type="auth" />;
    }

    switch (mode) {
      case "login":
        return renderLoginForm();
      case "register":
        return renderRegisterForm();
      case "forgot-password":
        return renderForgotPasswordForm();
      case "reset-password":
        return renderResetPasswordForm();
      default:
        return renderLoginForm();
    }
  };

  const renderLoginForm = () => (
    <Slide direction="up" in={true} mountOnEnter unmountOnExit>
      <Box>
        {twoFactorRequired ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: "primary.light", mx: "auto", mb: 2 }}>
              <Fingerprint fontSize="large" />
            </Avatar>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Two-Factor Authentication
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Enter the verification code from your authenticator app
            </Typography>
            
            <TextField
              fullWidth
              label="Verification Code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              error={!!errors.twoFactorCode}
              helperText={errors.twoFactorCode}
              disabled={loading}
              sx={{ mb: 3, maxWidth: 300, mx: "auto" }}
            />
            
            <Button
              variant="contained"
              onClick={handleTwoFactorSubmit}
              disabled={loading || !twoFactorCode}
              sx={{ minWidth: 200 }}
            >
              {loading ? <CircularProgress size={24} /> : "Verify"}
            </Button>
            
            <Button
              variant="text"
              onClick={() => setTwoFactorRequired(false)}
              sx={{ mt: 2 }}
            >
              Back to login
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main", mx: "auto", mb: 2 }}>
                <LoginIcon fontSize="large" />
              </Avatar>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to your Assessly account
              </Typography>
            </Box>
            
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleInputChange("password")}
              error={!!errors.password}
              helperText={errors.password}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            
            {showRememberMe && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Remember me"
                sx={{ mb: 2 }}
              />
            )}
            
            <Button
              variant="contained"
              fullWidth
              onClick={handleLogin}
              disabled={loading}
              size="large"
              sx={{ mb: 2, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : "Sign In"}
            </Button>
            
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <MuiLink
                component={RouterLink}
                to="/auth/forgot-password"
                color="primary"
                underline="hover"
              >
                Forgot your password?
              </MuiLink>
            </Box>
          </>
        )}
        
        {showSocialLogin && !twoFactorRequired && (
          <>
            <Divider sx={{ my: 3 }}>OR</Divider>
            
            <Grid container spacing={2}>
              {Object.entries(AUTH_METHODS).map(([key, method]) => (
                <Grid item xs={6} key={key}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleSocialLogin(key)}
                    disabled={loading}
                    startIcon={method.icon}
                    sx={{ py: 1.5 }}
                  >
                    {method.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Box>
    </Slide>
  );

  const renderRegisterForm = () => (
    <Slide direction="up" in={true} mountOnEnter unmountOnExit>
      <Box>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "success.main", mx: "auto", mb: 2 }}>
            <PersonAdd fontSize="large" />
          </Avatar>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Join Assessly and start creating assessments
          </Typography>
        </Box>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step><StepLabel>Basic Info</StepLabel></Step>
          <Step><StepLabel>Account Details</StepLabel></Step>
          <Step><StepLabel>Complete</StepLabel></Step>
        </Stepper>
        
        {activeStep === 0 && (
          <Box>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={handleInputChange("name")}
              error={!!errors.name}
              helperText={errors.name}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            
            <Button
              variant="contained"
              fullWidth
              onClick={handleNextStep}
              disabled={loading || !formData.name || !formData.email}
              sx={{ mt: 2 }}
            >
              Next
            </Button>
          </Box>
        )}
        
        {activeStep === 1 && (
          <Box>
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleInputChange("password")}
              error={!!errors.password}
              helperText={errors.password}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={passwordStrength}
                color={getPasswordStrengthColor()}
                sx={{ height: 4, mb: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                Password strength: {getPasswordStrengthLabel()}
              </Typography>
            </Box>
            
            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleInputChange("confirmPassword")}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={handleInputChange("role")}
                label="Role"
                disabled={loading || !!inviteCode}
              >
                {ROLE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      {option.icon}
                      <Box>
                        <Typography>{option.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Collapse in={showAdvancedOptions}>
              <Stack spacing={2} sx={{ mb: 3 }}>
                <TextField
                  label="Phone Number"
                  value={formData.phone}
                  onChange={handleInputChange("phone")}
                  disabled={loading}
                />
                <TextField
                  label="Job Title"
                  value={formData.jobTitle}
                  onChange={handleInputChange("jobTitle")}
                  disabled={loading}
                />
                <TextField
                  label="Department"
                  value={formData.department}
                  onChange={handleInputChange("department")}
                  disabled={loading}
                />
                {formData.role === "organization_admin" && (
                  <TextField
                    label="Organization Name"
                    value={formData.organizationName}
                    onChange={handleInputChange("organizationName")}
                    disabled={loading}
                  />
                )}
              </Stack>
            </Collapse>
            
            <Button
              variant="text"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              startIcon={showAdvancedOptions ? <ArrowBack /> : <Settings />}
              sx={{ mb: 2 }}
            >
              {showAdvancedOptions ? "Hide Advanced" : "Advanced Options"}
            </Button>
            
            {showTerms && (
              <FormControl error={!!errors.terms} sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I agree to the{" "}
                      <MuiLink href="/terms" target="_blank" color="primary">
                        Terms of Service
                      </MuiLink>{" "}
                      and{" "}
                      <MuiLink href="/privacy" target="_blank" color="primary">
                        Privacy Policy
                      </MuiLink>
                    </Typography>
                  }
                />
                {errors.terms && (
                  <Typography variant="caption" color="error">
                    {errors.terms}
                  </Typography>
                )}
              </FormControl>
            )}
            
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handlePrevStep}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={handleRegister}
                disabled={loading || !acceptedTerms}
              >
                {loading ? <CircularProgress size={24} /> : "Create Account"}
              </Button>
            </Stack>
          </Box>
        )}
        
        {activeStep === 2 && verificationSent && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: "success.light", mx: "auto", mb: 2 }}>
              <CheckCircle fontSize="large" />
            </Avatar>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Check Your Email
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              We've sent a verification email to <strong>{formData.email}</strong>.
              Please click the link in the email to activate your account.
            </Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to="/login"
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Box>
        )}
        
        {!verificationSent && activeStep < 2 && (
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{" "}
              <MuiLink
                component={RouterLink}
                to="/login"
                color="primary"
                fontWeight="medium"
              >
                Sign in
              </MuiLink>
            </Typography>
          </Box>
        )}
      </Box>
    </Slide>
  );

  const renderForgotPasswordForm = () => (
    <Slide direction="up" in={true} mountOnEnter unmountOnExit>
      <Box>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "warning.main", mx: "auto", mb: 2 }}>
            <LockReset fontSize="large" />
          </Avatar>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your email to receive reset instructions
          </Typography>
        </Box>
        
        {verificationSent ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Check Your Email
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              We've sent password reset instructions to <strong>{formData.email}</strong>.
              Please check your inbox and follow the link.
            </Typography>
            <Button
              variant="contained"
              component={RouterLink}
              to="/login"
              sx={{ mt: 2 }}
            >
              Back to Login
            </Button>
          </Box>
        ) : (
          <>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading}
              sx={{ mb: 3 }}
            />
            
            <Button
              variant="contained"
              fullWidth
              onClick={handleForgotPassword}
              disabled={loading}
              size="large"
              sx={{ mb: 2, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : "Send Reset Instructions"}
            </Button>
            
            <Button
              variant="text"
              fullWidth
              component={RouterLink}
              to="/login"
              disabled={loading}
            >
              Back to Login
            </Button>
          </>
        )}
      </Box>
    </Slide>
  );

  const renderResetPasswordForm = () => (
    <Slide direction="up" in={true} mountOnEnter unmountOnExit>
      <Box>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main", mx: "auto", mb: 2 }}>
            <VpnKey fontSize="large" />
          </Avatar>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            Set New Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new password for your account
          </Typography>
        </Box>
        
        <TextField
          fullWidth
          label="New Password"
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={handleInputChange("password")}
          error={!!errors.password}
          helperText={errors.password}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={passwordStrength}
            color={getPasswordStrengthColor()}
            sx={{ height: 4, mb: 0.5 }}
          />
          <Typography variant="caption" color="text.secondary">
            Password strength: {getPasswordStrengthLabel()}
          </Typography>
        </Box>
        
        <TextField
          fullWidth
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={handleInputChange("confirmPassword")}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword}
          disabled={loading}
          sx={{ mb: 3 }}
        />
        
        <Button
          variant="contained"
          fullWidth
          onClick={() => {
            // Handle password reset
            enqueueSnackbar("Password reset successful!", { variant: "success" });
            navigate("/login");
          }}
          disabled={loading}
          size="large"
          sx={{ mb: 2, py: 1.5 }}
        >
          {loading ? <CircularProgress size={24} /> : "Reset Password"}
        </Button>
      </Box>
    </Slide>
  );

  if (compact) {
    return (
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, maxWidth: 400 }}>
        {renderContent()}
      </Paper>
    );
  }

  if (embedded) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto" }}>
        {renderContent()}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: "flex", 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    }}>
      {/* Left side - Brand/Info */}
      <Grid container>
        <Grid 
          item 
          xs={12} 
          md={6} 
          sx={{ 
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            p: 8,
            color: "white",
          }}
        >
          <Box sx={{ maxWidth: 500 }}>
            <Typography variant="h2" fontWeight="bold" gutterBottom>
              Assessly
            </Typography>
            <Typography variant="h5" gutterBottom sx={{ mb: 4, opacity: 0.9 }}>
              Measure Smarter, Not Harder
            </Typography>
            <Stack spacing={2} sx={{ mb: 4 }}>
              {[
                "Create powerful assessments",
                "Analyze results with advanced analytics",
                "Collaborate with your team",
                "Enterprise-grade security",
              ].map((feature, index) => (
                <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <CheckCircle sx={{ opacity: 0.8 }} />
                  <Typography>{feature}</Typography>
                </Box>
              ))}
            </Stack>
            <Chip
              label="Trusted by 1000+ organizations"
              icon={<VerifiedUser />}
              sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
            />
          </Box>
        </Grid>
        
        {/* Right side - Auth Form */}
        <Grid 
          item 
          xs={12} 
          md={6}
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: { xs: 3, sm: 6, md: 8 },
            bgcolor: "background.paper",
          }}
        >
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 3, sm: 4 },
              maxWidth: 500,
              width: "100%",
              borderRadius: 3,
            }}
          >
            {onCancel && (
              <Box sx={{ textAlign: "right", mb: 2 }}>
                <Button onClick={onCancel} size="small">
                  Cancel
                </Button>
              </Box>
            )}
            
            {renderContent()}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

Auth.propTypes = {
  mode: PropTypes.oneOf(["login", "register", "forgot-password", "reset-password"]),
  organizationId: PropTypes.string,
  redirectTo: PropTypes.string,
  showSocialLogin: PropTypes.bool,
  showOrganizationSelector: PropTypes.bool,
  showRememberMe: PropTypes.bool,
  showTerms: PropTypes.bool,
  compact: PropTypes.bool,
  embedded: PropTypes.bool,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
};

Auth.defaultProps = {
  mode: "login",
  organizationId: null,
  redirectTo: "/dashboard",
  showSocialLogin: true,
  showOrganizationSelector: true,
  showRememberMe: true,
  showTerms: true,
  compact: false,
  embedded: false,
  onSuccess: null,
  onCancel: null,
};
