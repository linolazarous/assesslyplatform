import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import PropTypes from 'prop-types';

export default function RoleGuard({ children, requiredRole, organizationId }) {
  const { currentUser, claims } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const roleKey = organizationId ? `org_${organizationId}_role` : 'globalRole'; 
  const userRole = organizationId 
    ? claims?.orgs?.[organizationId] 
    : claims?.role; 

  if (userRole !== requiredRole) {
    console.warn(`Access Denied: User role '${userRole}' does not match required role '${requiredRole}' for key '${roleKey}'`);
    return <Navigate to="/" replace />;
  }

  return children;
}

RoleGuard.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.string.isRequired,
  organizationId: PropTypes.string
};

RoleGuard.defaultProps = {
  organizationId: undefined
};
