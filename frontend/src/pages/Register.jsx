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
import { authAPI } from '../services/api'; // Updated import path
import { toast } from 'sonner';
import config, { isAuthenticated } from '../config.js'; // Updated import
import {
  Building2, Mail, Lock, User, ArrowLeft,
  AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, XCircle,
  Shield, Key, ExternalLink
} from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha'; // Add reCAPTCHA

// Constants using config
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
  const selectedPlan = location.state?.plan || 'free';

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [passwordScore, setPasswordScore] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [recaptchaKey] = useState(import.meta.env.VITE_RECAPTCHA_SITE_KEY || '');

  // Get referral code from URL
  const referralCode = new URLSearchParams(window.location.search).get('ref');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Track registration attempts
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'begin_registration', {
        plan: selectedPlan,
        timestamp: new Date().toISOString(),
        referral_code: referralCode || null
      });
    }
  }, [selectedPlan, referralCode]);

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

    // Name validation - Backend expects 'name' field (not first_name/last_name)  
    if (!formData.name?.trim()) {  
      errors.name = 'Full name is required';  
    } else if (!nameRegex.test(formData.name.trim())) {  
      errors.name = 'Name must be 2-50 characters with letters only';  
    }  
    
    // Email validation  
    if (!formData.email?.trim()) {  
      errors.email = 'Email is required';  
    } else if (!emailRegex.test(formData.email)) {  
      errors.email = 'Please enter a valid email address';  
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
    
    // Confirm password validation  
    if (!formData.confirm_password?.trim()) {  
      errors.confirm_password = 'Please confirm your password';  
    } else if (formData.password !== formData.confirm_password) {  
      errors.confirm_password = 'Passwords do not match';  
    }  
    
    // reCAPTCHA validation (only if enabled)  
    if (recaptchaKey && !recaptchaToken) {  
      errors.recaptcha = 'Please complete the reCAPTCHA verification';  
    }  
    
    // Terms validation  
    if (!acceptedTerms) {  
      errors.terms = 'You must accept the Terms of Service and Privacy Policy';  
    }  
    
    return errors;  

  }, [acceptedTerms, recaptchaToken, recaptchaKey]);

  // Handle input changes
  const handleInputChange = useCallback((field, value) => {
    setFormErrors(prev => ({ ...prev, [field]: undefined }));

    if (field === 'password') {  
      const score = calculatePasswordStrength(value);  
      setPasswordScore(score);  
    }  

  }, [calculatePasswordStrength]);

  // Handle reCAPTCHA change
  const handleRecaptchaChange = useCallback((token) => {
    setRecaptchaToken(token);
    setFormErrors(prev => ({ ...prev, recaptcha: undefined }));
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);  
    const data = {  
      name: formData.get('name')?.toString() || '',  
      email: formData.get('email')?.toString() || '',  
      organization: formData.get('organization')?.toString() || '',  
      password: formData.get('password')?.toString() || '',  
      confirm_password: formData.get('confirm_password')?.toString() || '',  
    };  

    // Add reCAPTCHA token if available  
    if (recaptchaToken) {  
      data.recaptcha_token = recaptchaToken;  
    }  

    const errors = validateForm(data);  
    if (Object.keys(errors).length > 0) {  
      setFormErrors(errors);  
      toast.error('Please fix the errors in the form');  
      return;  
    }  

    setLoading(true);  
    setFormErrors({});  

    try {  
      // Use the authAPI for registration  
      const result = await authAPI.register(data);  
        
      // Check if registration was successful  
      if (!result || !result.access_token) {  
        throw new Error('Registration failed - no access token received');  
      }  
        
      // Track successful registration  
      if (window.gtag) {  
        window.gtag('event', 'registration_complete', {  
          plan: selectedPlan,  
          method: 'email',  
          referral_code: referralCode || null,  
          user_id: result.user?.id?.substring(0, 8)  
        });  
          
        window.gtag('event', 'sign_up', {  
          method: 'email'  
        });  
      }  

      // Handle email verification flow - check if user is verified  
      // Note: Backend doesn't return is_verified in the token response  
      // You might need to check this differently  
      if (config.FEATURES.EMAIL_VERIFICATION) {  
        toast.success('Account created! Please check your email to verify your account.');  
          
        navigate('/verify-email', {   
          state: {   
            email: data.email,  
            name: data.name,  
            user_id: result.user?.id  
          }  
        });  
      } else {  
        toast.success('Account created successfully! Redirecting to dashboard...');  
          
        // Show welcome message  
        toast.info(`Welcome to Assessly, ${result.user?.name || 'User'}! Start by creating your first assessment.`);  
          
        // Redirect to dashboard after short delay  
        setTimeout(() => {  
          navigate('/dashboard', { replace: true });  
        }, 1500);  
      }  
        
    } catch (error) {  
      console.error('Registration error:', error);  
        
      let errorMessage = 'Registration failed. Please try again.';  
      const fieldErrors = {};  
        
      if (error.response) {  
        const errorData = error.response.data;  
          
        // Handle rate limiting  
        if (error.response.status === 429) {  
          errorMessage = 'Too many registration attempts. Please try again in a few minutes.';  
          toast.error(errorMessage);  
          return;  
        }  
          
        // Handle field-specific validation errors from backend  
        if (errorData?.errors && typeof errorData.errors === 'object') {  
          Object.entries(errorData.errors).forEach(([field, messages]) => {  
            if (Array.isArray(messages)) {  
              fieldErrors[field] = messages[0];  
            }  
          });  
          setFormErrors(fieldErrors);  
          errorMessage = 'Please fix the errors in the form.';  
        }   
        // Handle backend validation errors  
        else if (errorData?.detail && typeof errorData.detail === 'object') {  
          Object.entries(errorData.detail).forEach(([field, messages]) => {  
            if (Array.isArray(messages)) {  
              fieldErrors[field] = messages[0];  
            } else if (typeof messages === 'string') {  
              // Map backend field names to frontend field names  
              const frontendField = field === 'password' ? 'password' : field;  
              fieldErrors[frontendField] = messages;  
            }  
          });  
          setFormErrors(fieldErrors);  
          errorMessage = 'Please fix the errors in the form.';  
        }  
        // Handle specific backend errors  
        else if (errorData?.detail?.includes('already registered') ||   
                 errorData?.detail?.includes('already exists') ||  
                 error.response.status === 400) {  
          if (errorData.detail.includes('email')) {  
            errorMessage = 'An account with this email already exists. Please sign in instead.';  
            setFormErrors({ email: errorMessage });  
          } else {  
            errorMessage = errorData.detail || 'Registration failed. Please check your information.';  
          }  
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
        
      // Reset reCAPTCHA on error  
      if (window.grecaptcha && recaptchaKey) {  
        window.grecaptcha.reset();  
        setRecaptchaToken(null);  
      }  
        
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

  // Handle social login using config
  const handleSocialLogin = (provider) => {
    if (!config.SERVICES[`${provider.toUpperCase()}_CLIENT_ID`]) {
      toast.error(`${provider} login is not configured`);
      return;
    }

    // Track social login attempt  
    if (window.gtag) {  
      window.gtag('event', 'social_login_attempt', {  
        provider: provider,  
        plan: selectedPlan  
      });  
    }  
    
    // Redirect to backend OAuth endpoint  
    const authUrl = `${config.API_BASE_URL}/auth/${provider}`;  
    window.location.href = authUrl;  

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
            aria-label="Go back to home"
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
          <p className="text-gray-600 text-sm sm:text-base">  
            Start your free trial. No credit card required.  
            {referralCode && (  
              <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">  
                Referral: {referralCode}  
              </Badge>  
            )}  
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
            {/* Social Login Options */}  
            {config.FEATURES.SOCIAL_LOGIN && (  
              <div className="mb-6">  
                <div className="relative my-4">  
                  <div className="absolute inset-0 flex items-center">  
                    <div className="w-full border-t border-gray-300"></div>  
                  </div>  
                  <div className="relative flex justify-center text-sm">  
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>  
                  </div>  
                </div>  

                <div className="grid grid-cols-2 gap-2">  
                  {config.SERVICES.GOOGLE_CLIENT_ID && (  
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
                  )}  
                  {config.SERVICES.GITHUB_CLIENT_ID && (  
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
                  )}  
                </div>  
              </div>  
            )}  

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>  
              {/* Full Name Field - Backend expects 'name' */}  
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
                  maxLength={50}  
                />  
                {formErrors.name && (  
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>  
                )}  
              </div>  

              {/* Email */}  
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
                  onChange={(e) => handleInputChange('email', e.target.value)}  
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
                  maxLength={100}  
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

              {/* Confirm Password */}  
              <div>  
                <Label htmlFor="confirm_password" className="flex items-center">  
                  <Lock className="mr-2 h-4 w-4" aria-hidden="true" />  
                  Confirm Password  
                </Label>  
                <div className="relative mt-1">  
                  <Input  
                    id="confirm_password"  
                    name="confirm_password"  
                    type={showPassword ? "text" : "password"}  
                    required  
                    placeholder="••••••••"  
                    className="pr-10"  
                    aria-describedby={formErrors.confirm_password ? "confirm-password-error" : undefined}  
                    aria-invalid={!!formErrors.confirm_password}  
                    onChange={(e) => handleInputChange('confirm_password', e.target.value)}  
                    disabled={loading}  
                    autoComplete="new-password"  
                    minLength={PASSWORD_REQUIREMENTS.minLength}  
                  />  
                </div>  
                {formErrors.confirm_password && (  
                  <Alert variant="destructive" className="mt-2 py-2 text-sm">  
                    <AlertCircle className="h-4 w-4" />  
                    <AlertDescription>{formErrors.confirm_password}</AlertDescription>  
                  </Alert>  
                )}  
              </div>  

              {/* reCAPTCHA */}  
              {recaptchaKey && (  
                <div>  
                  <ReCAPTCHA  
                    sitekey={recaptchaKey}  
                    onChange={handleRecaptchaChange}  
                    onErrored={() => {  
                      setFormErrors(prev => ({ ...prev, recaptcha: 'reCAPTCHA verification failed. Please try again.' }));  
                    }}  
                    className="mt-2"  
                  />  
                  {formErrors.recaptcha && (  
                    <Alert variant="destructive" className="mt-2 py-2 text-sm">  
                      <AlertCircle className="h-4 w-4" />  
                      <AlertDescription>{formErrors.recaptcha}</AlertDescription>  
                    </Alert>  
                  )}  
                </div>  
              )}  

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
                    <button  
                      type="button"  
                      className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline inline-flex items-center"  
                      onClick={(e) => {  
                        e.preventDefault();  
                        window.open('/terms', '_blank');  
                        if (window.gtag) {  
                          window.gtag('event', 'view_terms', {  
                            location: 'registration_form'  
                          });  
                        }  
                      }}  
                    >  
                      Terms of Service  
                      <ExternalLink className="h-3 w-3 ml-1" />  
                    </button>  
                    {' '}and{' '}  
                    <button  
                      type="button"  
                      className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline inline-flex items-center"  
                      onClick={(e) => {  
                        e.preventDefault();  
                        window.open('/privacy', '_blank');  
                        if (window.gtag) {  
                          window.gtag('event', 'view_privacy', {  
                            location: 'registration_form'  
                          });  
                        }  
                      }}  
                    >  
                      Privacy Policy  
                      <ExternalLink className="h-3 w-3 ml-1" />  
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
                className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"  
                disabled={loading || (recaptchaKey && !recaptchaToken)}  
                aria-label="Create your account"  
              >  
                {loading ? (  
                  <>  
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />  
                    Creating Account...  
                  </>  
                ) : (  
                  <>  
                    <CheckCircle2 className="mr-2 h-4 w-4" />  
                    Create Account  
                  </>  
                )}  
              </Button>  

              {/* Sign In Link */}  
              <p className="text-center text-sm text-gray-600 pt-2">  
                Already have an account?{' '}  
                <Link   
                  to="/login"   
                  className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"  
                  aria-label="Sign in to your existing account"  
                  onClick={() => {  
                    if (window.gtag) {  
                      window.gtag('event', 'click_login_from_register', {  
                        location: 'registration_page'  
                      });  
                    }  
                  }}  
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
