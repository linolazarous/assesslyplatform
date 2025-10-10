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
      // Assuming 'claims' contains a 'role' key or a 'roles' array
      // Common pattern: check claims.role === requiredRole, or claims.roles.includes(requiredRole)
      const userRole = claims?.role; // Adjust based on actual claims structure
      
      // Fallback check assuming a claim structure like 'isadmin: true'
      const isClaimRole = claims?.[`is${requiredRole.toLowerCase()}`];

      return userRole === requiredRole || isClaimRole;
    });

    if (!isAuthorized) {
      console.warn(`Access Denied: User attempted to access protected route. Required roles: ${roles.join(', ')}`);
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

  return <Outlet />;
}

ProtectedRoute.propTypes = {
  // Roles is an array of strings (e.g., ['admin', 'assessor'])
  roles: PropTypes.arrayOf(PropTypes.string), 
  redirectTo: PropTypes.string,
  unauthorizedRedirectTo: PropTypes.string
};
