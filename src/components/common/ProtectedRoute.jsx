// src/components/common/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingScreen from "../ui/LoadingScreen";
import PropTypes from "prop-types";

/**
 * ✅ Production-Ready ProtectedRoute
 * - Handles auth state
 * - Role-based & permission-based access
 * - Logs access denials in development
 */
export default function ProtectedRoute({
  roles = [],
  permissions = [],
  redirectTo = "/login",
  unauthorizedRedirectTo = "/unauthorized",
}) {
  const { currentUser, isLoading, claims, hasPermission } = useAuth();
  const location = useLocation();

  // Show loader while auth state initializes
  if (isLoading) return <LoadingScreen fullScreen />;

  // Public auth routes do not require protection
  const publicRoutes = ["/login", "/auth", "/register"];
  if (publicRoutes.includes(location.pathname.toLowerCase())) return <Outlet />;

  // Redirect unauthenticated users
  if (!currentUser) {
    if (import.meta.env.DEV)
      console.warn(`[ProtectedRoute] Unauthenticated access attempt to ${location.pathname}`);
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role-based access
  if (roles.length > 0) {
    const userRole = (claims?.role || "").toLowerCase();
    const roleAllowed = roles.some((r) => r.toLowerCase() === userRole);

    if (!roleAllowed) {
      if (import.meta.env.DEV)
        console.warn(
          `[ProtectedRoute] Access denied for user ${currentUser.email} (role: ${userRole}). Required roles: ${roles.join(
            ", "
          )}`
        );
      return <Navigate to={unauthorizedRedirectTo} state={{ from: location }} replace />;
    }
  }

  // Permission-based access
  if (permissions.length > 0) {
    const permissionAllowed = permissions.every((perm) => hasPermission(perm));
    if (!permissionAllowed) {
      if (import.meta.env.DEV)
        console.warn(
          `[ProtectedRoute] Access denied for user ${currentUser.email}. Missing permissions: ${permissions.join(
            ", "
          )}`
        );
      return <Navigate to={unauthorizedRedirectTo} state={{ from: location }} replace />;
    }
  }

  // ✅ Access granted
  return <Outlet />;
}

ProtectedRoute.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string),
  permissions: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string,
  unauthorizedRedirectTo: PropTypes.string,
};
