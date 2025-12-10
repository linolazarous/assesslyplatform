// src/layouts/MainLayout.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Box,
  CssBaseline,
  Toolbar,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Zoom,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Backdrop,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Divider,
  Avatar,
  Chip,
  Badge,
  Drawer,
  SwipeableDrawer,
  Grid,
  List,
  ListItem,
  ListItemText,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Menu,
  MenuOpen,
  Brightness4,
  Brightness7,
  Notifications,
  Search,
  Add,
  Dashboard,
  Assessment,
  People,
  Settings,
  Help,
  Logout,
  Refresh,
  Fullscreen,
  FullscreenExit,
  Keyboard,
  Timeline,
  BarChart,
  Download,
  Upload,
  Share,
  Print,
  FilterList,
  Sort,
  ViewList,
  GridView,
  Info,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Business,
  AdminPanelSettings,
  SupervisedUserCircle,
  Person,
  Lock,
  VpnKey,
  Cloud,
  Storage,
  Speed,
  Security,
  VerifiedUser,
  ArrowBack,
  ArrowForward,
  ExpandMore,
  ExpandLess,
  MoreVert,
} from "@mui/icons-material";
import PropTypes from "prop-types";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSnackbar } from "notistack";
import { useLoading } from "../hooks/useLoading";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import LoadingScreen from "../components/ui/LoadingScreen";

/**
 * MainLayout - Primary application layout for authenticated users
 * Features:
 * - Responsive sidebar navigation
 * - Role-based navigation items
 * - Keyboard shortcuts
 * - Quick actions (SpeedDial)
 * - Focus management and accessibility
 * - Performance monitoring
 * - Organization context
 */

// Drawer configuration
const DRAWER_WIDTH = 280;
const COLLAPSED_DRAWER_WIDTH = 72;
const DRAWER_TRANSITION_DURATION = 225;

// Layout types
const LAYOUT_TYPES = {
  DEFAULT: "default",
  COMPACT: "compact",
  EXPANDED: "expanded",
  FULLSCREEN: "fullscreen",
};

