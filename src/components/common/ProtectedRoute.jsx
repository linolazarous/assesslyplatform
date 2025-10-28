import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../ui/LoadingScreen';
import PropTypes from 'prop-types';

export default function ProtectedRoute({ 
  roles, 
  redirectTo = '/login',
  unauthorizedRedirectTo = '/unauthorized'
}) {
  const { currentUser, isLoading, claims } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen fullScreen />;

  if (!currentUser) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (roles?.length) {
    const userRole = claims?.role?.toLowerCase() || "";
    const isAuthorized = roles.some(r => {
      const role = r.toLowerCase();
      const isClaimRole = claims?.[`is${role.charAt(0).toUpperCase() + role.slice(1)}`];
      return userRole === role || isClaimRole;
    });

    if (!isAuthorized) {
      console.warn(`[ProtectedRoute] Access denied for ${currentUser?.email}. Required roles: ${roles.join(", ")}`);
      return <Navigate to={unauthorizedRedirectTo} state={{ from: location }} replace />;
    }
  }

  return <Outlet />;
}

ProtectedRoute.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string,
  unauthorizedRedirectTo: PropTypes.string
};
