import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  useScrollTrigger,
  Slide,
  useMediaQuery,
  useTheme,
  Typography,
  Button,
  Badge,
  Tooltip,
  Chip,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Payment as PaymentIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation, useParams } from "react-router-dom";
// FIX: Import directly instead of from barrel file
import Logo from "../brand/Logo";
import Wordmark from "../brand/Wordmark";
import PropTypes from "prop-types";
import { debounce } from "../../utils/performance";
import { 
  fetchOrganizations, 
  switchOrganization,
  checkSubscriptionStatus 
} from "../../api/organizationApi";
import { fetchNotifications, markNotificationAsRead } from "../../api/notificationApi";
import { useSnackbar } from "notistack";

/* --------------------------- Hide on scroll utility -------------------------- */
function HideOnScroll({ children, threshold = 100 }) {
  const trigger = useScrollTrigger({ threshold, disableHysteresis: true });
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

HideOnScroll.propTypes = {
  children: PropTypes.element.isRequired,
  threshold: PropTypes.number,
};

/* ----------------------------- Main Header Start ----------------------------- */
export default function Header({ 
  onDrawerToggle, 
  darkMode, 
  toggleDarkMode,
  sidebarCollapsed = false,
  onSidebarToggle,
}) {
  const { 
    user, 
    logout, 
    isSuperAdmin, 
    isOrgAdmin,
    currentOrganization,
    switchOrganization: switchOrgInContext 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  const [organizationsAnchorEl, setOrganizationsAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState({
    notifications: false,
    organizations: false,
  });

  // Load notifications and organizations on mount
  useEffect(() => {
    if (user) {
      loadNotifications();
      loadOrganizations();
      if (currentOrganization) {
        loadSubscriptionStatus();
      }
    }
  }, [user, currentOrganization]);

  const loadNotifications = async () => {
    try {
      setLoading(prev => ({ ...prev, notifications: true }));
      const data = await fetchNotifications({ unreadOnly: true, limit: 10 });
      setNotifications(data.data || data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(prev => ({ ...prev, notifications: false }));
    }
  };

  const loadOrganizations = async () => {
    try {
      setLoading(prev => ({ ...prev, organizations: true }));
      const data = await fetchOrganizations();
      setOrganizations(data.data || data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(prev => ({ ...prev, organizations: false }));
    }
  };

  const loadSubscriptionStatus = async () => {
    if (!currentOrganization) return;
    try {
      const data = await checkSubscriptionStatus(currentOrganization.id);
      setSubscriptionStatus(data);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  /* ------------------------------ Menu Handlers ------------------------------ */
  const handleMenuOpen = useCallback((e) => setAnchorEl(e.currentTarget), []);
  const handleMenuClose = useCallback(() => setAnchorEl(null), []);
  const handleNotificationsOpen = useCallback(
    (e) => setNotificationsAnchorEl(e.currentTarget),
    []
  );
  const handleNotificationsClose = useCallback(
    () => setNotificationsAnchorEl(null),
    []
  );
  const handleOrganizationsOpen = useCallback(
    (e) => setOrganizationsAnchorEl(e.currentTarget),
    []
  );
  const handleOrganizationsClose = useCallback(
    () => setOrganizationsAnchorEl(null),
    []
  );

  const handleLogout = useCallback(() => {
    handleMenuClose();
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate, handleMenuClose]);

  const handleSwitchOrganization = async (orgId) => {
    try {
      await switchOrganization(orgId);
      await switchOrgInContext(orgId);
      const org = organizations.find(o => o.id === orgId);
      enqueueSnackbar(`Switched to ${org?.name || 'organization'}`, { 
        variant: "success",
        autoHideDuration: 2000,
      });
      window.location.reload(); // Refresh to load new context
    } catch (error) {
      enqueueSnackbar("Failed to switch organization", { variant: "error" });
    } finally {
      handleOrganizationsClose();
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    handleNotificationsClose();
  };

  const handleCreateOrganization = () => {
    navigate("/admin/organizations/create");
    handleOrganizationsClose();
  };

  const handleCreateAssessment = () => {
    navigate("/assessments/create");
  };

  /* ------------------------------ Search Handling ---------------------------- */
  const debouncedSearch = useMemo(
    () =>
      debounce((query) => {
        if (query.trim()) {
          navigate(`/search?q=${encodeURIComponent(query.trim())}`, {
            state: { from: location.pathname },
          });
        }
      }, 300),
    [navigate, location.pathname]
  );

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setSearchQuery("");
      if (isMobile) setIsMobileSearchOpen(false);
    },
    [searchQuery, navigate, isMobile]
  );

  /* --------------------------- Computed User Data ---------------------------- */
  const userData = useMemo(
    () => ({
      displayName: user?.name || user?.email?.split("@")[0] || "User",
      email: user?.email,
      avatar: user?.avatar,
      role: user?.role,
    }),
    [user]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const menuItems = useMemo(() => {
    const items = [
      { label: "My Profile", icon: AccountIcon, path: "/profile" },
      { label: "Settings", icon: SettingsIcon, path: "/settings" },
    ];

    if (isSuperAdmin) {
      items.push(
        { label: "Admin Dashboard", icon: AdminPanelSettingsIcon, path: "/admin" },
        { label: "System Billing", icon: PaymentIcon, path: "/admin/billing" }
      );
    } else if (isOrgAdmin) {
      items.push(
        { label: "Organization Settings", icon: SettingsIcon, path: "/organization/settings" },
        { label: "Billing", icon: PaymentIcon, path: "/organization/billing" }
      );
    }

    return items;
  }, [isSuperAdmin, isOrgAdmin]);

  const getSubscriptionBadge = () => {
    if (!subscriptionStatus) return null;
    
    const status = subscriptionStatus.status;
    const colors = {
      active: 'success',
      trial: 'warning',
      past_due: 'error',
      canceled: 'default',
      inactive: 'default',
    };

    return (
      <Chip
        label={status.replace('_', ' ').toUpperCase()}
        size="small"
        color={colors[status] || 'default'}
        variant="outlined"
        sx={{ ml: 1 }}
      />
    );
  };

  /* ----------------------------- Rendered Output ----------------------------- */
  return (
    <HideOnScroll threshold={60}>
      <AppBar
        component="header"
        position="sticky"
        sx={{
          backdropFilter: "blur(20px)",
          backgroundColor:
            theme.palette.mode === "dark"
              ? "rgba(18, 18, 18, 0.9)"
              : "rgba(255, 255, 255, 0.95)",
          color: "text.primary",
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          transition: "all 0.3s ease",
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            justifyContent: "space-between",
            gap: 2,
            minHeight: { xs: 64, md: 72 },
            px: { xs: 1, md: 2 },
          }}
        >
          {/* ---------------------------- Left Section ---------------------------- */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Tooltip title="Toggle sidebar">
              <IconButton
                color="inherit"
                aria-label="toggle sidebar"
                onClick={onDrawerToggle}
                sx={{
                  "&:hover": { backgroundColor: theme.palette.action.hover },
                  display: { xs: 'flex', md: 'none' },
                }}
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Toggle sidebar">
              <IconButton
                color="inherit"
                aria-label="toggle sidebar"
                onClick={onSidebarToggle}
                sx={{
                  "&:hover": { backgroundColor: theme.palette.action.hover },
                  display: { xs: 'none', md: 'flex' },
                }}
              >
                {sidebarCollapsed ? <MenuIcon /> : <MenuIcon />}
              </IconButton>
            </Tooltip>

            <Box 
              display="flex" 
              alignItems="center" 
              gap={1}
              sx={{ 
                cursor: "pointer",
                flexDirection: sidebarCollapsed ? "column" : "row",
              }}
              onClick={() => navigate("/dashboard")}
            >
              <Logo size={sidebarCollapsed ? 28 : 32} />
              {!sidebarCollapsed && (
                <Wordmark 
                  variant="h6" 
                  sx={{ display: { xs: 'none', md: 'block' } }} 
                />
              )}
            </Box>
          </Box>

          {/* ---------------------------- Center Section ---------------------------- */}
          <Box sx={{ 
            flexGrow: 1, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            maxWidth: { md: 600 },
            mx: 2,
          }}>
            {user && currentOrganization && !isMobile && (
              <Stack direction="row" spacing={1} alignItems="center">
                {/* Organization Selector */}
                <Tooltip title="Switch organization">
                  <Chip
                    icon={<BusinessIcon />}
                    label={currentOrganization.name}
                    onClick={handleOrganizationsOpen}
                    deleteIcon={<ArrowDropDownIcon />}
                    onDelete={handleOrganizationsOpen}
                    color="primary"
                    variant="outlined"
                    sx={{ 
                      fontWeight: 500,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  />
                </Tooltip>

                {/* Subscription Status */}
                {getSubscriptionBadge()}

                {/* Quick Actions */}
                {isOrgAdmin && (
                  <Tooltip title="Create Assessment">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={handleCreateAssessment}
                      sx={{ ml: 1 }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}

            {/* Search Bar */}
            {user && !isMobile && (
              <Box
                component="form"
                onSubmit={handleSearch}
                sx={{
                  flexGrow: 1,
                  maxWidth: 400,
                  display: "flex",
                  alignItems: "center",
                  bgcolor: "action.hover",
                  borderRadius: 3,
                  px: 2,
                  py: 0.75,
                  ml: 2,
                  "&:focus-within": {
                    bgcolor: "action.selected",
                    boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`,
                  },
                  transition: "all 0.25s ease",
                }}
              >
                <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
                <InputBase
                  fullWidth
                  placeholder="Search assessments, candidates..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  sx={{
                    color: "text.primary",
                    "& .MuiInputBase-input": { py: 0.5 },
                  }}
                />
              </Box>
            )}
          </Box>

          {/* ---------------------------- Right Section ---------------------------- */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* Theme Toggle */}
            <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton
                color="inherit"
                onClick={toggleDarkMode}
                aria-label="toggle dark mode"
                sx={{
                  borderRadius: 2,
                  "&:hover": { backgroundColor: theme.palette.action.hover },
                }}
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {user ? (
              <>
                {/* Notifications */}
                <Tooltip title="Notifications">
                  <IconButton
                    color="inherit"
                    onClick={handleNotificationsOpen}
                    sx={{
                      borderRadius: 2,
                      "&:hover": { backgroundColor: theme.palette.action.hover },
                    }}
                  >
                    <Badge
                      badgeContent={unreadNotifications}
                      color="error"
                      max={9}
                    >
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {/* Organization Selector (Mobile) */}
                {isMobile && currentOrganization && (
                  <Tooltip title="Current organization">
                    <IconButton
                      color="inherit"
                      onClick={handleOrganizationsOpen}
                      sx={{
                        borderRadius: 2,
                        "&:hover": { backgroundColor: theme.palette.action.hover },
                      }}
                    >
                      <BusinessIcon />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Mobile Search */}
                {isMobile && (
                  <Tooltip title="Search">
                    <IconButton
                      color="inherit"
                      onClick={() => setIsMobileSearchOpen((p) => !p)}
                      sx={{
                        borderRadius: 2,
                        "&:hover": { backgroundColor: theme.palette.action.hover },
                      }}
                    >
                      <SearchIcon />
                    </IconButton>
                  </Tooltip>
                )}

                {/* User Menu */}
                <Tooltip title="Account menu">
                  <IconButton
                    edge="end"
                    onClick={handleMenuOpen}
                    color="inherit"
                    aria-controls="user-menu"
                    aria-haspopup="true"
                    sx={{
                      borderRadius: 2,
                      "&:hover": { backgroundColor: theme.palette.action.hover },
                      ml: 0.5,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        src={userData.avatar}
                        alt={userData.displayName}
                        sx={{ 
                          width: 32, 
                          height: 32,
                          bgcolor: isSuperAdmin ? 'error.main' : 'primary.main',
                        }}
                      >
                        {userData.displayName.charAt(0).toUpperCase()}
                      </Avatar>
                      {!isMobile && (
                        <>
                          <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
                            {userData.displayName}
                          </Typography>
                          <ArrowDropDownIcon fontSize="small" />
                        </>
                      )}
                    </Stack>
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate("/login")}
                sx={{ ml: 1, borderRadius: 2, px: 3, fontWeight: 600 }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>

        {/* ------------------------- Mobile Search Field ------------------------- */}
        {isMobile && user && isMobileSearchOpen && (
          <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <form onSubmit={handleSearch}>
              <InputBase
                fullWidth
                autoFocus
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={handleSearchChange}
                startAdornment={
                  <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                }
                sx={{
                  bgcolor: "action.hover",
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  "&:focus-within": { bgcolor: "action.selected" },
                }}
              />
            </form>
          </Box>
        )}
      </AppBar>

      {/* ------------------------- Popup Menus ------------------------- */}
      {/* User Menu */}
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            minWidth: 280,
            borderRadius: 2,
            "& .MuiMenuItem-root": {
              borderRadius: 1,
              mx: 1,
              my: 0.25,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              src={userData.avatar}
              alt={userData.displayName}
              sx={{ 
                width: 40, 
                height: 40,
                bgcolor: isSuperAdmin ? 'error.main' : 'primary.main',
              }}
            >
              {userData.displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {userData.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {userData.email}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Chip
                  label={userData.role?.replace('_', ' ') || 'User'}
                  size="small"
                  color={isSuperAdmin ? 'error' : 'primary'}
                />
                {currentOrganization && (
                  <Chip
                    label={currentOrganization.name}
                    size="small"
                    variant="outlined"
                    icon={<BusinessIcon />}
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
        <Divider sx={{ my: 1 }} />
        {menuItems.map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => {
              navigate(item.path);
              handleMenuClose();
            }}
          >
            <item.icon sx={{ mr: 1.5, fontSize: 20 }} />
            {item.label}
          </MenuItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchorEl}
        open={Boolean(notificationsAnchorEl)}
        onClose={handleNotificationsClose}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            width: 360,
            maxHeight: 400,
            borderRadius: 2,
          },
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              Notifications
              {unreadNotifications > 0 && (
                <Typography component="span" color="primary" sx={{ ml: 1 }}>
                  ({unreadNotifications})
                </Typography>
              )}
            </Typography>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={loadNotifications} disabled={loading.notifications}>
                {loading.notifications ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 300, overflow: "auto", minHeight: 100 }}>
          {loading.notifications ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length > 0 ? (
            notifications.map((n) => (
              <MenuItem 
                key={n.id} 
                sx={{ 
                  py: 1.5,
                  bgcolor: n.read ? 'transparent' : 'action.hover',
                  borderLeft: n.read ? 'none' : `3px solid ${theme.palette.primary.main}`,
                }}
                onClick={() => handleNotificationClick(n)}
              >
                <Box sx={{ width: '100%' }}>
                  <Typography
                    variant="body2"
                    fontWeight={n.read ? 400 : 600}
                    gutterBottom
                  >
                    {n.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {n.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {new Date(n.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ p: 3, textAlign: "center" }}
            >
              No notifications
            </Typography>
          )}
        </Box>
        {notifications.length > 0 && (
          <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button 
              fullWidth 
              size="small"
              onClick={() => {
                navigate("/notifications");
                handleNotificationsClose();
              }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>

      {/* Organizations Menu */}
      <Menu
        anchorEl={organizationsAnchorEl}
        open={Boolean(organizationsAnchorEl)}
        onClose={handleOrganizationsClose}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            width: 320,
            maxHeight: 400,
            borderRadius: 2,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" fontWeight={600}>
            Your Organizations
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Switch between organizations
          </Typography>
        </Box>
        
        <Box sx={{ maxHeight: 300, overflow: "auto" }}>
          {loading.organizations ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : organizations.length > 0 ? (
            organizations.map((org) => (
              <MenuItem
                key={org.id}
                onClick={() => handleSwitchOrganization(org.id)}
                selected={currentOrganization?.id === org.id}
                sx={{
                  py: 1.5,
                  borderLeft: currentOrganization?.id === org.id 
                    ? `3px solid ${theme.palette.primary.main}`
                    : 'none',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                  <Avatar 
                    sx={{ 
                      width: 36, 
                      height: 36,
                      bgcolor: 'primary.main',
                    }}
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {org.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {org.plan || 'Free Plan'} • {org.members || 0} members
                    </Typography>
                  </Box>
                  {currentOrganization?.id === org.id && (
                    <Chip label="Current" size="small" color="primary" />
                  )}
                </Stack>
              </MenuItem>
            ))
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ p: 3, textAlign: "center" }}
            >
              No organizations
            </Typography>
          )}
        </Box>

        {isSuperAdmin && (
          <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
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
    </HideOnScroll>
  );
}

Header.propTypes = {
  onDrawerToggle: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
  sidebarCollapsed: PropTypes.bool,
  onSidebarToggle: PropTypes.func,
};

Header.defaultProps = {
  sidebarCollapsed: false,
  onSidebarToggle: () => {},
};
