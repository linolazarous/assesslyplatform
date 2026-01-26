// frontend/src/components/ProtectedRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { getAuthToken, getUser, clearAuthData, clearSessionId } from '../utils/auth';

// Local storage keys
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

  // Listen for Axios auth expiration events
  useEffect(() => {
    const handleAxiosAuthExpired = (event) => {
      if (event?.detail?.isAuthExpired) {
        clearAuthData();
        clearSessionId();
        setIsAuthenticated(false);
        setError('Session expired. Please log in again.');
      }
    };

    window.addEventListener('axios-error', handleAxiosAuthExpired);
    return () => window.removeEventListener('axios-error', handleAxiosAuthExpired);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);
      setError(null);

      try {
        const token = getAuthToken();
        const cachedUser = getUser();

        if (!token || !cachedUser) {
          setIsAuthenticated(false);
          setError('Authentication required');
          return;
        }

        setUser(cachedUser);

        // Optional: plan & email verification checks
        if (requireVerifiedEmail && !cachedUser.is_verified) {
          setIsAuthenticated(false);
          setError('Email verification required');
          return;
        }

        if (requirePlan && cachedUser.plan !== requirePlan) {
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

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Skeleton className="h-10 w-32" />
              <div className="hidden md:flex items-center space-x-8">
                {Array(4).fill(0).map((_, idx) => <Skeleton key={idx} className="h-4 w-16" />)}
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </div>
        <div className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Verifying authentication...</h3>
                <p className="text-gray-600">Please wait while we check your credentials.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle authentication errors
  if (!isAuthenticated) {
    if (error?.includes('Plan upgrade required')) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full mb-6">
                <AlertCircle className="h-12 w-12 text-purple-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Plan Upgrade Required</h1>
              <p className="text-gray-600">You need to upgrade your plan to access this feature.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-2">Current Plan: {user?.plan || 'free'}</h3>
                  <p className="text-blue-700 text-sm">Upgrade to {requirePlan} to unlock this feature.</p>
                </div>
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <button onClick={() => window.location.href = '/pricing'} className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:opacity-90 font-medium">View Plans & Pricing</button>
                  <button onClick={() => window.history.back()} className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Go Back</button>
                  <button onClick={() => window.location.href = '/dashboard'} className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Return to Dashboard</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (error === 'Email verification required') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-full mb-6">
                <AlertCircle className="h-12 w-12 text-yellow-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Email Verification Required</h1>
              <p className="text-gray-600">Please verify your email address to access this page.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Please check your email ({user?.email}) for a verification link.</AlertDescription>
              </Alert>
              <div className="space-y-4">
                <button onClick={() => { alert(`Verification email resent to ${user?.email}`); }} className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg font-medium">Resend Verification Email</button>
                <button onClick={() => window.location.href = '/support'} className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Contact Support</button>
                <button onClick={() => { clearAuthData(); clearSessionId(); window.location.href = '/login'; }} className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Sign in with a different account</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return <Navigate to="/login" replace state={{ from: location, message: error || 'Please sign in to access this page' }} />;
  }

  return children;
};

export default ProtectedRoute;
