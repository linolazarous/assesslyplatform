import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingScreen from "../ui/LoadingScreen";
import PropTypes from "prop-types";

/**
 * ✅ Production-Ready ProtectedRoute
 * Handles route protection, role-based access, and redirects.
 */
export default function ProtectedRoute({
  roles = [],
  redirectTo = "/login",
  unauthorizedRedirectTo = "/unauthorized",
}) {
  const { currentUser, isLoading, claims } = useAuth();
  const location = useLocation();

  // 🌀 Show loading screen during auth verification
  if (isLoading) return <LoadingScreen fullScreen />;

  // 🔓 Allow public access to login & auth routes
  if (
    ["/login", "/auth", "/register"].includes(location.pathname.toLowerCase())
  ) {
    return <Outlet />;
  }

  // 🚫 Redirect unauthenticated users
  if (!currentUser) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // 🔐 Role-Based Access Control (if roles specified)
  if (roles.length > 0) {
    const userRole = claims?.role?.toLowerCase() || "";
    const hasMatchingRole = roles.some((requiredRole) => {
      const normalized = requiredRole.toLowerCase();
      const claimFlag =
        claims?.[`is${normalized.charAt(0).toUpperCase() + normalized.slice(1)}`];
      return userRole === normalized || claimFlag === true;
    });

    if (!hasMatchingRole) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[ProtectedRoute] Access denied for user ${currentUser?.email || "unknown"}. Required roles: ${roles.join(", ")}`
        );
      }
      return (
        <Navigate
          to={unauthorizedRedirectTo}
          state={{ from: location }}
          replace
        />
      );
    }
  }

  // ✅ Authorized access granted
  return <Outlet />;
}

ProtectedRoute.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string,
  unauthorizedRedirectTo: PropTypes.string,
};
