import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PropTypes from 'prop-types';

export default function RoleGuard({ children, requiredRole, organizationId }) {
  // Assuming useAuth returns { currentUser, claims } where claims is an object
  const { currentUser, claims } = useAuth(); 
  
  if (!currentUser) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />; // Use replace for better history management
  }

  // Determine the key to check for the user's role
  // It checks for an organization-specific role first (e.g., 'org_123_role') 
  // and falls back to a 'globalRole' if organizationId is not provided.
  const roleKey = organizationId ? `org_${organizationId}_role` : 'globalRole';
  const userRole = claims?.[roleKey];

  if (userRole !== requiredRole) {
    // Redirect to an unauthorized page if role doesn't match
    console.warn(`Access Denied: User role '${userRole}' does not match required role '${requiredRole}' for key '${roleKey}'`);
    return <Navigate to="/unauthorized" replace />;
  }

  // Render children if the role matches
  return children;
}

RoleGuard.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.string.isRequired,
  // organizationId can be a string representing the ID, or null/undefined
  organizationId: PropTypes.string 
};
