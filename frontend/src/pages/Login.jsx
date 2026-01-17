import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { authAPI } from '../services/api';
import { toast } from 'sonner';
import { Mail, Lock, ArrowLeft, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

// Constants for better maintainability
const LOCAL_STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  USER: 'assessly_user'
}; // Removed: as const

const DEMO_CREDENTIALS = {
  email: 'demo@assesslyplatform.com',
  password: 'password123'
}; // Removed: as const

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Handle redirect from protected routes
  const from = location.state?.from?.pathname || '/dashboard';

  // Form validation
  const validateForm = useCallback((email, password) => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email?.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password?.trim()) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    return errors;
  }, []);

  // Handle demo login
  const handleDemoLogin = useCallback(async () => {
    setIsDemoMode(true);
    await handleLogin(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    setIsDemoMode(false);
  }, []);

  // Main login handler
  const handleLogin = useCallback(async (email, password) => {
    const errors = validateForm(email, password);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the form errors');
      return;
    }

    setLoading(true);
    setFormErrors({});

    try {
      const credentials = { email, password };
      const result = await authAPI.login(credentials);
      
      if (!result?.access_token) {
        throw new Error('Invalid response from server');
      }

      // Store authentication data
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, result.access_token);
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(result.user));
      
      // Track successful login
      if (window.gtag) {
        window.gtag('event', 'login', {
          method: isDemoMode ? 'demo' : 'credentials'
        });
      }

      toast.success(`Welcome back, ${result.user?.name || 'User'}!`);
      
      // Redirect to intended page or dashboard
      navigate(from, { replace: true });
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different error types
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.detail || 
                       error.response.data?.message || 
                       `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response
        errorMessage = 'Network error. Please check your connection.';
      } else {
        // Other errors
        errorMessage = error.message || 'Login failed.';
      }
      
      toast.error(errorMessage);
      
      // Clear sensitive data on failure
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
      
    } finally {
      setLoading(false);
    }
  }, [validateForm, navigate, from, isDemoMode]);

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email')?.toString() || '';
    const password = formData.get('password')?.toString() || '';
    
    await handleLogin(email, password);
  };

  // Handle input change to clear errors
  const handleInputChange = (field) => {
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Loading state
  if (loading && isDemoMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="text-center mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Go back to home page"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to Home
          </Link>

          <div className="mb-4">
            <img
              src="/images/logo.png"
              alt="Assessly Platform"
              className="h-12 w-auto mx-auto"
              loading="lazy"
              width="48"
              height="48"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Sign in to your Assessly account
          </p>
        </header>

        {/* Login Card */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="john@company.com"
                  className="mt-1"
                  aria-describedby={formErrors.email ? "email-error" : undefined}
                  aria-invalid={!!formErrors.email}
                  onChange={() => handleInputChange('email')}
                  autoComplete="email"
                  disabled={loading}
                />
                {formErrors.email && (
                  <Alert variant="destructive" className="mt-2 py-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formErrors.email}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="flex items-center">
                    <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:underline"
                    aria-label="Reset your password"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="pr-10"
                    aria-describedby={formErrors.password ? "password-error" : undefined}
                    aria-invalid={!!formErrors.password}
                    onChange={() => handleInputChange('password')}
                    autoComplete="current-password"
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <Alert variant="destructive" className="mt-2 py-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formErrors.password}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={loading}
                aria-label="Sign in to your account"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Demo Login Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={handleDemoLogin}
                disabled={loading}
                aria-label="Try demo account"
              >
                Try Demo Account
              </Button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-gray-600 mt-4">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
                  aria-label="Create a new account"
                >
                  Sign up for free
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Demo credentials for testing:</p>
          <div className="mt-2 space-y-1">
            <p className="font-mono text-xs bg-gray-100 p-2 rounded">
              Email: {DEMO_CREDENTIALS.email}
            </p>
            <p className="font-mono text-xs bg-gray-100 p-2 rounded">
              Password: {DEMO_CREDENTIALS.password}
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 text-center">
            <Lock className="h-3 w-3 inline mr-1" />
            Your security is important. We use end-to-end encryption and never store passwords in plain text.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
