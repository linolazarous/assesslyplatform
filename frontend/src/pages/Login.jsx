// frontend/src/pages/Login.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import config, { isAuthenticated, isValidEmail } from '../config.js';
import { login as authLogin, clearAuthData } from '../utils/auth';
import {
  Mail, Lock, ArrowLeft, AlertCircle, Eye, EyeOff, Loader2,
  CheckCircle2, User, Shield, Key, Smartphone, Globe,
  ExternalLink, Sparkles
} from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { executeRecaptcha } = useGoogleReCaptcha(); // v3 hook

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const from = location.state?.from?.pathname || '/dashboard';
  const redirectMessage = location.state?.message;
  const referralCode = new URLSearchParams(window.location.search).get('ref');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (redirectMessage) {
      toast.info(redirectMessage);
    }
  }, [redirectMessage]);

  const validateForm = useCallback((data) => {
    const errors = {};
    if (!data.email?.trim()) errors.email = 'Email is required';
    else if (!isValidEmail(data.email)) errors.email = 'Invalid email address';

    if (!data.password?.trim()) errors.password = 'Password is required';
    else if (data.password.length < 6) errors.password = 'Password must be at least 6 characters';

    return errors;
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the form errors');
      return;
    }

    setLoading(true);
    setFormErrors({});

    try {
      let recaptchaToken = null;
      if (import.meta.env.VITE_RECAPTCHA_SITE_KEY && executeRecaptcha) {
        recaptchaToken = await executeRecaptcha('login'); // 'login' = action name (descriptive)
      }

      const loginData = {
        email: formData.email.trim(),
        password: formData.password,
        ...(recaptchaToken && { recaptcha_token: recaptchaToken }),
      };

      const result = await authLogin(loginData);

      // Success handling (your existing code)
      const userName = result.user?.name || 'User';
      toast.success(`Welcome back, ${userName}!`);

      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
      } else {
        localStorage.removeItem('remember_me');
      }

      const redirectPath = result.redirect_url
        ? result.redirect_url.replace(config.FRONTEND_URL, '')
        : from;

      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 500);

    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'Login failed. Please try again.';
      const fieldErrors = {};

      // Your existing error handling logic...
      // (keep as-is, just shortened here for brevity)
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password';
        fieldErrors.email = 'Invalid credentials';
        fieldErrors.password = 'Invalid credentials';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many attempts. Try again later.';
        toast.error(errorMessage);
        setTimeout(() => setLoading(false), 120000);
        return;
      } else if (error.response?.data?.detail?.includes('reCAPTCHA')) {
        errorMessage = 'reCAPTCHA verification failed. Please try again.';
      }

      setFormErrors(fieldErrors);
      toast.error(errorMessage);

    } finally {
      setLoading(false);
    }
  };

  // Your existing social login, forgot password, demo login handlers remain unchanged

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header - unchanged */}
        <header className="text-center mb-6 sm:mb-8">
          {/* ... your header content ... */}
        </header>

        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>

          <CardContent>
            {/* Social login section - unchanged */}
            {/* ... */}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email & Password fields - unchanged */}
              {/* ... */}

              {/* Remember Me - no reCAPTCHA widget anymore */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                  disabled={loading}
                />
                <Label htmlFor="remember-me" className="text-sm">
                  Remember me for 30 days
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={loading}
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

              {/* Sign Up link - unchanged */}
              <p className="text-center text-sm text-gray-600 pt-2">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 hover:underline">
                  Sign up for free
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Trust signals & links - unchanged */}
      </div>
    </div>
  );
};

export default Login;
