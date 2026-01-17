import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Checkbox } from '../components/ui/checkbox';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge'; // Added Badge import
import { authAPI } from '../services/api';
import { toast } from 'sonner';
import {
  Building2, Mail, Lock, User, ArrowLeft,
  AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, XCircle,
  Shield, Key
} from 'lucide-react';

// Constants - REMOVED "as const" since this is a JavaScript file
const LOCAL_STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  USER: 'assessly_user'
}; // Removed: as const

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
}; // Removed: as const

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPlan = location.state?.plan || 'free';

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [passwordScore, setPasswordScore] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Password strength calculator
  const calculatePasswordStrength = useCallback((password) => {
    let score = 0;

    if (!password) return 0;
    
    // Length check
    if (password.length >= PASSWORD_REQUIREMENTS.minLength) score += 25;
    
    // Character type checks
    if (/[A-Z]/.test(password)) score += 25; // Uppercase
    if (/[a-z]/.test(password)) score += 25; // Lowercase
    if (/[0-9]/.test(password)) score += 15; // Numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 10; // Special chars
    
    return Math.min(100, score);
  }, []);

  // Form validation
  const validateForm = useCallback((formData) => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;

    // Name validation
    if (!formData.name?.trim()) {
      errors.name = 'Full name is required';
    } else if (!nameRegex.test(formData.name.trim())) {
      errors.name = 'Name must be 2-50 characters with letters only';
    }
    
    // Email validation
    if (!formData.email?.trim()) {
      errors.email = 'Work email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    } else if (!formData.email.includes('@')) {
      errors.email = 'Please include "@" in the email address';
    }
    
    // Organization validation
    if (!formData.organization?.trim()) {
      errors.organization = 'Organization name is required';
    } else if (formData.organization.length < 2) {
      errors.organization = 'Organization name must be at least 2 characters';
    }
    
    // Password validation
    if (!formData.password?.trim()) {
      errors.password = 'Password is required';
    } else {
      const password = formData.password;
      
      if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.password = `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`;
      }
      
      if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.password = 'Password must include at least one uppercase letter';
      }
      
      if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.password = 'Password must include at least one lowercase letter';
      }
      
      if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
        errors.password = 'Password must include at least one number';
      }
      
      if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
        errors.password = 'Password must include at least one special character';
      }
    }
    
    // Terms validation
    if (!acceptedTerms) {
      errors.terms = 'You must accept the Terms of Service and Privacy Policy';
    }
    
    return errors;
  }, [acceptedTerms]);

  // Handle input changes
  const handleInputChange = useCallback((field, value) => {
    setFormErrors(prev => ({ ...prev, [field]: undefined }));

    if (field === 'password') {
      const score = calculatePasswordStrength(value);
      setPasswordScore(score);
    }
  }, [calculatePasswordStrength]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);

    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name')?.toString() || '',
      email: formData.get('email')?.toString() || '',
      organization: formData.get('organization')?.toString() || '',
      password: formData.get('password')?.toString() || '',
      role: 'admin',
      plan: selectedPlan,
      agreed_to_terms: acceptedTerms,
      agreed_at: new Date().toISOString()
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
      const result = await authAPI.register(data);
      
      if (!result?.access_token) {
        throw new Error('Invalid response from server');
      }

      // Store authentication data
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, result.access_token);
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(result.user));
      
      // Track registration
      if (window.gtag) {
        window.gtag('event', 'sign_up', {
          method: 'email',
          plan: selectedPlan
        });
      }

      toast.success('Account created successfully! Redirecting to dashboard...');
      
      // Show welcome message
      toast.info(`Welcome to Assessly, ${result.user.name}! Start by creating your first assessment.`);
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
      
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response) {
        const errorData = error.response.data;
        
        if (errorData?.detail?.includes('already exists') || errorData?.email) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (errorData?.detail) {
          errorMessage = errorData.detail;
        } else if (error.response.status === 422) {
          errorMessage = 'Please check your information and try again.';
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
      
      // Clear sensitive data on failure
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
      
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
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

  // Loading state
  if (loading && !isSubmitted) {
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
            Create Your Account
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Start your 14-day free trial. No credit card required.
          </p>
        </header>

        {/* Registration Card */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl">Sign Up</CardTitle>
            <CardDescription>
              {selectedPlan !== 'free' && (
                <Badge className="bg-gradient-to-r from-blue-600 to-teal-600 text-white">
                  Selected Plan: {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                </Badge>
              )}
              <p className="mt-2 text-sm text-gray-600">
                Complete the form below to get started
              </p>
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              <div>
                <Label htmlFor="name" className="flex items-center">
                  <User className="mr-2 h-4 w-4" aria-hidden="true" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  className="mt-1"
                  aria-describedby={formErrors.name ? "name-error" : undefined}
                  aria-invalid={!!formErrors.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                />
                {formErrors.name && (
                  <Alert variant="destructive" className="mt-2 py-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formErrors.name}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Work Email */}
              <div>
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Work Email
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
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
                {formErrors.email && (
                  <Alert variant="destructive" className="mt-2 py-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formErrors.email}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Organization */}
              <div>
                <Label htmlFor="organization" className="flex items-center">
                  <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Organization Name
                </Label>
                <Input
                  id="organization"
                  name="organization"
                  type="text"
                  required
                  placeholder="Your Company"
                  className="mt-1"
                  aria-describedby={formErrors.organization ? "organization-error" : undefined}
                  aria-invalid={!!formErrors.organization}
                  onChange={(e) => handleInputChange('organization', e.target.value)}
                  disabled={loading}
                  autoComplete="organization"
                />
                {formErrors.organization && (
                  <Alert variant="destructive" className="mt-2 py-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formErrors.organization}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="flex items-center">
                  <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                  Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="pr-10"
                    aria-describedby={formErrors.password ? "password-error password-strength" : "password-strength"}
                    aria-invalid={!!formErrors.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                    minLength={PASSWORD_REQUIREMENTS.minLength}
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
                
                {/* Password Strength Indicator */}
                {passwordScore > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Password strength:</span>
                      <span className={`font-medium ${
                        passwordScore < 40 ? 'text-red-600' :
                        passwordScore < 70 ? 'text-yellow-600' :
                        passwordScore < 90 ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {getPasswordStrengthText(passwordScore)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordScore)}`}
                        style={{ width: `${passwordScore}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Password Requirements */}
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-gray-700">Password must contain:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-center">
                      {formErrors.password?.includes('8 characters') || !formErrors.password ? (
                        <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-2 text-red-500" />
                      )}
                      At least 8 characters
                    </li>
                    <li className="flex items-center">
                      {formErrors.password?.includes('uppercase') || !formErrors.password ? (
                        <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-2 text-red-500" />
                      )}
                      One uppercase letter (A-Z)
                    </li>
                    <li className="flex items-center">
                      {formErrors.password?.includes('lowercase') || !formErrors.password ? (
                        <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-2 text-red-500" />
                      )}
                      One lowercase letter (a-z)
                    </li>
                    <li className="flex items-center">
                      {formErrors.password?.includes('number') || !formErrors.password ? (
                        <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-2 text-red-500" />
                      )}
                      One number (0-9)
                    </li>
                    <li className="flex items-center">
                      {formErrors.password?.includes('special character') || !formErrors.password ? (
                        <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-2 text-red-500" />
                      )}
                      One special character (!@#$%^&*)
                    </li>
                  </ul>
                </div>
                
                {formErrors.password && (
                  <Alert variant="destructive" className="mt-2 py-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formErrors.password}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Terms Agreement */}
              <div className="pt-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    aria-describedby={formErrors.terms ? "terms-error" : undefined}
                    disabled={loading}
                    className="mt-1"
                  />
                  <Label htmlFor="terms" className="text-sm leading-tight">
                    I agree to the{' '}
                    <Link 
                      to="/terms" 
                      className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link 
                      to="/privacy" 
                      className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </Link>
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
                aria-label="Create your account"
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

              {/* Sign In Link */}
              <p className="text-center text-sm text-gray-600 pt-2">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
                  aria-label="Sign in to your existing account"
                >
                  Sign in
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

export default Register;
