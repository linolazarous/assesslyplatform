// src/components/Auth.jsx
import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Google,
  AccountCircle,
  Person,
  Business,
  School,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import PropTypes from "prop-types";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Auth({ disableSignup = false }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "assessor",
  });
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Production-ready API configuration
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com';
  const API_V1_BASE = API_BASE.replace(/\/+$/, '') + '/api/v1';

  // Redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // Clear errors when switching between login/signup
  useEffect(() => {
    setErrors({});
    setHasAttemptedSubmit(false);
  }, [isLogin]);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isLogin) {
      if (!formData.name.trim()) {
        newErrors.name = "Full name is required";
      } else if (formData.name.trim().length < 2) {
        newErrors.name = "Name must be at least 2 characters";
      }
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(formData.password)) {
      newErrors.password = "Password must contain letters and numbers";
    }

    setErrors(newErrors);
    setHasAttemptedSubmit(true);
    
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (event) => {
    if (event) {
      event.preventDefault();
    }

    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const endpoint = isLogin 
        ? `${API_V1_BASE}/auth/login`
        : `${API_V1_BASE}/auth/register`;

      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { 
            name: formData.name.trim(),
            email: formData.email,
            password: formData.password,
            role: formData.role
          };

      console.log('🚀 Auth Request:', { endpoint, payload });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('📨 Auth Response:', data);

      if (!response.ok) {
        throw new Error(
          data.message || 
          data.error?.message || 
          (isLogin ? "Login failed" : "Registration failed") ||
          `Server error: ${response.status}`
        );
      }

      if (isLogin) {
        // Handle successful login
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user || { email: formData.email }));
          
          enqueueSnackbar("Login successful! Redirecting...", { 
            variant: "success",
            autoHideDuration: 2000,
          });

          // Redirect to intended page or dashboard
          const from = location.state?.from?.pathname || "/dashboard";
          setTimeout(() => navigate(from, { replace: true }), 1500);
        } else {
          throw new Error("No authentication token received");
        }
      } else {
        // Handle successful registration
        enqueueSnackbar("Account created successfully! Please sign in.", {
          variant: "success",
          autoHideDuration: 4000,
        });
        
        // Switch to login mode and clear form
        setIsLogin(true);
        setFormData(prev => ({
          ...prev,
          password: "" // Clear password only
        }));
      }

    } catch (error) {
      console.error("🔴 Auth error:", error);
      
      let userMessage = error.message;
      
      // Handle specific error cases
      if (error.message.includes("Network") || error.message.includes("Failed to fetch")) {
        userMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes("404")) {
        userMessage = "Service temporarily unavailable. Please try again later.";
      } else if (error.message.includes("401")) {
        userMessage = "Invalid email or password. Please try again.";
      } else if (error.message.includes("409")) {
        userMessage = "An account with this email already exists.";
      }

      enqueueSnackbar(userMessage, { 
        variant: "error", 
        autoHideDuration: 6000,
        persist: userMessage.includes("temporarily unavailable")
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const googleAuthUrl = `${API_BASE.replace(/\/+$/, '')}/auth/google`;
    console.log('🔗 Redirecting to Google OAuth:', googleAuthUrl);
    window.location.href = googleAuthUrl;
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData(prev => ({
      ...prev,
      password: "" // Clear password when toggling
    }));
  };

  const getRoleIcon = () => {
    switch (formData.role) {
      case "admin": return <Business />;
      case "assessor": return <Person />;
      case "candidate": return <School />;
      default: return <Person />;
    }
  };

  return (
    <Box 
      sx={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Fade in timeout={800}>
        <Paper 
          elevation={8} 
          sx={{ 
            p: { xs: 3, sm: 4 }, 
            maxWidth: 450, 
            width: "100%",
            borderRadius: 3,
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
          }}
          component="form"
          onSubmit={handleAuth}
          noValidate
        >
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <AccountCircle sx={{ fontSize: 64, color: "primary.main", mb: 1 }} />
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Assessly
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {isLogin ? "Welcome Back" : "Create Your Account"}
            </Typography>
          </Box>

          {/* Name Field - Only for Registration */}
          {!isLogin && (
            <TextField
              label="Full Name"
              type="text"
              fullWidth
              margin="normal"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={!!errors.name}
              helperText={errors.name}
              autoComplete="name"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />
          )}

          {/* Email Field */}
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            margin="normal"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            autoComplete="email"
            required
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountCircle color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Password Field */}
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            margin="normal"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={!!errors.password}
            helperText={errors.password || (isLogin ? "" : "Must be at least 6 characters with letters and numbers")}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <VisibilityOff color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    aria-label="toggle password visibility"
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Role Selection - Only for Registration */}
          {!isLogin && !disableSignup && (
            <FormControl fullWidth margin="normal" disabled={loading}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={handleInputChange('role')}
                label="Role"
                startAdornment={
                  <InputAdornment position="start">
                    {getRoleIcon()}
                  </InputAdornment>
                }
              >
                <MenuItem value="admin">Administrator</MenuItem>
                <MenuItem value="assessor">Assessor</MenuItem>
                <MenuItem value="candidate">Candidate</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            size="large"
            startIcon={
              loading ? <CircularProgress size={20} color="inherit" /> : null
            }
            sx={{ 
              mt: 3, 
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: "bold",
            }}
          >
            {loading ? "Please Wait..." : (isLogin ? "Sign In" : "Create Account")}
          </Button>

          {/* OAuth Divider */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OR CONTINUE WITH
            </Typography>
          </Divider>

          {/* Google OAuth Button */}
          <Button
            variant="outlined"
            fullWidth
            onClick={handleGoogleLogin}
            startIcon={<Google />}
            disabled={loading}
            sx={{ 
              mb: 2,
              py: 1.5
            }}
          >
            Google
          </Button>

          {/* Toggle Auth Mode */}
          {!disableSignup && (
            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Typography variant="body1" color="text.secondary">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <Button
                  color="primary"
                  onClick={toggleAuthMode}
                  disabled={loading}
                  sx={{ 
                    ml: 1,
                    fontWeight: "bold",
                    textTransform: 'none',
                    fontSize: '1rem'
                  }}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Button>
              </Typography>
            </Box>
          )}

          {/* Additional Links */}
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <Link 
                to="/forgot-password" 
                style={{ 
                  color: "inherit",
                  textDecoration: "none",
                  opacity: loading ? 0.5 : 1
                }}
                onClick={(e) => loading && e.preventDefault()}
              >
                Forgot your password?
              </Link>
            </Typography>
          </Box>

          {/* Demo Hint */}
          {import.meta.env.DEV && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Development Mode:</strong> API Base: {API_V1_BASE}
            </Alert>
          )}
        </Paper>
      </Fade>
    </Box>
  );
}

Auth.propTypes = {
  disableSignup: PropTypes.bool,
};
