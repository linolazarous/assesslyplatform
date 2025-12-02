// src/components/common/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingScreen from "../ui/LoadingScreen";
import PropTypes from "prop-types";
import { 
  verifyOrganizationAccess, 
  getCurrentOrganization,
  checkSubscriptionStatus 
} from "../../api/organizationApi";
import { useSnackbar } from "notistack";
import { Box, Alert, Button } from "@mui/material";

/**
 * Enhanced ProtectedRoute for Multitenant Assessment Platform
 * - Organization-based access control
 * - Super admin (developer) vs organization admin roles
 * - Subscription status validation
 * - Route-level organization isolation
 */
export default function ProtectedRoute({
  roles = [],
  permissions = [],
  requireOrganization = false,
  organizationRole = null,
  requireSubscription = false,
  subscriptionLevels = ['active', 'trial'],
  redirectTo = "/login",
  unauthorizedRedirectTo = "/unauthorized",
  organizationRedirectTo = "/select-organization",
  subscriptionRedirectTo = "/pricing",
}) {
  const { 
    user, 
    isLoading, 
    logout, 
    isSuperAdmin, 
    isOrgAdmin,
    hasPermission,
    currentOrganization,
    setCurrentOrganization 
  } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const params = useParams();
  
  const [verifying, setVerifying] = useState(true);
  const [organizationAccess, setOrganizationAccess] = useState(null);
  const [subscriptionValid, setSubscriptionValid] = useState(null);
  const [orgLoading, setOrgLoading] = useState(false);

  // Extract organization ID from URL params or context
  const orgIdFromUrl = params.orgId || params.organizationId;
  const orgId = orgIdFromUrl || currentOrganization?.id;

  useEffect(() => {
    if (user && !isLoading) {
      verifyAccess();
    } else if (!isLoading) {
      setVerifying(false);
    }
  }, [user, isLoading, orgId, location.pathname]);

  const verifyAccess = async () => {
    try {
      setOrgLoading(true);
      
      // Check organization access if required
      if (requireOrganization && orgId) {
        const accessData = await verifyOrganizationAccess(orgId);
        setOrganizationAccess(accessData);
        
        if (accessData.hasAccess) {
          // Update current organization in context
          if (!currentOrganization || currentOrganization.id !== orgId) {
            const orgData = await getCurrentOrganization(orgId);
            setCurrentOrganization(orgData);
          }
          
          // Check subscription if required
          if (requireSubscription) {
            const subscription = await checkSubscriptionStatus(orgId);
            const isValid = subscriptionLevels.includes(subscription.status);
            setSubscriptionValid(isValid);
            
            if (!isValid && import.meta.env.DEV) {
              console.warn(`[ProtectedRoute] Invalid subscription for org ${orgId}: ${subscription.status}`);
            }
          }
        }
      }
      
      setVerifying(false);
    } catch (error) {
      console.error('[ProtectedRoute] Verification failed:', error);
      setOrganizationAccess({ hasAccess: false, reason: 'verification_failed' });
      setVerifying(false);
    } finally {
      setOrgLoading(false);
    }
  };

  // Show loader while auth state initializes
  if (isLoading || verifying || orgLoading) {
    return <LoadingScreen fullScreen />;
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth",
    "/",
    "/pricing",
    "/features",
    "/contact",
    "/privacy",
    "/terms",
    "/about"
  ];
  
  const isPublicRoute = publicRoutes.some(route => 
    location.pathname.toLowerCase() === route ||
    location.pathname.toLowerCase().startsWith(`${route}/`)
  );
  
  if (isPublicRoute) return <Outlet />;

  // Redirect unauthenticated users
  if (!user) {
    if (import.meta.env.DEV) {
      console.warn(`[ProtectedRoute] Unauthenticated access attempt to ${location.pathname}`);
    }
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Handle organization-specific routes
  if (requireOrganization) {
    // If no organization ID is provided in context or URL
    if (!orgId) {
      if (import.meta.env.DEV) {
        console.warn(`[ProtectedRoute] Organization required but not specified for route: ${location.pathname}`);
      }
      return <Navigate to={organizationRedirectTo} state={{ from: location }} replace />;
    }

    // Check organization access
    if (organizationAccess && !organizationAccess.hasAccess) {
      if (import.meta.env.DEV) {
        console.warn(`[ProtectedRoute] Organization access denied for user ${user.email} to org ${orgId}: ${organizationAccess.reason}`);
      }
      
      // Show access denied with options
      return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={() => navigate("/organizations")}>
                View Organizations
              </Button>
            }
          >
            You don't have access to this organization or it doesn't exist.
          </Alert>
        </Box>
      );
    }

    // Check organization role if specified
    if (organizationRole && organizationAccess) {
      const userOrgRole = organizationAccess.role;
      if (userOrgRole !== organizationRole && !isSuperAdmin) {
        if (import.meta.env.DEV) {
          console.warn(`[ProtectedRoute] Organization role mismatch. Required: ${organizationRole}, User has: ${userOrgRole}`);
        }
        return <Navigate to={unauthorizedRedirectTo} state={{ from: location }} replace />;
      }
    }

    // Check subscription if required
    if (requireSubscription && subscriptionValid === false) {
      if (import.meta.env.DEV) {
        console.warn(`[ProtectedRoute] Subscription required but invalid for org ${orgId}`);
      }
      
      // For subscription issues, show a helpful message
      if (isSuperAdmin) {
        // Super admin can fix subscription issues
        enqueueSnackbar("Organization subscription needs attention", { variant: "warning" });
      } else {
        // Regular users get redirected to pricing
        return <Navigate to={subscriptionRedirectTo} state={{ from: location, organizationId: orgId }} replace />;
      }
    }
  }

  // Super admin bypass for most checks (except organization existence)
  if (isSuperAdmin && !requireOrganization) {
    // Super admin can access most routes without further checks
    return <Outlet />;
  }

  // Role-based access (excluding super admin handled above)
  if (roles.length > 0) {
    const userRole = user.role?.toLowerCase();
    const roleAllowed = roles.some((r) => r.toLowerCase() === userRole) || isSuperAdmin;
    
    if (!roleAllowed) {
      if (import.meta.env.DEV) {
        console.warn(
          `[ProtectedRoute] Role access denied for user ${user.email} (role: ${userRole}). ` +
          `Required roles: ${roles.join(", ")}. Super admin: ${isSuperAdmin}`
        );
      }
      return <Navigate to={unauthorizedRedirectTo} state={{ from: location }} replace />;
    }
  }

  // Permission-based access
  if (permissions.length > 0) {
    const permissionAllowed = permissions.every((perm) => hasPermission(perm)) || isSuperAdmin;
    if (!permissionAllowed) {
      if (import.meta.env.DEV) {
        console.warn(
          `[ProtectedRoute] Permission access denied for user ${user.email}. ` +
          `Missing permissions: ${permissions.join(", ")}. Super admin: ${isSuperAdmin}`
        );
      }
      return <Navigate to={unauthorizedRedirectTo} state={{ from: location }} replace />;
    }
  }

  // ✅ Access granted
  return <Outlet />;
}