export default function MainLayout({ 
  children, 
  darkMode = false, 
  toggleDarkMode = null,
  showSidebar = true,
  showNavbar = true,
  showQuickActions = true,
  showBreadcrumbs = true,
  showOrganizationContext = true,
  layoutType = "default",
  onLayoutChange = null,
  customSidebar = null,
  customNavbar = null,
  loading = false,
  error = null,
  onErrorDismiss = null,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, claims, currentOrganization, logout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // Layout state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [activeLayout, setActiveLayout] = useState(layoutType);
  const [showQuickActionsMenu, setShowQuickActionsMenu] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutErrors, setLayoutErrors] = useState([]);
  const [lastPathChange, setLastPathChange] = useState(Date.now());
  
  const mainContentRef = useRef(null);
  const sidebarRef = useRef(null);
  const focusTrapRef = useRef(null);
  const performanceMonitorRef = useRef(null);
  
  // Loading hook for layout operations
  const { startLoading, stopLoading, isLoading: isLayoutOperationLoading } = useLoading(false, {
    timeout: 10000,
    onError: (error) => {
      setLayoutErrors(prev => [...prev, error.message]);
      enqueueSnackbar(`Layout error: ${error.message}`, { variant: "error" });
    },
  });

  // Set layout type based on props
  useEffect(() => {
    if (layoutType && LAYOUT_TYPES[layoutType.toUpperCase()]) {
      setActiveLayout(layoutType);
      
      // Apply layout-specific settings
      switch (layoutType) {
        case "compact":
          setDesktopOpen(false);
          setCompactMode(true);
          break;
        case "expanded":
          setDesktopOpen(true);
          setCompactMode(false);
          break;
        case "fullscreen":
          setFullscreenMode(true);
          setDesktopOpen(false);
          setShowQuickActionsMenu(false);
          break;
        default:
          setDesktopOpen(!isMobile);
          setCompactMode(false);
          setFullscreenMode(false);
      }
      
      if (onLayoutChange) {
        onLayoutChange(layoutType);
      }
    }
  }, [layoutType, isMobile, onLayoutChange]);

  // Update layout on path change
  useEffect(() => {
    setLastPathChange(Date.now());
    
    // Auto-close mobile drawer on navigation
    if (isMobile && mobileOpen) {
      setMobileOpen(false);
    }
    
    // Track navigation performance
    const navigationStart = performance.now();
    const cleanup = () => {
      const navigationEnd = performance.now();
      const duration = navigationEnd - navigationStart;
      
      if (duration > 1000) {
        console.warn(`Slow navigation detected: ${duration.toFixed(2)}ms to ${location.pathname}`);
      }
    };
    
    return cleanup;
  }, [location.pathname, isMobile, mobileOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts when no input is focused
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.isContentEditable) {
        return;
      }
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
      
      // Toggle sidebar: Ctrl/Cmd + B
      if (ctrlKey && event.key === 'b') {
        event.preventDefault();
        if (isMobile) {
          setMobileOpen(prev => !prev);
        } else {
          setDesktopOpen(prev => !prev);
        }
      }
      
      // Toggle dark mode: Ctrl/Cmd + D
      if (ctrlKey && event.key === 'd' && toggleDarkMode) {
        event.preventDefault();
        toggleDarkMode();
      }
      
      // Toggle fullscreen: Ctrl/Cmd + F
      if (ctrlKey && event.key === 'f') {
        event.preventDefault();
        handleToggleFullscreen();
      }
      
      // Quick actions: Ctrl/Cmd + K
      if (ctrlKey && event.key === 'k') {
        event.preventDefault();
        setShowQuickActionsMenu(prev => !prev);
      }
      
      // Refresh: F5 or Ctrl/Cmd + R
      if (event.key === 'F5' || (ctrlKey && event.key === 'r')) {
        // Don't prevent default for browser refresh
        if (!ctrlKey || event.key !== 'r') {
          event.preventDefault();
          handleRefresh();
        }
      }
      
      // Dashboard: Ctrl/Cmd + 1
      if (ctrlKey && event.key === '1') {
        event.preventDefault();
        navigate('/dashboard');
      }
      
      // Assessments: Ctrl/Cmd + 2
      if (ctrlKey && event.key === '2') {
        event.preventDefault();
        navigate('/assessments');
      }
      
      // Help: Ctrl/Cmd + /
      if (ctrlKey && event.key === '/') {
        event.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, toggleDarkMode, navigate]);

  // Handle focus management for accessibility
  useEffect(() => {
    if (mobileOpen && sidebarRef.current) {
      // Focus the first focusable element in sidebar when opened on mobile
      const focusable = sidebarRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) {
        focusable.focus();
      }
    }
    
    // When sidebar closes, return focus to the toggle button or main content
    return () => {
      if (!mobileOpen && mainContentRef.current) {
        const mainFocusable = mainContentRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (mainFocusable) {
          mainFocusable.focus();
        }
      }
    };
  }, [mobileOpen]);

  // Performance monitoring
  useEffect(() => {
    if (showPerformanceMonitor && performanceMonitorRef.current) {
      const updatePerformance = () => {
        if (performanceMonitorRef.current) {
          const memory = performance.memory;
          const now = performance.now();
          
          performanceMonitorRef.current.innerHTML = `
            <div style="padding: 8px; background: rgba(0,0,0,0.8); color: white; border-radius: 4px;">
              <div>FPS: ${Math.round(1000 / (now - (performanceMonitorRef.current.lastTime || now)))}</div>
              ${memory ? `<div>Memory: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB</div>` : ''}
              <div>Layout: ${activeLayout}</div>
            </div>
          `;
          
          performanceMonitorRef.current.lastTime = now;
        }
      };
      
      const interval = setInterval(updatePerformance, 1000);
      return () => clearInterval(interval);
    }
  }, [showPerformanceMonitor, activeLayout]);

  // Event handlers
  const handleDrawerToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen(prev => !prev);
    } else {
      setDesktopOpen(prev => !prev);
      setCompactMode(!desktopOpen);
    }
  }, [isMobile, desktopOpen]);

  const handleToggleCompactMode = useCallback(() => {
    setCompactMode(prev => !prev);
    setDesktopOpen(prev => !prev);
    
    if (onLayoutChange) {
      onLayoutChange(compactMode ? "default" : "compact");
    }
  }, [compactMode, onLayoutChange]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setFullscreenMode(true);
      setActiveLayout("fullscreen");
    } else {
      document.exitFullscreen();
      setFullscreenMode(false);
      setActiveLayout("default");
    }
    
    if (onLayoutChange) {
      onLayoutChange(fullscreenMode ? "default" : "fullscreen");
    }
  }, [fullscreenMode, onLayoutChange]);

  const handleRefresh = useCallback(() => {
    startLoading("Refreshing...");
    
    // Simulate refresh
    setTimeout(() => {
      stopLoading("success", null, "Refreshed successfully");
      enqueueSnackbar("Page refreshed", { variant: "success" });
    }, 500);
  }, [startLoading, stopLoading, enqueueSnackbar]);

  const handleLogout = useCallback(() => {
    enqueueSnackbar("Logging out...", { variant: "info" });
    setTimeout(() => logout(), 500);
  }, [logout, enqueueSnackbar]);

  const handleQuickAction = useCallback((action) => {
    switch (action) {
      case 'create_assessment':
        navigate('/assessments/create');
        break;
      case 'import_data':
        // Handle import
        break;
      case 'export_data':
        // Handle export
        break;
      case 'share':
        // Handle share
        break;
      case 'print':
        window.print();
        break;
      default:
        console.log('Quick action:', action);
    }
    
    setShowQuickActionsMenu(false);
    enqueueSnackbar(`Action: ${action.replace('_', ' ')}`, { variant: "info" });
  }, [navigate, enqueueSnackbar]);

  // Quick actions for SpeedDial
  const quickActions = useMemo(() => [
    { icon: <Add />, name: 'Create Assessment', action: 'create_assessment', color: 'primary' },
    { icon: <Upload />, name: 'Import Data', action: 'import_data', color: 'secondary' },
    { icon: <Download />, name: 'Export Data', action: 'export_data', color: 'success' },
    { icon: <Share />, name: 'Share', action: 'share', color: 'info' },
    { icon: <Print />, name: 'Print', action: 'print', color: 'warning' },
  ], []);

  // Calculate layout styles
  const layoutStyles = useMemo(() => {
    const drawerWidthValue = compactMode ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;
    const isDrawerOpen = isMobile ? mobileOpen : desktopOpen;
    
    return {
      drawerWidth: drawerWidthValue,
      mainContentMarginLeft: showSidebar && isDrawerOpen && !isMobile ? drawerWidthValue : 0,
      mainContentWidth: showSidebar && isDrawerOpen && !isMobile ? `calc(100% - ${drawerWidthValue}px)` : '100%',
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: DRAWER_TRANSITION_DURATION,
      }),
    };
  }, [compactMode, isMobile, mobileOpen, desktopOpen, showSidebar, theme]);

  // Render loading state
  if (loading || isLayoutOperationLoading) {
    return <LoadingScreen message="Loading application..." type="layout" />;
  }

  // Render error state
  if (error && !currentUser) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3,
      }}>
        <Alert 
          severity="error" 
          action={
            <Button onClick={onErrorDismiss}>
              Dismiss
            </Button>
          }
          sx={{ maxWidth: 600 }}
        >
          <Typography variant="h6" gutterBottom>
            Layout Error
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative',
    }}>
      <CssBaseline />
      
      {/* Performance monitor (development only) */}
      {/* FIXED LINE: Changed process.env.NODE_ENV to import.meta.env.MODE */}
      {import.meta.env.MODE === 'development' && (
        <Box
          ref={performanceMonitorRef}
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999,
          }}
        />
      )}

      {/* Navbar */}
      {showNavbar && (
        <Fade in={!fullscreenMode}>
          <Box>
            {customNavbar || (
              <Navbar
                position="fixed"
                drawerWidth={layoutStyles.drawerWidth}
                isDrawerOpen={isMobile ? mobileOpen : desktopOpen}
                onDrawerToggle={handleDrawerToggle}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                onToggleCompactMode={handleToggleCompactMode}
                onToggleFullscreen={handleToggleFullscreen}
                onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
                compactMode={compactMode}
                fullscreenMode={fullscreenMode}
                organization={currentOrganization}
                user={currentUser}
                showSearch={true}
                showNotifications={true}
                showOrganizationSwitcher={showOrganizationContext}
              />
            )}
          </Box>
        </Fade>
      )}

      {/* Sidebar */}
      {showSidebar && currentUser && (
        <>
          {/* Mobile drawer */}
          {isMobile && (
            <SwipeableDrawer
              variant="temporary"
              open={mobileOpen}
              onOpen={() => setMobileOpen(true)}
              onClose={() => setMobileOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiDrawer-paper': { 
                  width: layoutStyles.drawerWidth,
                  boxSizing: 'border-box',
                },
              }}
            >
              <Box ref={sidebarRef}>
                {customSidebar || (
                  <Sidebar
                    variant="mobile"
                    compact={false}
                    onClose={() => setMobileOpen(false)}
                    user={currentUser}
                    organization={currentOrganization}
                    claims={claims}
                  />
                )}
              </Box>
            </SwipeableDrawer>
          )}

          {/* Desktop sidebar */}
          {!isMobile && (
            <Drawer
              variant="persistent"
              open={desktopOpen}
              sx={{
                display: { xs: 'none', md: 'block' },
                width: layoutStyles.drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: layoutStyles.drawerWidth,
                  boxSizing: 'border-box',
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  transition: layoutStyles.transition,
                },
              }}
            >
              <Box ref={sidebarRef}>
                {customSidebar || (
                  <Sidebar
                    variant="desktop"
                    compact={compactMode}
                    onToggleCompact={handleToggleCompactMode}
                    user={currentUser}
                    organization={currentOrganization}
                    claims={claims}
                    activePath={location.pathname}
                  />
                )}
              </Box>
            </Drawer>
          )}
        </>
      )}

      {/* Main content */}
      <Box
        component="main"
        ref={mainContentRef}
        sx={{
          flexGrow: 1,
          width: layoutStyles.mainContentWidth,
          ml: layoutStyles.mainContentMarginLeft,
          transition: layoutStyles.transition,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          pt: showNavbar ? { xs: 7, sm: 8 } : 0,
          ...(fullscreenMode && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1300,
            backgroundColor: 'background.default',
          }),
        }}
        aria-live="polite"
        aria-atomic="true"
        aria-label="Main content"
      >
        {/* Toolbar spacer for navbar */}
        {showNavbar && <Toolbar />}

        {/* Breadcrumbs */}
        {showBreadcrumbs && !fullscreenMode && (
          <Slide direction="down" in={!fullscreenMode}>
            <Box sx={{ 
              px: 3, 
              pt: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}>
              {/* Breadcrumbs component would go here */}
              <Chip
                label={currentOrganization?.name || "Organization"}
                size="small"
                icon={<Business />}
                variant="outlined"
              />
              <Divider orientation="vertical" flexItem />
              <Typography variant="caption" color="text.secondary">
                {location.pathname.split('/').filter(Boolean).join(' › ')}
              </Typography>
            </Box>
          </Slide>
        )}

        {/* Main content area */}
        <Box sx={{ 
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          ...(fullscreenMode && { p: 0 }),
        }}>
          {/* Layout errors */}
          {layoutErrors.length > 0 && (
            <Alert 
              severity="warning" 
              onClose={() => setLayoutErrors([])}
              sx={{ mb: 2 }}
            >
              {layoutErrors[0]}
            </Alert>
          )}

          {/* Children */}
          <Box
            sx={{
              position: 'relative',
              minHeight: 'calc(100vh - 200px)',
            }}
          >
            {children}
          </Box>
        </Box>

        {/* Quick Actions SpeedDial */}
        {showQuickActions && !fullscreenMode && (
          <Zoom in={!fullscreenMode}>
            <SpeedDial
              ariaLabel="Quick Actions"
              sx={{ 
                position: 'fixed', 
                bottom: 32, 
                right: 32,
                '& .MuiSpeedDial-fab': {
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              }}
              icon={<SpeedDialIcon />}
              open={showQuickActionsMenu}
              onOpen={() => setShowQuickActionsMenu(true)}
              onClose={() => setShowQuickActionsMenu(false)}
            >
              {quickActions.map((action) => (
                <SpeedDialAction
                  key={action.action}
                  icon={action.icon}
                  tooltipTitle={action.name}
                  tooltipOpen
                  onClick={() => handleQuickAction(action.action)}
                  FabProps={{ sx: { color: 'white', bgcolor: `${action.color}.main` } }}
                />
              ))}
            </SpeedDial>
          </Zoom>
        )}

        {/* Footer */}
        {!fullscreenMode && (
          <Fade in={!fullscreenMode}>
            <Box
              component="footer"
              sx={{
                py: 2,
                px: 3,
                mt: 'auto',
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    © {new Date().getFullYear()} Assessly Platform • v1.0.0
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Typography
                      variant="caption"
                      component="a"
                      href="/help"
                      color="text.secondary"
                      sx={{ textDecoration: 'none' }}
                    >
                      Help
                    </Typography>
                    <Typography variant="caption" color="text.secondary">•</Typography>
                    <Typography
                      variant="caption"
                      component="a"
                      href="/terms"
                      target="_blank"
                      color="text.secondary"
                      sx={{ textDecoration: 'none' }}
                    >
                      Terms
                    </Typography>
                    <Typography variant="caption" color="text.secondary">•</Typography>
                    <Typography
                      variant="caption"
                      component="a"
                      href="/privacy"
                      target="_blank"
                      color="text.secondary"
                      sx={{ textDecoration: 'none' }}
                    >
                      Privacy
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )}
      </Box>

      {/* Keyboard shortcuts dialog */}
      <Dialog
        open={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Keyboard sx={{ mr: 1, verticalAlign: 'middle' }} />
          Keyboard Shortcuts
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemText 
                primary="Ctrl/Cmd + B"
                secondary="Toggle sidebar"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Ctrl/Cmd + D"
                secondary="Toggle dark mode"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Ctrl/Cmd + F"
                secondary="Toggle fullscreen"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Ctrl/Cmd + K"
                secondary="Quick actions"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Ctrl/Cmd + 1"
                secondary="Go to Dashboard"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Ctrl/Cmd + 2"
                secondary="Go to Assessments"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowKeyboardShortcuts(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global loading backdrop */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: theme.zIndex.drawer + 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        open={isLayoutOperationLoading}
      >
        <CircularProgress color="inherit" />
        <Typography variant="body1">
          Loading layout...
        </Typography>
      </Backdrop>
    </Box>
  );
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
  darkMode: PropTypes.bool,
  toggleDarkMode: PropTypes.func,
  showSidebar: PropTypes.bool,
  showNavbar: PropTypes.bool,
  showQuickActions: PropTypes.bool,
  showBreadcrumbs: PropTypes.bool,
  showOrganizationContext: PropTypes.bool,
  layoutType: PropTypes.oneOf(['default', 'compact', 'expanded', 'fullscreen']),
  onLayoutChange: PropTypes.func,
  customSidebar: PropTypes.node,
  customNavbar: PropTypes.node,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onErrorDismiss: PropTypes.func,
};

MainLayout.defaultProps = {
  darkMode: false,
  toggleDarkMode: null,
  showSidebar: true,
  showNavbar: true,
  showQuickActions: true,
  showBreadcrumbs: true,
  showOrganizationContext: true,
  layoutType: 'default',
  onLayoutChange: null,
  customSidebar: null,
  customNavbar: null,
  loading: false,
  error: null,
  onErrorDismiss: null,
};
