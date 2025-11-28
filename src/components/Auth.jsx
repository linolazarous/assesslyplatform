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
import { useAuth } from "../contexts/AuthContext";
import config from "../config/env";

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

  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (field) => (event) => {
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (event) => {
    if (event) event.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      let result;
      
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register({
          name: formData.name.trim(),
          email: formData.email,
          password: formData.password,
          role: formData.role
        });
      }

      if (result.ok) {
        if (isLogin) {
          enqueueSnackbar("Login successful!", { variant: "success" });
          const from = location.state?.from?.pathname || "/dashboard";
          navigate(from, { replace: true });
        } else {
          enqueueSnackbar("Account created! Please sign in.", { variant: "success" });
          setIsLogin(true);
          setFormData(prev => ({ ...prev, password: "" }));
        }
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error("Auth error:", error);
      enqueueSnackbar(error.message, { 
        variant: "error", 
        autoHideDuration: 6000 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const googleAuthUrl = `${config.API_BASE_URL.replace(/\/+$/, '')}/auth/google`;
    window.location.href = googleAuthUrl;
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData(prev => ({
      ...prev,
      password: ""
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
    <Box sx={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
      minHeight: "100vh",
      p: 2,
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    }}>
      <Fade in timeout={800}>
        <Paper 
          elevation={8} 
          sx={{ 
            p: { xs: 3, sm: 4 }, 
            maxWidth: 450, 
            width: "100%",
            borderRadius: 3,
          }}
          component="form"
          onSubmit={handleAuth}
          noValidate
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <AccountCircle sx={{ fontSize: 64, color: "primary.main", mb: 1 }} />
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Assessly
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {isLogin ? "Welcome Back" : "Create Your Account"}
            </Typography>
          </Box>

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
            />
          )}

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
          />

          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            margin="normal"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={!!errors.password}
            helperText={errors.password}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

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

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            size="large"
            sx={{ mt: 3, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : (isLogin ? "Sign In" : "Create Account")}
          </Button>

          <Divider sx={{ my: 3 }}>OR</Divider>

          <Button
            variant="outlined"
            fullWidth
            onClick={handleGoogleLogin}
            startIcon={<Google />}
            disabled={loading}
            sx={{ mb: 2, py: 1.5 }}
          >
            Continue with Google
          </Button>

          {!disableSignup && (
            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Typography variant="body1" color="text.secondary">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <Button
                  color="primary"
                  onClick={toggleAuthMode}
                  disabled={loading}
                  sx={{ ml: 1 }}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Button>
              </Typography>
            </Box>
          )}

          {config.IS_DEVELOPMENT && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Development Mode:</strong> API Base: {config.API_V1_BASE}
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
