import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
// ✅ Import path is correct: Up one level from common/ to components/, then down into contexts/
import { useAuth } from '../../contexts/AuthContext';
// Assuming this component exists in the defined path
import LoadingScreen from '../ui/LoadingScreen'; 
import PropTypes from 'prop-types';

export default function ProtectedRoute({ 
  roles, 
  redirectTo = '/login',
  unauthorizedRedirectTo = '/unauthorized'
}) {
  // Use isLoading, currentUser, and claims from the context
  const { currentUser, isLoading, claims } = useAuth(); 
  const location = useLocation();

  if (isLoading) {
    // Show a loading screen while authentication status is being determined
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
      // Ensure role comparison is case-insensitive (best practice)
      const lowerRequiredRole = requiredRole.toLowerCase();

      // Check 1: Direct role claim from the JWT (claims.role)
      const userRoleMatch = claims?.role === lowerRequiredRole;
      
      // Check 2: Boolean flag claim (e.g., claims.isAdmin)
      // This logic checks for property names like isAdmin, isAssessor, etc.
      // This assumes the claims object provides these derived boolean flags.
      const isClaimRole = claims?.[`is${lowerRequiredRole.charAt(0).toUpperCase() + lowerRequiredRole.slice(1)}`];

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
