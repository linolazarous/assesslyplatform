// src/components/RoleGuard.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Tooltip,
  LinearProgress,
  Fade,
  Slide,
} from "@mui/material";
import {
  Lock,
  Security,
  AdminPanelSettings,
  SupervisedUserCircle,
  Person,
  Error,
  Warning,
  Info,
  CheckCircle,
  Block,
  ArrowBack,
  Upgrade,
  Business,
  Groups,
  VerifiedUser,
  AccountCircle,
  Shield,
  VpnKey,
  Login,
  Logout,
  Refresh,
  Settings,
  HelpOutline,
  Visibility, // Added missing import
} from "@mui/icons-material";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import LoadingScreen from "./ui/LoadingScreen";

// Role hierarchy and permissions
const ROLE_HIERARCHY = {
  super_admin: 100,
  organization_owner: 90,
  organization_admin: 80,
  organization_manager: 70,
  assessor: 60,
  candidate: 50,
  viewer: 40,
  guest: 10,
};

const ROLE_CONFIG = {
  super_admin: {
    label: "Super Admin",
    icon: <AdminPanelSettings />,
    color: "error",
    description: "Full system access across all organizations",
    permissions: ["*"],
  },
  organization_owner: {
    label: "Organization Owner",
    icon: <VerifiedUser />,
    color: "warning",
    description: "Full access to organization and all features",
    permissions: ["org:*", "assessment:*", "user:manage", "billing:manage"],
  },
  organization_admin: {
    label: "Organization Admin",
    icon: <Security />,
    color: "secondary",
    description: "Administrative access to organization",
    permissions: ["org:manage", "assessment:create", "assessment:edit", "user:view"],
  },
  organization_manager: {
    label: "Organization Manager",
    icon: <SupervisedUserCircle />,
    color: "info",
    description: "Manage assessments and view reports",
    permissions: ["assessment:create", "assessment:edit", "report:view"],
  },
  assessor: {
    label: "Assessor",
    icon: <Groups />,
    color: "primary",
    description: "Create and evaluate assessments",
    permissions: ["assessment:create", "assessment:evaluate", "response:view"],
  },
  candidate: {
    label: "Candidate",
    icon: <Person />,
    color: "success",
    description: "Take assessments and view own results",
    permissions: ["assessment:take", "result:own"],
  },
  viewer: {
    label: "Viewer",
    icon: <Visibility />, // Fixed: Changed from undefined to imported Visibility icon
    color: "default",
    description: "View-only access to assessments and reports",
    permissions: ["assessment:view", "report:view"],
  },
  guest: {
    label: "Guest",
    icon: <AccountCircle />,
    color: "default",
    description: "Limited access to public content",
    permissions: ["assessment:public"],
  },
};

