import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingScreen from "../ui/LoadingScreen";
import PropTypes from "prop-types";

/**
 * Production-Ready ProtectedRoute
 * - Handles auth state
 * - Role-based & permission-based access
 * - Dev logging
 */
export default function ProtectedRoute({
  roles = [],
  permissions = [],
  redirectTo = "/login",
  unauthorizedRedirectTo = "/unauthorized",
}) {
  const { currentUser, isLoading, claims, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen fullScreen />;

  // Allow public auth routes
  const publicRoutes = ["/login", "/auth", "/register"];
  if (publicRoutes.includes(location.pathname.toLowerCase())) return <Outlet />;

  // Redirect unauthenticated
  if (!currentUser) return <Navigate to={redirectTo} state={{ from: location }} replace />;

  // Role-based access
  if (roles.length > 0) {
    const userRole = claims?.role?.toLowerCase() || "";
    const allowed = roles.some((r) => r.toLowerCase() === userRole);
    if (!allowed) return <Navigate to={unauthorizedRedirectTo} state={{ from: location }} replace />;
  }

  // Permission-based access
  if (permissions.length > 0) {
    const allowed = permissions.every((perm) => hasPermission(perm));
    if (!allowed) return <Navigate to={unauthorizedRedirectTo} state={{ from: location }} replace />;
  }

  return <Outlet />;
}

ProtectedRoute.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string),
  permissions: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string,
  unauthorizedRedirectTo: PropTypes.string,
};
