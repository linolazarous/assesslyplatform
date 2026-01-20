import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { login } from '../utils/auth'; // Import from auth utils
import api from '../utils/auth'; // Import axios instance
import { toast } from 'sonner';
import {
  Mail, Lock, ArrowLeft, AlertCircle, Eye, EyeOff, Loader2,
  CheckCircle2, User, Shield, Key, ExternalLink
} from 'lucide-react';

// Constants - UPDATED to match backend
const LOCAL_STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user'
};

// Environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://assesslyplatform-pfm1.onrender.com/api";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Get referral/redirect info
  const from = location.state?.from?.pathname || '/dashboard';
  const redirectMessage = location.state?.message;

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Show redirect message if present
  useEffect(() => {
    if (redirectMessage) {
      toast.info(redirectMessage);
    }
    
    // Track login page view
    if (window.gtag) {
      window.gtag('event', 'view_login_page', {
        timestamp: new Date().toISOString(),
        redirect_from: from !== '/dashboard' ? from : null
      });
    }
  }, [redirectMessage, from]);

  // Form validation
  const validateForm = useCallback((formData) => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Email validation
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password?.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    return errors;
  }, []);

  // Handle input changes
  const handleInputChange = useCallback((field) => {
    setFormErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  // Handle form submission - UPDATED to use auth utility
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      email: formData.get('email')?.toString() || '',
      password: formData.get('password')?.toString() || '',
    };

    const errors = validateForm(data);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    setFormErrors({});

    try {
      // Use the auth utility for login
      const result = await login(data.email, data.password);
      
      // Track successful login
      if (window.gtag) {
        window.gtag('event', 'login_complete', {
          method: 'credentials',
          user_id: result.user?.id?.substring(0, 8),
          email_provider: data.email.split('@')[1]
        });
        
        window.gtag('event', 'login', {
          method: 'credentials'
        });
      }
      
      // Facebook Pixel conversion
      if (window.fbq) {
        window.fbq('track', 'Login', {
          method: 'credentials'
        });
      }

      // Handle unverified email
      if (result.user?.is_verified === false) {
        toast.warning('Please verify your email to access all features');
      }

      toast.success(`Welcome back, ${result.user?.name || 'User'}!`);
      
      // Redirect based on backend response or default
      const redirectPath = result.redirect_url ? 
        result.redirect_url.replace(config.FRONTEND_URL, '') : 
        from;
      
      // Redirect after short delay
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 500);
      
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      const fieldErrors = {};
      
      if (error.response) {
        const errorData = error.response.data;
        
        // Handle rate limiting
        if (error.response.status === 429) {
          errorMessage = 'Too many login attempts. Please try again in a few minutes.';
          toast.error(errorMessage);
          
          // Disable form for 2 minutes
          setTimeout(() => {
            setLoading(false);
          }, 120000);
          return;
        }
        
        // Handle field-specific validation errors from backend
        if (errorData?.detail && typeof errorData.detail === 'object') {
          Object.entries(errorData.detail).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              fieldErrors[field] = messages[0];
            }
          });
          setFormErrors(fieldErrors);
          errorMessage = 'Please fix the errors in the form.';
        } 
        else if (errorData?.detail?.includes('Invalid credentials') || 
                 errorData?.detail?.includes('Invalid email or password') ||
                 error.response.status === 401) {
          errorMessage = 'Invalid email or password. Please try again.';
          setFormErrors({ 
            email: 'Invalid credentials',
            password: 'Invalid credentials' 
          });
          
          // Track failed login attempt
          if (window.gtag) {
            window.gtag('event', 'login_failed_invalid_credentials', {
              email_hash: data.email.substring(0, 5) + '...'
            });
          }
        } 
        else if (errorData?.detail?.includes('account locked') || 
                 errorData?.detail?.includes('suspended')) {
          errorMessage = 'Account is temporarily locked. Please contact support or try again later.';
          toast.error(errorMessage);
        }
        else if (errorData?.detail) {
          errorMessage = errorData.detail;
        } 
        else if (error.response.status === 422) {
          errorMessage = 'Please check your information and try again.';
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
    } finally {
      setLoading(false);
    }
  };

  // Handle social login - UPDATED URL
  const handleSocialLogin = (provider) => {
    // Track social login attempt
    if (window.gtag) {
      window.gtag('event', 'social_login_attempt', {
        provider: provider
      });
    }
    
    // Redirect to backend OAuth endpoint
    window.location.href = `${API_BASE_URL}/auth/${provider}?redirect_uri=${encodeURIComponent(window.location.origin + '/dashboard')}`;
  };

  // Forgot password handler
  const handleForgotPassword = () => {
    // TODO: Implement forgot password flow
    toast.info('Forgot password feature coming soon!');
    
    if (window.gtag) {
      window.gtag('event', 'click_forgot_password', {
        location: 'login_page'
      });
    }
  };

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
            <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg mx-auto flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Sign in to access your Assessly account
          </p>
        </header>

        {/* Login Card */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
              {from !== '/dashboard' && (
                <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                  Redirecting to: {from.split('/').pop() || 'dashboard'}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Social Login Options */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                  className="hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin('github')}
                  disabled={loading}
                  className="hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </Button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Email Address
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
                  onChange={(e) => handleInputChange('email')}
                  disabled={loading}
                  autoComplete="email"
                  inputMode="email"
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
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:underline"
                    disabled={loading}
                  >
                    Forgot password?
                  </button>
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
                    onChange={(e) => handleInputChange('password')}
                    disabled={loading}
                    autoComplete="current-password"
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
                className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                aria-label="Sign in to your account"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-gray-600 pt-2">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
                  aria-label="Create a new account"
                  onClick={() => {
                    if (window.gtag) {
                      window.gtag('event', 'click_register_from_login', {
                        location: 'login_page'
                      });
                    }
                  }}
                >
                  Sign up for free
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Security & Trust Signals */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-600 mr-1" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center">
              <Key className="h-4 w-4 text-blue-600 mr-1" />
              <span>End-to-End Encryption</span>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 text-center">
              <Lock className="h-3 w-3 inline mr-1" />
              Your data is protected with military-grade encryption. We never share your information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
