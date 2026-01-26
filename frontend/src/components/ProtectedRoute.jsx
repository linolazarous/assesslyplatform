// frontend/src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import {
  getAuthToken,
  getUser,
  clearAuthData,
  clearSessionId
} from '../utils/auth';

/*
  Auth status machine:
  - checking
  - authenticated
  - unauthenticated
*/

const ProtectedRoute = ({
  children,
  requireVerifiedEmail = false,
  requirePlan = null
}) => {
  const location = useLocation();

  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  /* -------------------------------------------------- */
  /* Listen for auth expiration from Axios interceptor  */
  /* -------------------------------------------------- */
  useEffect(() => {
    const handleAuthExpired = (event) => {
      if (event?.detail?.isAuthExpired) {
        clearAuthData();
        clearSessionId();
        setUser(null);
        setError('Session expired. Please log in again.');
        setStatus('unauthenticated');
      }
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () =>
      window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  /* -------------------------------------------------- */
  /* Auth validation on mount & route change            */
  /* -------------------------------------------------- */
  useEffect(() => {
    const checkAuth = () => {
      setStatus('checking');
      setError(null);

      const token = getAuthToken();
      const cachedUser = getUser();

      if (!token || !cachedUser) {
        setStatus('unauthenticated');
        setError('Authentication required');
        return;
      }

      // Email verification requirement
      if (requireVerifiedEmail && !cachedUser.is_verified) {
        setUser(cachedUser);
        setStatus('unauthenticated');
        setError('Email verification required');
        return;
      }

      // Plan requirement
      if (requirePlan && cachedUser.plan !== requirePlan) {
        setUser(cachedUser);
        setStatus('unauthenticated');
        setError('Plan upgrade required');
        return;
      }

      setUser(cachedUser);
      setStatus('authenticated');
    };

    checkAuth();
  }, [location.pathname, requireVerifiedEmail, requirePlan]);

  /* -------------------------------------------------- */
  /* Loading / skeleton UI                              */
  /* -------------------------------------------------- */
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        <div className="pt-16 flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">
              Checking authentication…
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------- */
  /* Plan upgrade UI                                   */
  /* -------------------------------------------------- */
  if (status === 'unauthenticated' && error === 'Plan upgrade required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <AlertCircle className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">
              Plan Upgrade Required
            </h1>
            <p className="text-gray-600">
              You need the <strong>{requirePlan}</strong> plan.
            </p>
          </div>

          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Current plan: {user?.plan || 'free'}
            </AlertDescription>
          </Alert>

          <button
            onClick={() => (window.location.href = '/pricing')}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg font-medium"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------- */
  /* Email verification UI                             */
  /* -------------------------------------------------- */
  if (
    status === 'unauthenticated' &&
    error === 'Email verification required'
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">
              Verify Your Email
            </h1>
            <p className="text-gray-600">
              Please verify <strong>{user?.email}</strong>
            </p>
          </div>

          <button
            onClick={() => {
              clearAuthData();
              clearSessionId();
              window.location.href = '/login';
            }}
            className="w-full py-3 border border-gray-300 rounded-lg font-medium"
          >
            Sign in with another account
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------- */
  /* Default unauthenticated → login                    */
  /* -------------------------------------------------- */
  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          message: error || 'Please sign in to continue'
        }}
      />
    );
  }

  /* -------------------------------------------------- */
  /* Authenticated                                     */
  /* -------------------------------------------------- */
  return children;
};

export default ProtectedRoute;