ProtectedRoute.propTypes = {
  /** Required user roles (e.g., ['admin', 'org_admin', 'assessor']) */
  roles: PropTypes.arrayOf(PropTypes.string),
  
  /** Required permissions (e.g., ['create_assessment', 'view_reports']) */
  permissions: PropTypes.arrayOf(PropTypes.string),
  
  /** Whether this route requires organization context */
  requireOrganization: PropTypes.bool,
  
  /** Required role within the organization (e.g., 'owner', 'admin', 'member') */
  organizationRole: PropTypes.string,
  
  /** Whether a valid subscription is required */
  requireSubscription: PropTypes.bool,
  
  /** Valid subscription statuses (default: ['active', 'trial']) */
  subscriptionLevels: PropTypes.arrayOf(PropTypes.string),
  
  /** Redirect path for unauthenticated users */
  redirectTo: PropTypes.string,
  
  /** Redirect path for unauthorized access */
  unauthorizedRedirectTo: PropTypes.string,
  
  /** Redirect path when organization selection is needed */
  organizationRedirectTo: PropTypes.string,
  
  /** Redirect path when subscription is required */
  subscriptionRedirectTo: PropTypes.string,
};

ProtectedRoute.defaultProps = {
  roles: [],
  permissions: [],
  requireOrganization: false,
  requireSubscription: false,
  subscriptionLevels: ['active', 'trial'],
  redirectTo: "/login",
  unauthorizedRedirectTo: "/unauthorized",
  organizationRedirectTo: "/select-organization",
  subscriptionRedirectTo: "/pricing",
};
