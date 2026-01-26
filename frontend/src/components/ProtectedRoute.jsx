// frontend/src/components/ProtectedRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';

// Constants
const LOCAL_STORAGE_KEYS = {
  TOKEN: 'assessly_token',
  USER: 'assessly_user'
};

const ProtectedRoute = ({ children, requireVerifiedEmail = false, requirePlan = null }) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // Listen for global Axios errors (e.g., token expired)
  useEffect(() => {
    const handleAxiosError = (event) => {
      const error = event.detail;
      if (error?.isAuthExpired) {
        console.warn('Session expired, logging out...');
        localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
        setIsAuthenticated(false);
        setError('Session expired. Please log in again.');
      }
    };

    window.addEventListener('axios-error', handleAxiosError);
    return () => window.removeEventListener('axios-error', handleAxiosError);
  }, []);

  // Main authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsChecking(true);
        setError(null);

        const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
        const userData = localStorage.getItem(LOCAL_STORAGE_KEYS.USER);

        if (!token || !userData) {
          setIsAuthenticated(false);
          setError('Authentication required');
          return;
        }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Optional: Backend token validation
        await api.get('/api/auth/verify');

        // Check email verification requirement
        if (requireVerifiedEmail && !parsedUser.is_verified) {
          setIsAuthenticated(false);
          setError('Email verification required');
          return;
        }

        // Check plan requirement
        if (requirePlan && parsedUser.plan !== requirePlan) {
          setIsAuthenticated(false);
          setError(`Plan upgrade required. You need the ${requirePlan} plan to access this feature.`);
          return;
        }

        setIsAuthenticated(true);
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
        setError(err.message || 'Authentication failed');

        localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [location, requireVerifiedEmail, requirePlan]);

  // Loading state
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Skeleton */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Skeleton className="h-10 w-32" />
              <div className="hidden md:flex items-center space-x-8">
                {Array(4).fill(0).map((_, idx) => (
                  <Skeleton key={idx} className="h-4 w-16" />
                ))}
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Loading */}
        <div className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Verifying authentication...
                </h3>
                <p className="text-gray-600">Please wait while we check your credentials.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle unauthenticated or error state
  if (!isAuthenticated) {
    // Plan upgrade required
    if (error?.includes('Plan upgrade required')) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full mb-6">
                <AlertCircle className="h-12 w-12 text-purple-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Plan Upgrade Required
              </h1>
              <p className="text-gray-600">
                You need to upgrade your plan to access this feature.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-2">Current Plan: {user?.plan || 'free'}</h3>
                  <p className="text-blue-700 text-sm">
                    Upgrade to {requirePlan} to unlock this feature.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <button
                    onClick={() => window.location.href = '/pricing'}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    View Plans & Pricing
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Email verification required
    if (error === 'Email verification required') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-full mb-6">
                <AlertCircle className="h-12 w-12 text-yellow-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Email Verification Required
              </h1>
              <p className="text-gray-600">
                Please verify your email address to access this page.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please check your email ({user?.email}) for a verification link.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <h3 className="font-semibold text-yellow-800 mb-2">What to do next:</h3>
                  <ul className="space-y-2 text-yellow-700 text-sm">
                    <li className="flex items-start">
                      <div className="h-2 w-2 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                      Check your email inbox for a verification link
                    </li>
                    <li className="flex items-start">
                      <div className="h-2 w-2 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                      Click the verification link in the email
                    </li>
                    <li className="flex items-start">
                      <div className="h-2 w-2 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                      Return to this page after verification
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <button
                    onClick={() => {
                      console.log('Resend verification email to:', user?.email);
                      alert(`Verification email resent to ${user?.email}`);
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Resend Verification Email
                  </button>
                  <button
                    onClick={() => window.location.href = '/support'}
                    className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
                      localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
                      window.location.href = '/login';
                    }}
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Sign in with a different account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // General authentication fallback
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          message: error || 'Please sign in to access this page'
        }}
      />
    );
  }

  // User is authenticated and meets all requirements
  return children;
};

// Higher-order component version
export const withAuth = (Component, options = {}) => {
  return function WithAuthWrapper(props) {
    return (
      <ProtectedRoute
        requireVerifiedEmail={options.requireVerifiedEmail}
        requirePlan={options.requirePlan}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

// Hook for programmatic auth check
export const useAuth = () => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    isLoading: true
  });

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
      const userData = localStorage.getItem(LOCAL_STORAGE_KEYS.USER);

      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          setAuthState({
            isAuthenticated: true,
            user,
            isLoading: false
          });
        } catch {
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false
          });
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false
        });
      }
    };

    checkAuth();

    const handleStorageChange = () => checkAuth();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.USER);
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false
    });
    window.location.href = '/login';
  };

  const login = (token, user) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER, JSON.stringify(user));
    setAuthState({
      isAuthenticated: true,
      user,
      isLoading: false
    });
  };

  return {
    ...authState,
    logout,
    login
  };
};

export default ProtectedRoute;
