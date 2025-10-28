import React, { useState } from "react";
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
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Google,
  AccountCircle,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";

export default function Auth({ disableSignup = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("assessor");
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // ✅ Fixed: Add API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform.onrender.com/api';

  const validateForm = () => {
    if (!email || !email.includes("@")) {
      enqueueSnackbar("Please enter a valid email", { variant: "error" });
      return false;
    }
    if (!password || password.length < 6) {
      enqueueSnackbar("Password must be at least 6 characters", {
        variant: "error",
      });
      return false;
    }
    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    setLoading(true);

    // ✅ Fixed: Use correct API URL
    const endpoint = isLogin ? `${API_BASE_URL}/auth/login` : `${API_BASE_URL}/auth/register`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role: isLogin ? undefined : role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (isLogin ? "Login failed" : "Registration failed"));
      }

      if (isLogin) {
        localStorage.setItem("token", data.token);
        enqueueSnackbar("Login successful", { variant: "success" });
        navigate("/dashboard"); // ✅ Fixed: Navigate to dashboard
      } else {
        enqueueSnackbar("Account created successfully. Please sign in.", {
          variant: "success",
        });
        setIsLogin(true);
      }
    } catch (err) {
      console.error("Auth error:", err);
      enqueueSnackbar(err.message, { variant: "error", autoHideDuration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    enqueueSnackbar("Google login not implemented yet.", { variant: "info" });
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 450, width: "100%" }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <AccountCircle sx={{ fontSize: 60, color: "primary.main" }} />
          <Typography variant="h5" component="h1" sx={{ mt: 1 }}>
            {isLogin ? "Sign In" : "Create Account"}
          </Typography>
        </Box>

        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          InputProps={{
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
        />

        {!isLogin && !disableSignup && (
          <Box sx={{ mt: 2 }}>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              fullWidth
              displayEmpty
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="assessor">Assessor</MenuItem>
              <MenuItem value="candidate">Candidate</MenuItem>
            </Select>
          </Box>
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleAuth}
          disabled={loading}
          startIcon={
            loading ? <CircularProgress size={20} color="inherit" /> : null
          }
          sx={{ mt: 3, py: 1.5 }}
        >
          {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
        </Button>

        <Divider sx={{ my: 3 }}>OR</Divider>

        <Button
          variant="outlined"
          fullWidth
          onClick={googleLogin}
          startIcon={<Google />}
          sx={{ mb: 2 }}
        >
          Continue with Google
        </Button>

        {!disableSignup && (
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <Button
                color="primary"
                onClick={() => setIsLogin(!isLogin)}
                size="small"
                sx={{ ml: 1 }}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </Button>
            </Typography>
          </Box>
        )}

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 3, textAlign: "center" }}
        >
          <Link to="/forgot-password" style={{ color: "inherit" }}>
            Forgot password?
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

Auth.propTypes = {
  disableSignup: PropTypes.bool,
};
