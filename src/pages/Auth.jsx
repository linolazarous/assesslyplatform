import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

/**
 * Production-ready Auth page supporting:
 * - Login / Signup / Forgot password / Reset password
 * - Magic link (email) login
 * - Social logins: Google, GitHub, LinkedIn (backend-driven)
 * - Token callback handling via URL query (?token=...)
 */
export default function AuthPage({ disableSignup = false }) {
  const { login, register, logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const urlToken = params.get("token") || params.get("magic_token") || null;
  const { enqueueSnackbar } = useSnackbar();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("assessor");
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [isMagic, setIsMagic] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle token from URL (OAuth or magic link)
  useEffect(() => {
    if (urlToken) {
      try {
        localStorage.setItem("token", urlToken);
        enqueueSnackbar("Logged in via external provider.", { variant: "success" });
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Failed to process token from URL:", err);
        enqueueSnackbar("Failed to complete external login.", { variant: "error" });
      }
      return;
    }

    const tab = params.get("tab");
    if (tab === "signup" && !disableSignup) {
      setIsLogin(false);
      setIsForgot(false);
      setIsMagic(false);
    } else if (tab === "forgot") {
      setIsForgot(true);
      setIsLogin(false);
    } else if (tab === "magic") {
      setIsMagic(true);
      setIsLogin(false);
    } else {
      setIsLogin(true);
      setIsForgot(false);
      setIsMagic(false);
    }

    logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, urlToken]);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, location.state]);

  // Validation
  const validateForm = () => {
    if (!email || !email.includes("@")) {
      enqueueSnackbar("Please enter a valid email address.", { variant: "error" });
      return false;
    }
    if (!isForgot && !isMagic && !isReset && (!password || password.length < 6)) {
      enqueueSnackbar("Password must be at least 6 characters long.", { variant: "error" });
      return false;
    }
    if (isReset && password !== confirmPassword) {
      enqueueSnackbar("Passwords do not match.", { variant: "error" });
      return false;
    }
    return true;
  };

  // Main auth handler
  const handleAuth = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (isMagic) {
        const res = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, redirectTo: `${window.location.origin}/auth?magic_token=` }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to send magic link.");
        enqueueSnackbar("Magic link sent. Check your email.", { variant: "success" });

      } else if (isForgot) {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Password reset request failed.");
        enqueueSnackbar("Password reset link sent to your email.", { variant: "success" });
        setIsForgot(false);
        setIsLogin(true);

      } else if (isReset) {
        if (!urlToken) throw new Error("Reset token is missing from the URL.");
        const res = await fetch(`/api/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: urlToken, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Password reset failed.");
        enqueueSnackbar("Password reset successful. Please sign in.", { variant: "success" });
        navigate("/auth?tab=login", { replace: true });

      } else if (isLogin) {
        const success = await login(email, password);
        if (success) {
          enqueueSnackbar("Login successful!", { variant: "success" });
          const from = location.state?.from?.pathname || "/dashboard";
          navigate(from, { replace: true });
        } else {
          enqueueSnackbar("Invalid credentials. Please try again.", { variant: "error" });
        }

      } else {
        await register({ email, password, role });
        enqueueSnackbar("Account created successfully! Please sign in.", { variant: "success" });
        setIsLogin(true);
        navigate("/auth?tab=login", { replace: true });
      }
    } catch (err) {
      console.error("Auth error:", err);
      enqueueSnackbar(err.message || "An authentication error occurred.", { variant: "error", autoHideDuration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  // Social OAuth redirect
  const redirectToOAuth = (provider) => {
    window.location.href = `/api/auth/${provider}`;
  };

  // UI mode switch
  const switchMode = (mode) => {
    setIsForgot(false);
    setIsReset(false);
    setIsMagic(false);
    setIsLogin(mode === "login");
    if (mode === "magic") setIsMagic(true);
    navigate(`/auth?tab=${mode}`, { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#f6f8fb 0%,#e8eefc 100%)",
        p: 2,
      }}
    >
      <Paper elevation={6} sx={{ width: "100%", maxWidth: 460, p: 4, borderRadius: 3 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {isReset ? "Reset Your Password" :
             isForgot ? "Forgot Password" :
             isMagic ? "Sign in with Magic Link" :
             isLogin ? "Sign In to Assessly" :
             "Create Your Assessly Account"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isReset ? "Enter a new password below to finish resetting." :
             isForgot ? "We'll send a password reset link to your email." :
             isMagic ? "Enter your email and we'll send a login link." :
             isLogin ? "Welcome back — sign in to continue." :
             "Create an account to get started."}
          </Typography>
        </Box>

        {/* Email */}
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          autoComplete="email"
          required
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
                  <IconButton onClick={() => setShowPassword((p) => !p)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* Confirm password for reset */}
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
          <Select value={role} onChange={(e) => setRole(e.target.value)} fullWidth sx={{ mt: 2 }}>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="assessor">Assessor</MenuItem>
            <MenuItem value="candidate">Candidate</MenuItem>
          </Select>
        )}

        {/* Primary action button */}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleAuth}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ mt: 3, py: 1.4 }}
        >
          {loading
            ? "Processing..."
            : isReset
            ? "Reset Password"
            : isForgot
            ? "Send Reset Link"
            : isMagic
            ? "Send Magic Link"
            : isLogin
            ? "Sign In"
            : "Sign Up"}
        </Button>

        {/* Social & alternate options */}
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
