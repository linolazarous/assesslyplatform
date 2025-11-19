// src/pages/Auth.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  TextField,
  Typography,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  InputAdornment,
  IconButton,
  Box,
  Paper,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  LinkedIn as LinkIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

/**
 * Auth Page
 * Supports: Login / Signup / Forgot / Reset / Magic Link
 * Social logins redirect to API endpoints.
 */
export default function AuthPage({ disableSignup = false }) {
  const { login, register, logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  const params = new URLSearchParams(location.search);
  const urlToken = params.get("token") || params.get("magic_token") || null;

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("assessor");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Page modes
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [isMagic, setIsMagic] = useState(false);

  // Process URL token (magic/OAuth return)
  useEffect(() => {
    if (urlToken) {
      try {
        // Persist token client-side (you may want to hand-off to auth context instead)
        localStorage.setItem("token", urlToken);
        enqueueSnackbar("Logged in via external provider.", { variant: "success" });
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Failed to handle token:", err);
        enqueueSnackbar("External login failed.", { variant: "error" });
      }
      return;
    }

    const tab = params.get("tab");
    switch (tab) {
      case "signup":
        if (!disableSignup) {
          setIsLogin(false);
          setIsForgot(false);
          setIsMagic(false);
          setIsReset(false);
        }
        break;
      case "forgot":
        setIsForgot(true);
        setIsLogin(false);
        setIsReset(false);
        setIsMagic(false);
        break;
      case "magic":
        setIsMagic(true);
        setIsLogin(false);
        setIsForgot(false);
        setIsReset(false);
        break;
      case "reset":
        setIsReset(true);
        setIsLogin(false);
        setIsForgot(false);
        setIsMagic(false);
        break;
      default:
        setIsLogin(true);
        setIsForgot(false);
        setIsMagic(false);
        setIsReset(false);
    }

    // Force logout to reset any stale state (only if logout exists)
    try {
      logout?.();
    } catch (err) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, urlToken]);

  // If already logged in, redirect
  useEffect(() => {
    if (currentUser) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, location.state]);

  const validateForm = () => {
    if (!email || !email.includes("@")) {
      enqueueSnackbar("Enter a valid email.", { variant: "error" });
      return false;
    }

    if (!isForgot && !isMagic && !isReset && (!password || password.length < 6)) {
      enqueueSnackbar("Password must be at least 6 characters.", { variant: "error" });
      return false;
    }

    if (isReset && password !== confirmPassword) {
      enqueueSnackbar("Passwords do not match.", { variant: "error" });
      return false;
    }

    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (isMagic) {
        const res = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            // server will append token value, we provide redirect base
            redirectTo: `${window.location.origin}/auth?magic_token=`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Magic link failed.");
        enqueueSnackbar("Magic link sent. Check your email.", { variant: "success" });

      } else if (isForgot) {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Password reset request failed.");
        enqueueSnackbar("Password reset link sent.", { variant: "success" });
        setIsForgot(false);
        setIsLogin(true);

      } else if (isReset) {
        if (!urlToken) throw new Error("Reset token missing.");
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: urlToken, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Password reset failed.");
        enqueueSnackbar("Password reset successful!", { variant: "success" });
        navigate("/auth?tab=login", { replace: true });

      } else if (isLogin) {
        const success = await login(email, password);
        if (success) {
          enqueueSnackbar("Login successful!", { variant: "success" });
          const from = location.state?.from?.pathname || "/dashboard";
          navigate(from, { replace: true });
        } else {
          enqueueSnackbar("Invalid credentials.", { variant: "error" });
        }

      } else {
        // Signup
        await register({ email, password, role });
        enqueueSnackbar("Account created! Please sign in.", { variant: "success" });
        setIsLogin(true);
        navigate("/auth?tab=login", { replace: true });
      }
    } catch (err) {
      console.error("Auth error:", err);
      enqueueSnackbar(err?.message || "An error occurred.", { variant: "error", autoHideDuration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const redirectToOAuth = (provider) => {
    window.location.href = `/api/auth/${provider}`;
  };

  const switchMode = (mode) => {
    setIsLogin(mode === "login");
    setIsForgot(mode === "forgot");
    setIsReset(mode === "reset");
    setIsMagic(mode === "magic");
    navigate(`/auth?tab=${mode}`, { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#f6f8fb,#e8eefc)",
        p: 2,
      }}
    >
      <Paper elevation={6} sx={{ width: "100%", maxWidth: 460, p: 4, borderRadius: 3 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {isReset ? "Reset Your Password" : isForgot ? "Forgot Password" : isMagic ? "Sign in with Magic Link" : isLogin ? "Sign In" : "Create Account"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isReset
              ? "Enter a new password below."
              : isForgot
              ? "We'll send a reset link to your email."
              : isMagic
              ? "Enter your email to receive a login link."
              : isLogin
              ? "Welcome back — sign in to continue."
              : "Create an account to get started."}
          </Typography>
        </Box>

        {/* Email */}
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value.trimStart())}
          required
          autoComplete="email"
        />

        {/* Password */}
        {!isForgot && !isMagic && (
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isReset}
            autoComplete={isLogin ? "current-password" : "new-password"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" aria-label="toggle password">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* Confirm Password */}
        {isReset && (
          <TextField
            label="Confirm Password"
            type="password"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}

        {/* Role selector for signup */}
        {!isLogin && !disableSignup && !isForgot && !isMagic && !isReset && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="role-label">Role</InputLabel>
            <Select labelId="role-label" label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="assessor">Assessor</MenuItem>
              <MenuItem value="candidate">Candidate</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Action button */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleAuth}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ mt: 3, py: 1.4 }}
        >
          {loading ? "Processing..." : isReset ? "Reset Password" : isForgot ? "Send Reset Link" : isMagic ? "Send Magic Link" : isLogin ? "Sign In" : "Sign Up"}
        </Button>

        {/* Social logins */}
        {!isForgot && !isReset && !isMagic && (
          <>
            <Divider sx={{ my: 3 }}>OR</Divider>
            <Button variant="outlined" fullWidth startIcon={<GoogleIcon />} onClick={() => redirectToOAuth("google")} sx={{ mb: 1 }}>
              Continue with Google
            </Button>
            <Button variant="outlined" fullWidth startIcon={<GitHubIcon />} onClick={() => redirectToOAuth("github")} sx={{ mb: 1 }}>
              Continue with GitHub
            </Button>
            <Button variant="outlined" fullWidth startIcon={<LinkIcon />} onClick={() => redirectToOAuth("linkedin")} sx={{ mb: 1 }}>
              Continue with LinkedIn
            </Button>
          </>
        )}

        {/* Mode switches */}
        <Box sx={{ textAlign: "center", mt: 2 }}>
          {!isForgot && !isReset && !isMagic && !disableSignup && (
            <Typography variant="body2">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <Button color="primary" onClick={() => switchMode(isLogin ? "signup" : "login")} size="small" sx={{ ml: 1 }}>
                {isLogin ? "Sign up" : "Sign in"}
              </Button>
            </Typography>
          )}

          {!isForgot && !isReset && (
            <Box sx={{ mt: 1 }}>
              <Button color="secondary" size="small" onClick={() => switchMode("forgot")} sx={{ mr: 1 }}>
                Forgot password?
              </Button>
              <Button color="secondary" size="small" onClick={() => switchMode("magic")}>
                Use magic link
              </Button>
            </Box>
          )}

          {(isForgot || isReset || isMagic) && (
            <Button color="primary" size="small" sx={{ mt: 2 }} onClick={() => switchMode("login")}>
              Back to Sign In
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

AuthPage.propTypes = {
  disableSignup: PropTypes.bool,
};
