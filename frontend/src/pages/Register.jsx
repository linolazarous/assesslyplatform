// frontend/src/pages/Register.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import config, { isAuthenticated, isValidEmail, validatePassword } from '../config.js';
import { register as authRegister, clearAuthData } from '../utils/auth';
import {
  Building2, Mail, Lock, User, ArrowLeft,
  AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, XCircle,
  Shield, Key, ExternalLink, Check, X, Sparkles
} from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// Constants
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { executeRecaptcha } = useGoogleReCaptcha(); // ← v3 hook

  const selectedPlan = location.state?.plan || 'free';

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [passwordScore, setPasswordScore] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    password: '',
    confirm_password: ''
  });

  const referralCode = new URLSearchParams(window.location.search).get('ref');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Track registration start
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'begin_registration', {
        plan: selectedPlan,
        timestamp: new Date().toISOString(),
        referral_code: referralCode || null
      });
    }
  }, [selectedPlan, referralCode]);

  const calculatePasswordStrength = useCallback((password) => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= PASSWORD_REQUIREMENTS.minLength) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;
    return Math.min(100, score);
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: undefined }));

    if (field === 'password') {
      setPasswordScore(calculatePasswordStrength(value));
    }

    if (field === 'confirm_password') {
      if (formData.password !== value) {
        setFormErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }));
      } else {
        setFormErrors(prev => ({ ...prev, confirm_password: undefined }));
      }
    }
  }, [formData.password, calculatePasswordStrength]);

  const validateForm = useCallback((data) => {
    const errors = {};

    if (!data.name?.trim()) errors.name = 'Full name is required';
    else if (data.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';

    if (!data.email?.trim()) errors.email = 'Email is required';
    else if (!isValidEmail(data.email)) errors.email = 'Invalid email address';

    if (!data.organization?.trim()) errors.organization = 'Organization name is required';

    const pwValidation = validatePassword(data.password);
    if (!data.password?.trim()) errors.password = 'Password is required';
    else if (!pwValidation.isValid) errors.password = pwValidation.message;

    if (!data.confirm_password?.trim()) errors.confirm_password = 'Please confirm your password';
    else if (data.password !== data.confirm_password) errors.confirm_password = 'Passwords do not match';

    if (!acceptedTerms) errors.terms = 'You must accept the Terms of Service and Privacy Policy';

    return errors;
  }, [acceptedTerms]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please correct the errors in the form');
      return;
    }

    setLoading(true);
    setFormErrors({});

    try {
      // Generate reCAPTCHA v3 token (invisible)
      let recaptchaToken = null;
      if (import.meta.env.VITE_RECAPTCHA_SITE_KEY && executeRecaptcha) {
        recaptchaToken = await executeRecaptcha('register'); // action name = 'register'
      }

      const registrationData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        organization: formData.organization.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
        ...(recaptchaToken && { recaptcha_token: recaptchaToken }),
      };

      const result = await authRegister(registrationData);

      // Success handling
      toast.success('Account created successfully!');

      if (config.FEATURES.EMAIL_VERIFICATION && !result.user?.is_verified) {
        toast.info('Please check your email to verify your account.');
        navigate('/verify-email', {
          state: { email: formData.email, name: formData.name, user_id: result.user?.id }
        });
      } else {
        toast.info(`Welcome to Assessly, ${result.user?.name || 'User'}!`);
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      }

      // Analytics
      if (window.gtag) {
        window.gtag('event', 'registration_complete', {
          plan: selectedPlan,
          method: 'email',
          referral_code: referralCode || null
        });
        window.gtag('event', 'sign_up', { method: 'email' });
      }

    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = 'Registration failed. Please try again.';
      const fieldErrors = {};

      if (error.response?.status === 429) {
        errorMessage = 'Too many attempts. Please try again later.';
        toast.error(errorMessage);
      } else if (error.response?.data?.detail?.includes('already exists') || error.response?.status === 400) {
        errorMessage = 'An account with this email already exists.';
        fieldErrors.email = errorMessage;
      } else if (error.response?.data?.detail?.includes('reCAPTCHA')) {
        errorMessage = 'reCAPTCHA verification failed. Please try again.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      setFormErrors(fieldErrors);
      toast.error(errorMessage);

    } finally {
      setLoading(false);
    }
  };

  // Password strength helpers (unchanged)
  const getPasswordStrengthColor = (score) => {
    if (score < 40) return 'bg-red-500';
    if (score < 70) return 'bg-yellow-500';
    if (score < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score) => {
    if (score < 40) return 'Weak';
    if (score < 70) return 'Fair';
    if (score < 90) return 'Good';
    return 'Strong';
  };

  const passwordRequirements = {
    length: formData.password.length >= PASSWORD_REQUIREMENTS.minLength,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    numbers: /[0-9]/.test(formData.password),
    specialChars: /[^A-Za-z0-9]/.test(formData.password)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <header className="text-center mb-6 sm:mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4 text-gray-600 hover:text-gray-900"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="mb-4">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg mx-auto flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-600">
            Start your free trial. No credit card required.
            {referralCode && <Badge className="ml-2">Referral: {referralCode}</Badge>}
          </p>
        </header>

        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl">Sign Up</CardTitle>
            <CardDescription>
              Complete the form below to get started
              {selectedPlan !== 'free' && (
                <Badge className="ml-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
                  Plan: {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Social login (unchanged) */}
            {config.FEATURES.SOCIAL_LOGIN && (
              <div className="mb-6">
                {/* ... your social buttons ... */}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Name, Email, Organization, Password, Confirm Password fields */}
              {/* Keep your existing fields exactly as they are */}
              {/* ... paste your name, email, organization, password, confirm_password inputs here ... */}

              {/* Terms checkbox (unchanged) */}
              <div className="pt-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={setAcceptedTerms}
                    disabled={loading}
                  />
                  <Label htmlFor="terms" className="text-sm leading-tight">
                    I agree to the{' '}
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => window.open('/terms', '_blank')}>
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => window.open('/privacy', '_blank')}>
                      Privacy Policy
                    </button>
                  </Label>
                </div>
                {formErrors.terms && (
                  <Alert variant="destructive" className="mt-2 py-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formErrors.terms}</AlertDescription>
                  </Alert>
                )}
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
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              {/* Sign In link */}
              <p className="text-center text-sm text-gray-600 pt-2">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Trust signals */}
        <div className="mt-6 space-y-4">
          {/* ... your trust badges ... */}
          <p className="text-xs text-gray-500 text-center mt-4">
            This site is protected by reCAPTCHA and the Google
            {' '}
            <a href="https://policies.google.com/privacy" target="_blank" className="underline hover:text-gray-700">
              Privacy Policy
            </a>{' '}
            and
            {' '}
            <a href="https://policies.google.com/terms" target="_blank" className="underline hover:text-gray-700">
              Terms of Service
            </a>{' '}
            apply.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
