import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx'; // Assume context file extension is also .jsx
import PropTypes from 'prop-types';

/**
 * RoleGuard component checks if the current user meets the required role for a route.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - The components to render if the role is authorized.
 * @param {string} props.requiredRole - The role string required (e.g., 'admin', 'assessor').
 * @param {string} [props.organizationId] - Optional organization ID for organization-scoped role check.
 */
export default function RoleGuard({ children, requiredRole, organizationId }) {
  const { currentUser, claims } = useAuth();
  
  // 1. Check if user is logged in
  if (!currentUser) {
    // Redirect to login page
    return <Navigate to="/login" replace />;
  }

  // 2. Determine the role key for claims lookup
  // FIX: Template literal interpolation
  const roleKey = organizationId ? `org_${organizationId}_role` : 'globalRole'; 
  
  // A simplified lookup, assuming claims holds the direct role or a complex structure
  // For a generic role guard, checking the main role is often sufficient, 
  // but if the backend uses specific org claims, we use the original logic.
  const userRole = organizationId 
    ? claims?.orgs?.[organizationId] 
    : claims?.role; 

  // 3. Check if the user's role matches the required role
  if (userRole !== requiredRole) {
    // FIX: Template literal interpolation
    console.warn(`Access Denied: User role '${userRole}' does not match required role '${requiredRole}' for key '${roleKey}'`);
    // Redirect to a dashboard or unauthorized page
    return <Navigate to="/" replace />;
  }

  // 4. Access Granted
  return children;
}

RoleGuard.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.string.isRequired,
  organizationId: PropTypes.string
};
