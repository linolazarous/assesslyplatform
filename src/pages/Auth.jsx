import React, { useState, useEffect } from 'react';
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
  Box
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff,
  Google
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx'; // Corrected path/extension

export default function AuthPage({ disableSignup = false }) {
  const { logout } = useAuth(); // Ensure we don't try to use login/register functions if AuthContext is simplified
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('assessor');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Determine initial tab from URL query param (e.g., /auth?tab=signup)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'signup' && !disableSignup) {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
    // Clear any previous token/state when arriving at the auth page
    logout(); 
  }, [location.search, disableSignup, logout]);

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      enqueueSnackbar('Please enter a valid email', { variant: 'error' });
      return false;
    }
    if (!password || password.length < 6) {
      enqueueSnackbar('Password must be at least 6 characters', { variant: 'error' });
      return false;
    }
    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: isLogin ? undefined : role }), 
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (isLogin ? 'Login failed' : 'Registration failed'));
      }

      if (isLogin) {
        // IMPORTANT: In a real app, you'd use the login function from AuthContext here.
        localStorage.setItem('token', data.token); 
        enqueueSnackbar('Login successful', { variant: 'success' });
        navigate('/dashboard'); // Navigate to a protected dashboard route
      } else {
        enqueueSnackbar('Account created successfully. Please sign in.', { variant: 'success' });
        setIsLogin(true);
      }

    } catch (err) {
      console.error('Auth error:', err);
      enqueueSnackbar(err.message || 'An authentication error occurred.', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    enqueueSnackbar('Google login is not yet implemented for this platform.', { variant: 'info' });
  };

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ mt: 1 }}>
          {isLogin ? 'Sign In to Assessly' : 'Create Your Assessly Account'}
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
        type={showPassword ? 'text' : 'password'}
        fullWidth
        margin="normal"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={isLogin ? 'current-password' : 'new-password'}
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
          )
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
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        sx={{ mt: 3, py: 1.5 }}
      >
        {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
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
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <Button
              color="primary"
              onClick={() => {
                setIsLogin(!isLogin);
                navigate(`/auth?tab=${isLogin ? 'signup' : 'login'}`, { replace: true });
              }}
              size="small"
              sx={{ ml: 1 }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </Button>
          </Typography>
        </Box>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
        <Link to="/forgot-password" style={{ color: 'inherit' }}>Forgot password?</Link>
      </Typography>
    </Box>
  );
}
