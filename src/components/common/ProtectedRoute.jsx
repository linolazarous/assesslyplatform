import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
// Assuming these two components exist in the defined paths
import LoadingScreen from '../ui/LoadingScreen'; 
import PropTypes from 'prop-types';

export default function ProtectedRoute({ 
  roles, 
  redirectTo = '/login',
  unauthorizedRedirectTo = '/unauthorized'
}) {
  const { currentUser, loading, claims } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen fullScreen />;
  }

  if (!currentUser) {
    // Redirect to the login page if the user is not authenticated
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // --- Role Authorization Logic ---
  if (roles && roles.length > 0) {
    // Determine if the user has any of the required roles
    const isAuthorized = roles.some(requiredRole => {
      // Convert required role for safer comparison against claim keys
      const lowerRequiredRole = requiredRole.toLowerCase();

      // Check 1: Direct role claim (e.g., claims.role === 'admin')
      const userRoleMatch = claims?.role === lowerRequiredRole;
      
      // Check 2: Boolean flag claim (e.g., claims.isadmin === true)
      const isClaimRole = claims?.[`is${lowerRequiredRole}`];

      return userRoleMatch || isClaimRole;
    });

    if (!isAuthorized) {
      console.warn(`Access Denied: User role check failed. Required roles: ${roles.join(', ')}.`);
      // Redirect to the unauthorized page if authorization fails
      return (
        <Navigate 
          to={unauthorizedRedirectTo} 
          state={{ from: location }} 
          replace 
        />
      );
    }
  }
  // --- End Role Authorization Logic ---

  // Render the child route if authenticated and authorized
  return <Outlet />;
}

ProtectedRoute.propTypes = {
  // Roles is an array of strings (e.g., ['admin', 'assessor'])
  roles: PropTypes.arrayOf(PropTypes.string), 
  redirectTo: PropTypes.string,
  unauthorizedRedirectTo: PropTypes.string
};
