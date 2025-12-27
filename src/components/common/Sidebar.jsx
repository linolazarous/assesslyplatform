
// src/components/common/Sidebar.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  useMediaQuery,
  useTheme,
  Collapse,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Badge,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  BarChart as ReportsIcon,
  Description as TemplatesIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Payment as PaymentIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Workspaces as WorkspacesIcon,
  School as SchoolIcon,
  Quiz as QuizIcon,
  Analytics as AnalyticsIcon,
  Folder as FolderIcon,
  CalendarToday as CalendarIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
  Support as SupportIcon,
  AccountCircle as AccountCircleIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
// FIX: Import directly instead of from barrel file
import Logo from "../brand/Logo";
import Wordmark from "../brand/Wordmark";
import { fetchOrganizations, switchOrganization } from "../../api/userApi";
import { fetchNotifications } from "../../api/notificationApi";
import { useSnackbar } from "notistack";

const drawerWidth = 280;
const collapsedWidth = 68;

/**
 * Sidebar Component for Multitenant Assessment Platform
 * - Role-based navigation (Super Admin vs Organization Admin vs Regular User)
 * - Organization switching and management
 * - Collapsible sections for better UX
 * - Current organization display
 * - Notifications and quick actions
 */
function Sidebar({ mobileOpen, onDrawerToggle, collapsed = false, onCollapseToggle }) {
  const { user, logout, isSuperAdmin, isOrgAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    assessments: true,
    admin: false,
  });
  const [orgMenuAnchor, setOrgMenuAnchor] = useState(null);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      loadUserData();
      loadNotifications();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const data = await fetchOrganizations();
      setOrganizations(data.data || data);
      
      // Set current organization
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const current = data.data?.find(org => org.id === savedOrgId) || data.data?.[0];
      if (current) {
        setCurrentOrg(current);
        localStorage.setItem('currentOrganizationId', current.id);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications({ unreadOnly: true, limit: 5 });
      setNotifications(data.data || data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleNavigation = (path, action) => {
    if (action) {
      action();
    } else {
      navigate(path);
    }
    if (isMobile) onDrawerToggle();
  };

  const handleOrgMenuOpen = (event) => {
    setOrgMenuAnchor(event.currentTarget);
  };

  const handleOrgMenuClose = () => {
    setOrgMenuAnchor(null);
  };

  const handleSwitchOrganization = async (orgId) => {
    try {
      await switchOrganization(orgId);
      const org = organizations.find(o => o.id === orgId);
      setCurrentOrg(org);
      localStorage.setItem('currentOrganizationId', orgId);
      enqueueSnackbar(`Switched to ${org?.name || 'organization'}`, { variant: "success" });
      window.location.reload(); // Refresh to load new org context
    } catch (error) {
      enqueueSnackbar("Failed to switch organization", { variant: "error" });
    }
    handleOrgMenuClose();
  };

  const handleCreateAssessment = () => {
    navigate("/assessments/create");
    if (isMobile) onDrawerToggle();
  };

  const handleSectionToggle = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getUnreadNotificationCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  // Define menu items based on user role
  const getMenuItems = () => {
    const baseItems = [
      { 
        text: "Dashboard", 
        icon: <DashboardIcon />, 
        path: "/dashboard",
        roles: ['all']
      },
      { 
        text: "Assessments", 
        icon: <AssessmentIcon />, 
        path: "/assessments",
        roles: ['all'],
        subItems: [
          { text: "All Assessments", path: "/assessments" },
          { text: "Create New", path: "/assessments/create", icon: <AddIcon /> },
          { text: "Question Bank", path: "/assessments/questions" },
          { text: "Categories", path: "/assessments/categories" },
        ]
      },
      { 
        text: "Candidates", 
        icon: <PeopleIcon />, 
        path: "/candidates",
        roles: ['admin', 'org_admin', 'assessor']
      },
      { 
        text: "Results", 
        icon: <AnalyticsIcon />, 
        path: "/results",
        roles: ['all'],
        subItems: [
          { text: "All Results", path: "/results" },
          { text: "Analytics", path: "/results/analytics" },
          { text: "Reports", path: "/results/reports" },
          { text: "Export", path: "/results/export" },
        ]
      },
      { 
        text: "Templates", 
        icon: <TemplatesIcon />, 
        path: "/templates",
        roles: ['admin', 'org_admin', 'assessor']
      },
      { 
        text: "Schedule", 
        icon: <CalendarIcon />, 
        path: "/schedule",
        roles: ['all']
      },
    ];

    // Filter items based on user role
    return baseItems.filter(item => {
      if (item.roles.includes('all')) return true;
      if (isSuperAdmin) return item.roles.includes('admin');
      if (isOrgAdmin) return item.roles.includes('org_admin');
      if (user?.role === 'assessor') return item.roles.includes('assessor');
      return item.roles.includes('user');
    });
  };

  const getAdminMenuItems = () => {
    if (!isSuperAdmin && !isOrgAdmin) return [];

    const adminItems = [];

    // Organization Admin items
    if (isOrgAdmin) {
      adminItems.push(
        { text: "Team Management", icon: <PeopleIcon />, path: "/admin/team" },
        { text: "Organization Settings", icon: <SettingsIcon />, path: "/organization/settings" },
        { text: "Usage & Billing", icon: <PaymentIcon />, path: "/organization/billing" },
      );
    }

    // Super Admin items (developer)
    if (isSuperAdmin) {
      adminItems.push(
        { text: "All Organizations", icon: <BusinessIcon />, path: "/admin/organizations" },
        { text: "System Billing", icon: <PaymentIcon />, path: "/admin/billing" },
        { text: "System Settings", icon: <SettingsIcon />, path: "/admin/settings" },
        { text: "User Management", icon: <AdminPanelSettingsIcon />, path: "/admin/users" },
        { text: "Audit Logs", icon: <SecurityIcon />, path: "/admin/audit-logs" },
      );
    }

    return adminItems;
  };

  const getSupportItems = () => {
    return [
      { text: "Help Center", icon: <HelpIcon />, path: "/help" },
      { text: "Support", icon: <SupportIcon />, path: "/support" },
      { text: "Documentation", icon: <DescriptionIcon />, path: "/docs" },
    ];
  };

  const renderMenuItem = (item, depth = 0) => {
    const isActive = location.pathname === item.path || 
      location.pathname.startsWith(item.path + '/');
    
    const hasSubItems = item.subItems && item.subItems.length > 0;

    return (
      <React.Fragment key={item.text}>
        <ListItem
          onClick={() => handleNavigation(item.path)}
          selected={isActive}
          sx={{
            pl: depth * 2 + 2,
            py: 1,
            cursor: "pointer",
            "&.Mui-selected": {
              backgroundColor: theme.palette.action.selected,
              borderRight: `3px solid ${theme.palette.primary.main}`,
            },
            "&:hover": {
              backgroundColor: theme.palette.action.hover,
            },
            minHeight: 48,
          }}
        >
          <ListItemIcon sx={{ 
            minWidth: 40,
            color: isActive ? 'primary.main' : 'inherit'
          }}>
            {item.icon}
          </ListItemIcon>
          
          {!collapsed && (
            <>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'primary.main' : 'text.primary',
                }}
              />
              {hasSubItems && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSectionToggle(item.text.toLowerCase());
                  }}
                >
                  {expandedSections[item.text.toLowerCase()] ? 
                    <ExpandLessIcon fontSize="small" /> : 
                    <ExpandMoreIcon fontSize="small" />
                  }
                </IconButton>
              )}
            </>
          )}
        </ListItem>

        {hasSubItems && !collapsed && (
          <Collapse in={expandedSections[item.text.toLowerCase()]} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.subItems.map(subItem => renderMenuItem(subItem, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawerContent = (
    <Box sx={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100%",
      bgcolor: 'background.paper',
    }}>
      {/* Header with Logo and Organization */}
      <Toolbar sx={{ 
        justifyContent: collapsed ? "center" : "space-between",
        flexDirection: collapsed ? "column" : "row",
        py: collapsed ? 2 : 3,
        px: 2,
        minHeight: 'auto',
        gap: collapsed ? 1 : 2,
      }}>
        <Box 
          display="flex" 
          alignItems="center" 
          gap={1}
          sx={{ 
            cursor: "pointer",
            flexDirection: collapsed ? "column" : "row",
          }}
          onClick={() => navigate("/dashboard")}
        >
          <Logo size={collapsed ? 32 : 36} />
          {!collapsed && <Wordmark variant="h6" />}
        </Box>

        {!collapsed && !isMobile && (
          <IconButton
            size="small"
            onClick={onCollapseToggle}
            sx={{
              border: 1,
              borderColor: 'divider',
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>

      <Divider />

      {/* Organization Selector */}
      {!collapsed && currentOrg && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            CURRENT ORGANIZATION
          </Typography>
          <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="space-between"
            sx={{ 
              cursor: 'pointer',
              p: 1,
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={handleOrgMenuOpen}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: 14,
                }}
              >
                {currentOrg.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {currentOrg.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentOrg.plan || 'Free Plan'}
                </Typography>
              </Box>
            </Box>
            <ExpandMoreIcon fontSize="small" />
          </Box>
        </Box>
      )}

      {/* Quick Actions */}
      {!collapsed && (
        <Box sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<AddIcon />}
            onClick={handleCreateAssessment}
            sx={{ mb: 1 }}
          >
            Create Assessment
          </Button>
          {isSuperAdmin && (
            <Button
              variant="outlined"
              fullWidth
              startIcon={<BusinessIcon />}
              onClick={() => navigate("/admin/organizations/create")}
            >
              New Organization
            </Button>
          )}
        </Box>
      )}

      <Divider />

      {/* Main Navigation */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: "auto",
        overflowX: "hidden",
      }}>
        <List component="nav" disablePadding>
          {getMenuItems().map(item => renderMenuItem(item))}
        </List>

        {/* Admin Section */}
        {getAdminMenuItems().length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                px: 3, 
                py: 1,
                display: collapsed ? 'none' : 'block'
              }}
            >
              ADMINISTRATION
            </Typography>
            <List component="nav" disablePadding>
              {getAdminMenuItems().map(item => renderMenuItem(item))}
            </List>
          </>
        )}

        {/* Support Section */}
        <Divider sx={{ my: 2 }} />
        <List component="nav" disablePadding>
          {getSupportItems().map(item => renderMenuItem(item))}
        </List>
      </Box>

      {/* Bottom Section - User & Notifications */}
      <Box sx={{ 
        flexShrink: 0,
        borderTop: 1,
        borderColor: 'divider',
      }}>
        {!collapsed && (
          <>
            {/* Notifications */}
            <ListItem
              onClick={() => navigate("/notifications")}
              sx={{
                cursor: "pointer",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              <ListItemIcon>
                <Badge badgeContent={getUnreadNotificationCount()} color="error">
                  <NotificationsIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItem>

            {/* User Profile */}
            <ListItem
              onClick={() => navigate("/profile")}
              sx={{
                cursor: "pointer",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              <ListItemIcon>
                <Avatar
                  src={user?.avatar}
                  alt={user?.name}
                  sx={{ width: 32, height: 32 }}
                >
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                </Avatar>
              </ListItemIcon>
              <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <Typography variant="body2" fontWeight={500} noWrap>
                  {user?.name || user?.email}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user?.role?.replace('_', ' ') || 'User'}
                </Typography>
              </Box>
            </ListItem>

            <Divider />
          </>
        )}

        {/* Settings & Logout */}
        <List component="nav" disablePadding>
          <ListItem
            onClick={() => navigate("/settings")}
            sx={{
              cursor: "pointer",
              "&:hover": { backgroundColor: "action.hover" },
              py: collapsed ? 1.5 : 1,
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <ListItemIcon sx={{ 
              minWidth: collapsed ? 'auto' : 40,
              justifyContent: 'center'
            }}>
              <SettingsIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Settings" />}
          </ListItem>

          <ListItem
            onClick={logout}
            sx={{
              cursor: "pointer",
              "&:hover": { backgroundColor: "action.hover" },
              py: collapsed ? 1.5 : 1,
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <ListItemIcon sx={{ 
              minWidth: collapsed ? 'auto' : 40,
              justifyContent: 'center'
            }}>
              <LogoutIcon />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Logout" />}
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  // Organization Selection Menu
  const renderOrganizationMenu = () => (
    <Menu
      anchorEl={orgMenuAnchor}
      open={Boolean(orgMenuAnchor)}
      onClose={handleOrgMenuClose}
      PaperProps={{
        elevation: 3,
        sx: { width: 300, maxHeight: 400 },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Select Organization
        </Typography>
      </Box>
      
      <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
        {organizations.map((org) => (
          <MenuItem
            key={org.id}
            onClick={() => handleSwitchOrganization(org.id)}
            selected={currentOrg?.id === org.id}
          >
            <ListItemIcon>
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: 14,
                }}
              >
                {org.name?.[0]?.toUpperCase()}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={org.name}
              secondary={`${org.plan || 'Free Plan'} • ${org.members || 0} members`}
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
            onClick={() => {
              handleOrgMenuClose();
              navigate("/admin/organizations/create");
            }}
          >
            Create New Organization
          </Button>
        </Box>
      )}
    </Menu>
  );

  return (
    <Box
      component="nav"
      sx={{ 
        width: { 
          xs: drawerWidth,
          md: collapsed ? collapsedWidth : drawerWidth 
        },
        flexShrink: 0,
        transition: theme.transitions.create(['width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
      aria-label="sidebar navigation"
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: collapsed ? collapsedWidth : drawerWidth,
            overflowX: "hidden",
            transition: theme.transitions.create(['width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Organization Selection Menu */}
      {renderOrganizationMenu()}
    </Box>
  );
}

Sidebar.propTypes = {
  mobileOpen: PropTypes.bool.isRequired,
  onDrawerToggle: PropTypes.func.isRequired,
  collapsed: PropTypes.bool,
  onCollapseToggle: PropTypes.func,
};

Sidebar.defaultProps = {
  collapsed: false,
  onCollapseToggle: () => {},
};

export default React.memo(Sidebar);