export default function RoleGuard({
  children,
  requiredRole,
  requiredPermissions = [],
  organizationId = null,
  fallback = null,
  showAccessDenied = true,
  requireAuthentication = true,
  allowHigherRoles = true,
  loadingComponent = null,
  onAccessDenied = null,
  showRoleInfo = false,
}) {
  const { currentUser, claims, isAuthenticated, isLoading, currentOrganization } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState("");
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  // Determine user's role and permissions
  const userRoleInfo = useMemo(() => {
    if (!currentUser || !claims) return null;
    
    let role = "guest";
    let permissions = [];
    
    if (organizationId) {
      // Organization-specific role
      role = claims.orgs?.[organizationId]?.role || claims.orgs?.[organizationId] || "guest";
      permissions = claims.orgs?.[organizationId]?.permissions || [];
    } else if (currentOrganization?.id) {
      // Current organization role
      role = claims.orgs?.[currentOrganization.id]?.role || claims.orgs?.[currentOrganization.id] || "guest";
      permissions = claims.orgs?.[currentOrganization.id]?.permissions || [];
    } else {
      // Global role
      role = claims.role || "guest";
      permissions = claims.permissions || [];
    }
    
    return {
      role,
      permissions,
      config: ROLE_CONFIG[role] || ROLE_CONFIG.guest,
      hierarchyLevel: ROLE_HIERARCHY[role] || ROLE_HIERARCHY.guest,
    };
  }, [currentUser, claims, organizationId, currentOrganization]);

  // Determine required role info
  const requiredRoleInfo = useMemo(() => ({
    role: requiredRole,
    config: ROLE_CONFIG[requiredRole] || ROLE_CONFIG.guest,
    hierarchyLevel: ROLE_HIERARCHY[requiredRole] || ROLE_HIERARCHY.guest,
  }), [requiredRole]);

  // Check if user has access
  const hasAccess = useMemo(() => {
    if (!requireAuthentication) return true;
    if (!isAuthenticated || !userRoleInfo) return false;
    
    // Check role hierarchy if higher roles are allowed
    if (allowHigherRoles) {
      if (userRoleInfo.hierarchyLevel >= requiredRoleInfo.hierarchyLevel) {
        // Check specific permissions if required
        if (requiredPermissions.length > 0) {
          return requiredPermissions.every(permission => 
            userRoleInfo.permissions.includes(permission) || 
            userRoleInfo.permissions.includes("*") ||
            userRoleInfo.permissions.includes(`${permission.split(":")[0]}:*`)
          );
        }
        return true;
      }
    } else {
      // Exact role match required
      if (userRoleInfo.role === requiredRole) {
        // Check specific permissions if required
        if (requiredPermissions.length > 0) {
          return requiredPermissions.every(permission => 
            userRoleInfo.permissions.includes(permission)
          );
        }
        return true;
      }
    }
    
    return false;
  }, [
    requireAuthentication,
    isAuthenticated,
    userRoleInfo,
    requiredRoleInfo,
    requiredPermissions,
    allowHigherRoles,
  ]);

  // Check permissions on mount and when dependencies change
  useEffect(() => {
    if (isLoading || !requireAuthentication) return;
    
    setCheckingPermissions(true);
    
    // Simulate permission check delay
    const timer = setTimeout(() => {
      if (!hasAccess && showAccessDenied) {
        setAccessDeniedReason(
          `Required: ${requiredRoleInfo.config.label} (${requiredPermissions.length > 0 ? `with permissions: ${requiredPermissions.join(", ")}` : ""})`
        );
        setShowAccessDialog(true);
        
        if (onAccessDenied) {
          onAccessDenied({
            userRole: userRoleInfo?.role,
            requiredRole,
            requiredPermissions,
            location: location.pathname,
          });
        }
      }
      setCheckingPermissions(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [
    isLoading,
    hasAccess,
    showAccessDenied,
    requiredRole,
    requiredPermissions,
    requiredRoleInfo,
    userRoleInfo,
    location.pathname,
    onAccessDenied,
    requireAuthentication,
  ]);

  // Show loading state
  if (isLoading || checkingPermissions) {
    return loadingComponent || <LoadingScreen message="Checking permissions..." type="security" />;
  }

  // If authentication is not required, render children
  if (!requireAuthentication) {
    return <>{children}</>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        replace 
        state={{ from: location, message: "Please log in to access this page" }}
      />
    );
  }

  // Show fallback or access denied if no access
  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    
    if (!showAccessDenied) {
      return <Navigate to="/" replace />;
    }
    
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
        <Slide direction="up" in={true} mountOnEnter unmountOnExit>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, borderLeft: 6, borderColor: "error.main" }}>
            <Stack spacing={3}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "error.main", width: 56, height: 56 }}>
                  <Lock fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="error">
                    Access Denied
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You don't have permission to access this page
                  </Typography>
                </Box>
              </Box>
              
              <Divider />
              
              <Stack spacing={2}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle1">Your Role</Typography>
                  {userRoleInfo && (
                    <Chip
                      icon={userRoleInfo.config.icon}
                      label={userRoleInfo.config.label}
                      color={userRoleInfo.config.color}
                      variant="outlined"
                    />
                  )}
                </Box>
                
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle1">Required Role</Typography>
                  <Chip
                    icon={requiredRoleInfo.config.icon}
                    label={requiredRoleInfo.config.label}
                    color={requiredRoleInfo.config.color}
                    variant="filled"
                  />
                </Box>
                
                {requiredPermissions.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Required Permissions
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {requiredPermissions.map((permission, index) => (
                        <Chip
                          key={index}
                          label={permission}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
                
                {userRoleInfo && userRoleInfo.permissions.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Your Permissions
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {userRoleInfo.permissions.map((permission, index) => (
                        <Chip
                          key={index}
                          label={permission}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
              
              <Divider />
              
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate(-1)}
                >
                  Go Back
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Business />}
                  onClick={() => navigate("/dashboard")}
                >
                  Go to Dashboard
                </Button>
                {userRoleInfo?.hierarchyLevel < requiredRoleInfo.hierarchyLevel && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Upgrade />}
                    onClick={() => navigate("/profile/upgrade")}
                  >
                    Request Access
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        </Slide>
      </Box>
    );
  }

  // Render children with role info if requested
  return (
    <>
      {showRoleInfo && userRoleInfo && (
        <Fade in={true}>
          <Paper
            elevation={0}
            sx={{
              p: 1,
              mb: 2,
              bgcolor: "primary.50",
              borderLeft: 4,
              borderColor: "primary.main",
              borderRadius: 1,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: "primary.main", width: 32, height: 32 }}>
                {userRoleInfo.config.icon}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Access level
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {userRoleInfo.config.label}
                </Typography>
              </Box>
              <Tooltip title={userRoleInfo.config.description}>
                <HelpOutline fontSize="small" color="action" />
              </Tooltip>
            </Stack>
          </Paper>
        </Fade>
      )}
      
      {children}
      
      {/* Access Dialog (for programmatic access checks) */}
      <Dialog
        open={showAccessDialog}
        onClose={() => setShowAccessDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Lock color="error" />
            <Typography>Access Restricted</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning">
              <Typography variant="body2">
                You need elevated permissions to access this feature.
              </Typography>
            </Alert>
            
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2">Current Role:</Typography>
              <Chip
                icon={userRoleInfo?.config.icon}
                label={userRoleInfo?.config.label}
                size="small"
                color={userRoleInfo?.config.color}
              />
            </Box>
            
            <Box sx={{ display: "flex", justifyContent="space-between", alignItems: "center" }}>
              <Typography variant="body2">Required Role:</Typography>
              <Chip
                icon={requiredRoleInfo.config.icon}
                label={requiredRoleInfo.config.label}
                size="small"
                color={requiredRoleInfo.config.color}
                variant="filled"
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              {accessDeniedReason}
            </Typography>
            
            {userRoleInfo && requiredPermissions.length > 0 && (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Missing Permissions:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {requiredPermissions
                    .filter(p => !userRoleInfo.permissions.includes(p))
                    .map((permission, index) => (
                      <Chip
                        key={index}
                        label={permission}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccessDialog(false)}>Dismiss</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowAccessDialog(false);
              navigate("/dashboard");
            }}
          >
            Go to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

RoleGuard.propTypes = {
  children: PropTypes.node.isRequired,
  requiredRole: PropTypes.string.isRequired,
  requiredPermissions: PropTypes.arrayOf(PropTypes.string),
  organizationId: PropTypes.string,
  fallback: PropTypes.node,
  showAccessDenied: PropTypes.bool,
  requireAuthentication: PropTypes.bool,
  allowHigherRoles: PropTypes.bool,
  loadingComponent: PropTypes.node,
  onAccessDenied: PropTypes.func,
  showRoleInfo: PropTypes.bool,
};

RoleGuard.defaultProps = {
  requiredPermissions: [],
  organizationId: null,
  fallback: null,
  showAccessDenied: true,
  requireAuthentication: true,
  allowHigherRoles: true,
  loadingComponent: null,
  onAccessDenied: null,
  showRoleInfo: false,
};

// Higher-order component for role-based access
export function withRoleGuard(WrappedComponent, roleGuardProps) {
  return function WithRoleGuardComponent(props) {
    return (
      <RoleGuard {...roleGuardProps}>
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };
}

// Quick role check components
export function RequireRole({ role, children, ...props }) {
  return (
    <RoleGuard requiredRole={role} {...props}>
      {children}
    </RoleGuard>
  );
}

export function RequireSuperAdmin({ children, ...props }) {
  return (
    <RoleGuard requiredRole="super_admin" {...props}>
      {children}
    </RoleGuard>
  );
}

export function RequireOrganizationAdmin({ children, ...props }) {
  return (
    <RoleGuard requiredRole="organization_admin" {...props}>
      {children}
    </RoleGuard>
  );
}

export function RequireAssessor({ children, ...props }) {
  return (
    <RoleGuard requiredRole="assessor" {...props}>
      {children}
    </RoleGuard>
  );
}

export function RequireCandidate({ children, ...props }) {
  return (
    <RoleGuard requiredRole="candidate" {...props}>
      {children}
    </RoleGuard>
  );
}

// Permission-based components
export function RequirePermission({ permission, children, ...props }) {
  return (
    <RoleGuard 
      requiredRole="guest" 
      requiredPermissions={[permission]} 
      allowHigherRoles={true}
      {...props}
    >
      {children}
    </RoleGuard>
  );
}

export function RequirePermissions({ permissions, children, ...props }) {
  return (
    <RoleGuard 
      requiredRole="guest" 
      requiredPermissions={permissions} 
      allowHigherRoles={true}
      {...props}
    >
      {children}
    </RoleGuard>
  );
}
