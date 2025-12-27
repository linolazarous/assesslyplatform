// src/components/common/Navbar.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Container,
  Divider,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Button,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Business as BusinessIcon,
  Payment as PaymentIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
// FIX: Import directly instead of from barrel file
import Logo from "../brand/Logo";
import Wordmark from "../brand/Wordmark";
import { fetchUserProfile, fetchOrganizations, switchOrganization } from "../../api/userApi";
import { fetchNotifications } from "../../api/notificationApi";
import { useAuth } from "../../contexts/AuthContext";
import { useSnackbar } from "notistack";

/**
 * Navbar Component for Multitenant Assessment Platform
 * - Role-based navigation (Super Admin, Organization Admin, User)
 * - Organization switching for multitenancy
 * - Notification system
 * - User profile and logout
 */
function Navbar({ links = [], showUserMenu = true }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { user, logout, isAuthenticated } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [orgAnchorEl, setOrgAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load user profile and organizations on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
      loadNotifications();
    }
  }, [isAuthenticated, user]);

  const loadUserData = async () => {
    try {
      const [profileData, orgsData] = await Promise.all([
        fetchUserProfile(),
        fetchOrganizations(),
      ]);
      
      setUserProfile(profileData.data || profileData);
      setOrganizations(orgsData.data || orgsData);
      
      // Set current organization from localStorage or first org
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const current = orgsData.data?.find(org => org.id === savedOrgId) || orgsData.data?.[0];
      if (current) {
        setCurrentOrg(current);
        localStorage.setItem('currentOrganizationId', current.id);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data.data || data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOrgMenuOpen = (event) => {
    setOrgAnchorEl(event.currentTarget);
  };

  const handleOrgMenuClose = () => {
    setOrgAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleNavigate = (href) => {
    if (href.startsWith("http") || href.startsWith("#")) {
      if (href.startsWith("http")) {
        window.open(href, "_blank");
      } else if (href.startsWith("#")) {
        const sectionId = href.substring(1);
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else {
      navigate(href);
    }
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      enqueueSnackbar("Logged out successfully", { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Failed to logout", { variant: "error" });
    }
    handleUserMenuClose();
  };

  const handleSwitchOrganization = async (orgId) => {
    try {
      setLoading(true);
      await switchOrganization(orgId);
      const org = organizations.find(o => o.id === orgId);
      setCurrentOrg(org);
      localStorage.setItem('currentOrganizationId', orgId);
      enqueueSnackbar(`Switched to ${org?.name || 'organization'}`, { variant: "success" });
      
      // Refresh page or navigate to dashboard
      window.location.reload();
    } catch (error) {
      enqueueSnackbar("Failed to switch organization", { variant: "error" });
    } finally {
      setLoading(false);
      handleOrgMenuClose();
    }
  };

  const handleCreateOrganization = () => {
    navigate("/admin/organizations/create");
    handleOrgMenuClose();
  };

  const getNavLinks = () => {
    const baseLinks = links.length > 0 ? links : [
      { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
      { label: "Assessments", href: "/assessments", icon: <AssessmentIcon /> },
    ];

    if (!user) return baseLinks;

    // Add admin links for super admin
    if (user.role === 'super_admin' || user.role === 'system_admin') {
      baseLinks.push(
        { label: "Organizations", href: "/admin/organizations", icon: <BusinessIcon /> },
        { label: "Billing", href: "/admin/billing", icon: <PaymentIcon /> },
        { label: "System Settings", href: "/admin/settings", icon: <SettingsIcon /> }
      );
    }

    // Add admin links for organization admin
    if (user.role === 'org_admin' || user.role === 'admin') {
      baseLinks.push(
        { label: "Team", href: "/admin/team", icon: <PeopleIcon /> },
        { label: "Settings", href: "/organization/settings", icon: <SettingsIcon /> }
      );
    }

    return baseLinks;
  };

  const getUnreadNotificationCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'system_admin';
  const navLinks = getNavLinks();

  const drawerContent = (
    <Box sx={{ width: 280 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box 
          display="flex" 
          alignItems="center" 
          gap={1}
          onClick={() => navigate("/")}
          sx={{ cursor: "pointer" }}
        >
          <Logo size={36} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Assessly
            </Typography>
            {currentOrg && (
              <Chip
                label={currentOrg.name}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {isAuthenticated && currentOrg && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Current Organization
          </Typography>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="body1" fontWeight={500}>
              {currentOrg.name}
            </Typography>
            {organizations.length > 1 && (
              <Button
                size="small"
                onClick={handleOrgMenuOpen}
                endIcon={<ArrowDropDownIcon />}
              >
                Switch
              </Button>
            )}
          </Box>
          {isSuperAdmin && (
            <Button
              fullWidth
              startIcon={<AddIcon />}
              onClick={handleCreateOrganization}
              sx={{ mt: 1 }}
              size="small"
            >
              New Organization
            </Button>
          )}
        </Box>
      )}

      <List>
        {navLinks.map((link, idx) => (
          <ListItem
            key={idx}
            onClick={() => handleNavigate(link.href)}
            sx={{
              cursor: "pointer",
              "&:hover": { backgroundColor: "action.hover" },
              backgroundColor: location.pathname === link.href ? 'action.selected' : 'transparent',
            }}
          >
            {link.icon && (
              <ListItemIcon>
                {link.icon}
              </ListItemIcon>
            )}
            <ListItemText
              primary={link.label}
              primaryTypographyProps={{
                fontSize: 15,
                fontWeight: 500,
              }}
            />
          </ListItem>
        ))}
      </List>

      <Divider />

      {isAuthenticated && showUserMenu && (
        <List>
          <ListItem
            onClick={handleLogout}
            sx={{
              cursor: "pointer",
              "&:hover": { backgroundColor: "action.hover" },
            }}
          >
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{
                fontSize: 15,
                fontWeight: 500,
              }}
            />
          </ListItem>
        </List>
      )}

      <Box sx={{ p: 2, textAlign: "center", color: "text.secondary", fontSize: 13 }}>
        © {new Date().getFullYear()} Assessly Platform
      </Box>
    </Box>
  );

  const renderUserMenu = () => (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleUserMenuClose}
      onClick={handleUserMenuClose}
      PaperProps={{
        elevation: 3,
        sx: { width: 280 },
      }}
    >
      {userProfile && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {userProfile.name || userProfile.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userProfile.email}
          </Typography>
          <Chip
            label={userProfile.role?.replace('_', ' ') || 'User'}
            size="small"
            color="primary"
            sx={{ mt: 1 }}
          />
        </Box>
      )}

      <MenuItem onClick={() => navigate("/profile")}>
        <ListItemIcon>
          <AccountCircleIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>My Profile</ListItemText>
      </MenuItem>

      <MenuItem onClick={() => navigate("/settings")}>
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Settings</ListItemText>
      </MenuItem>

      {isSuperAdmin && (
        <MenuItem onClick={() => navigate("/admin")}>
          <ListItemIcon>
            <AdminPanelSettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Admin Panel</ListItemText>
        </MenuItem>
      )}

      <Divider />

      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );

  const renderOrganizationMenu = () => (
    <Menu
      anchorEl={orgAnchorEl}
      open={Boolean(orgAnchorEl)}
      onClose={handleOrgMenuClose}
      PaperProps={{
        elevation: 3,
        sx: { width: 300, maxHeight: 400 },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Switch Organization
        </Typography>
      </Box>
      
      <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
        {organizations.map((org) => (
          <MenuItem
            key={org.id}
            onClick={() => handleSwitchOrganization(org.id)}
            selected={currentOrg?.id === org.id}
            disabled={loading}
          >
            <ListItemIcon>
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText
              primary={org.name}
              secondary={`${org.members} members`}
            />
            {currentOrg?.id === org.id && (
              <Chip label="Current" size="small" color="primary" />
            )}
          </MenuItem>
        ))}
      </List>

      {isSuperAdmin && (
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            startIcon={<AddIcon />}
            onClick={handleCreateOrganization}
          >
            Create New Organization
          </Button>
        </Box>
      )}
    </Menu>
  );

  const renderNotificationMenu = () => (
    <Menu
      anchorEl={notificationAnchorEl}
      open={Boolean(notificationAnchorEl)}
      onClose={handleNotificationMenuClose}
      PaperProps={{
        elevation: 3,
        sx: { width: 360 },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Notifications
        </Typography>
      </Box>
      
      {notifications.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No notifications
          </Typography>
        </Box>
      ) : (
        <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
          {notifications.slice(0, 10).map((notification) => (
            <MenuItem key={notification.id} onClick={() => navigate(notification.link || "#")}>
              <ListItemText
                primary={notification.title}
                secondary={notification.message}
                primaryTypographyProps={{
                  fontWeight: notification.read ? 400 : 600,
                }}
              />
            </MenuItem>
          ))}
        </List>
      )}
      
      {notifications.length > 0 && (
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          <Button fullWidth onClick={() => navigate("/notifications")}>
            View All Notifications
          </Button>
        </Box>
      )}
    </Menu>
  );

  return (
    <>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={1}
        sx={{
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(255,255,255,0.95)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar disableGutters>
          <Container
            maxWidth="xl"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 0.5,
            }}
          >
            {/* Left Section — Logo + Title */}
            <Box
              display="flex"
              alignItems="center"
              gap={1.2}
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/")}
            >
              <Logo size={34} />
              <Box display="flex" alignItems="center" gap={2}>
                <Wordmark variant="h6" />
                {currentOrg && !isMobile && (
                  <>
                    <Divider orientation="vertical" flexItem />
                    <Tooltip title="Current Organization">
                      <Chip
                        label={currentOrg.name}
                        size="small"
                        color="primary"
                        variant="outlined"
                        onClick={handleOrgMenuOpen}
                        deleteIcon={<ArrowDropDownIcon />}
                        onDelete={organizations.length > 1 ? handleOrgMenuOpen : undefined}
                      />
                    </Tooltip>
                  </>
                )}
              </Box>
            </Box>

            {/* Desktop Navigation */}
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 2 }}>
              {navLinks.map((link, idx) => (
                <Button
                  key={idx}
                  onClick={() => handleNavigate(link.href)}
                  sx={{
                    color: location.pathname === link.href ? 'primary.main' : 'text.primary',
                    fontWeight: location.pathname === link.href ? 600 : 500,
                    minWidth: 'auto',
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>

            {/* Right Section — User Menu */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isAuthenticated && (
                <>
                  <Tooltip title="Notifications">
                    <IconButton
                      onClick={handleNotificationMenuOpen}
                      size="small"
                    >
                      <Badge badgeContent={getUnreadNotificationCount()} color="error">
                        <NotificationsIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>

                  {organizations.length > 1 && isMobile && (
                    <Tooltip title="Switch Organization">
                      <IconButton onClick={handleOrgMenuOpen} size="small">
                        <BusinessIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="Account">
                    <IconButton
                      onClick={handleUserMenuOpen}
                      size="small"
                      sx={{ ml: 1 }}
                    >
                      <Avatar
                        src={userProfile?.avatar}
                        alt={userProfile?.name || user?.email}
                        sx={{ width: 32, height: 32 }}
                      >
                        {userProfile?.name?.[0] || user?.email?.[0]?.toUpperCase()}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                </>
              )}

              {!isAuthenticated && (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate("/login")}
                  >
                    Login
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => navigate("/register")}
                  >
                    Sign Up
                  </Button>
                </>
              )}

              {/* Mobile Menu Icon */}
              <IconButton
                color="inherit"
                onClick={handleDrawerToggle}
                sx={{ display: { md: "none" } }}
                aria-label="open navigation menu"
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Container>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 280,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Popup Menus */}
      {renderUserMenu()}
      {renderOrganizationMenu()}
      {renderNotificationMenu()}
    </>
  );
}

Navbar.propTypes = {
  links: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
      icon: PropTypes.element,
    })
  ),
  showUserMenu: PropTypes.bool,
};

Navbar.defaultProps = {
  showUserMenu: true,
};

export default React.memo(Navbar);

