// src/pages/Admin/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Paper,
  LinearProgress,
  useMediaQuery,
  useTheme,
  IconButton,
  Button,
  Alert,
  Chip,
  Card,
  CardContent,
  Divider,
  Stack,
  Tabs,
  Tab,
  Badge,
  Avatar,
  Tooltip,
  Fade,
  Slide,
  Zoom,
  Container,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  TextField,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Dashboard as DashboardIcon,
  OnlinePrediction as OnlineIcon,
  OfflineBolt as OfflineIcon,
  AdminPanelSettings,
  Security,
  Timeline,
  BarChart,
  TrendingUp,
  TrendingDown,
  Equalizer,
  InsertChart,
  PieChart,
  ShowChart,
  Download,
  Print,
  Share,
  FilterList,
  Sort,
  ViewList,
  GridView,
  CalendarToday,
  Timer,
  CheckCircle,
  Error,
  Info,
  Help,
  Settings,
  MoreVert,
  ArrowDropDown,
  ArrowDropUp,
  Add,
  Edit,
  Delete,
  Archive,
  Unarchive,
  Visibility,
  ContentCopy,
  Email,
  Notifications,
  VpnKey,
  Lock,
  Cloud,
  Storage,
  Speed,
  VerifiedUser,
  SupervisedUserCircle,
  CorporateFare,
  Group,
  Person,
  School,
  Work,
  BusinessCenter,
  AccountBalance,
  Public,
  Language,
  Brightness4,
  Brightness7,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../hooks/useLoading";
import LoadingScreen from "../../components/ui/LoadingScreen";
import RoleGuard from "../../components/RoleGuard";
import { fetchAdminStats, fetchSystemHealth, fetchRecentActivities } from "../../api/adminApi";

// Lazy load heavy components
const AssessmentChart = lazy(() => import("../../components/admin/AssessmentChart"));
const UserActivityWidget = lazy(() => import("../../components/admin/UserActivityWidget"));
const OrganizationStats = lazy(() => import("../../components/admin/OrganizationStats"));
const SystemHealthMonitor = lazy(() => import("../../components/admin/SystemHealthMonitor"));
const RevenueChart = lazy(() => import("../../components/admin/RevenueChart"));
const RecentActivities = lazy(() => import("../../components/admin/RecentActivities"));

// Loading fallbacks
const LoadingFallback = ({ message = "Loading..." }) => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 4, minHeight: 200 }}>
    <CircularProgress size={40} />
    {message && (
      <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
        {message}
      </Typography>
    )}
  </Box>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dashboard Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card sx={{ p: 3, textAlign: "center", bgcolor: "error.light" }}>
          <Error sx={{ fontSize: 48, color: "error.main", mb: 2 }} />
          <Typography variant="h6" color="error.main" gutterBottom>
            Component Error
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {this.props.componentName} failed to load: {this.state.error?.message}
          </Typography>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            Reload Dashboard
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}

// StatCard Component
const StatCard = React.memo(({ title, value, icon, loading = false, trend, subtitle, color = "primary", onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const trendConfig = {
    up: { icon: <ArrowDropUp sx={{ color: "success.main" }} />, color: "success" },
    down: { icon: <ArrowDropDown sx={{ color: "error.main" }} />, color: "error" },
    neutral: { icon: null, color: "default" },
  };

  const trendInfo = trendConfig[trend] || trendConfig.neutral;

  return (
    <Card
      elevation={2}
      onClick={onClick}
      sx={{
        height: "100%",
        borderRadius: 2,
        borderLeft: 4,
        borderColor: `${color}.main`,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.3s ease",
        "&:hover": onClick ? {
          transform: "translateY(-4px)",
          boxShadow: 6,
        } : {},
      }}
    >
      <CardContent sx={{ p: isMobile ? 2 : 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ textTransform: "uppercase", fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="h5">Loading...</Typography>
                </Box>
              ) : (
                <>
                  {value}
                  {trendInfo.icon && (
                    <Box component="span" sx={{ ml: 1, verticalAlign: "middle" }}>
                      {trendInfo.icon}
                    </Box>
                  )}
                </>
              )}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              width: 48,
              height: 48,
            }}
          >
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
});

// Quick Actions Component
const QuickActions = ({ onAction }) => {
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: <Add />, name: "Create Assessment", action: "create_assessment", color: "primary" },
    { icon: <People />, name: "Add User", action: "add_user", color: "secondary" },
    { icon: <Business />, name: "Create Organization", action: "create_organization", color: "warning" },
    { icon: <BarChart />, name: "Generate Report", action: "generate_report", color: "info" },
    { icon: <Settings />, name: "System Settings", action: "system_settings", color: "default" },
  ];

  return (
    <SpeedDial
      ariaLabel="Quick Actions"
      sx={{ position: "fixed", bottom: 32, right: 32 }}
      icon={<SpeedDialIcon />}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
    >
      {actions.map((action) => (
        <SpeedDialAction
          key={action.action}
          icon={action.icon}
          tooltipTitle={action.name}
          onClick={() => {
            onAction(action.action);
            setOpen(false);
          }}
          FabProps={{ sx: { bgcolor: `${action.color}.main`, color: "white" } }}
        />
      ))}
    </SpeedDial>
  );
};

export default function AdminDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser, claims, isAuthenticated, isSuperAdmin } = useAuth();

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalAssessments: 0,
    activeUsers: 0,
    totalOrganizations: 0,
    completedAssessments: 0,
    pendingAssessments: 0,
    totalRevenue: 0,
    activeAssessments: 0,
    totalCandidates: 0,
    averageScore: 0,
    systemHealth: 100,
  });
  const [timeRange, setTimeRange] = useState("7d");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState("all");
  const [organizations, setOrganizations] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [showHealthDialog, setShowHealthDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Loading hook
  const { startLoading, stopLoading, isLoading: isDataLoading } = useLoading(false, {
    timeout: 15000,
    onError: (error) => {
      enqueueSnackbar(`Dashboard error: ${error.message}`, { variant: "error" });
    },
  });

  // Permission check
  const hasAdminAccess = useMemo(() => {
    return isSuperAdmin || claims?.role === "super_admin" || claims?.role === "organization_owner";
  }, [isSuperAdmin, claims]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!hasAdminAccess) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      startLoading("Loading admin dashboard...");
    }

    try {
      // Fetch all data in parallel
      const [statsData, healthData, activitiesData] = await Promise.all([
        fetchAdminStats({ timeRange, organizationId: selectedOrganization !== "all" ? selectedOrganization : null }),
        fetchSystemHealth(),
        fetchRecentActivities({ limit: 10 }),
      ]);

      // Update stats
      setStats({
        totalAssessments: statsData.totalAssessments || 0,
        activeUsers: statsData.activeUsers || 0,
        totalOrganizations: statsData.totalOrganizations || 0,
        completedAssessments: statsData.completedAssessments || 0,
        pendingAssessments: statsData.pendingAssessments || 0,
        totalRevenue: statsData.totalRevenue || 0,
        activeAssessments: statsData.activeAssessments || 0,
        totalCandidates: statsData.totalCandidates || 0,
        averageScore: statsData.averageScore || 0,
        systemHealth: healthData.healthScore || 100,
      });

      // Update organizations if super admin
      if (isSuperAdmin && statsData.organizations) {
        setOrganizations(statsData.organizations);
      }

      // Update system health
      setSystemHealth(healthData);

      // Update recent activities
      setRecentActivities(activitiesData);

      if (isRefresh) {
        enqueueSnackbar("Dashboard refreshed", { variant: "success" });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      enqueueSnackbar(`Failed to load dashboard: ${error.message}`, {
        variant: "error",
        autoHideDuration: 5000,
      });

      // Fallback data for development
      if (process.env.NODE_ENV === "development") {
        setStats({
          totalAssessments: 47,
          activeUsers: 156,
          totalOrganizations: 12,
          completedAssessments: 324,
          pendingAssessments: 23,
          totalRevenue: 12500,
          activeAssessments: 15,
          totalCandidates: 450,
          averageScore: 78.5,
          systemHealth: 100,
        });
        setSystemHealth({ status: "healthy", healthScore: 100 });
        setRecentActivities([]);
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        stopLoading();
        setLoading(false);
      }
    }
  }, [hasAdminAccess, timeRange, selectedOrganization, isSuperAdmin, startLoading, stopLoading, enqueueSnackbar]);

  // Initial data fetch
  useEffect(() => {
    if (hasAdminAccess) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [hasAdminAccess, fetchDashboardData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!hasAdminAccess) return;

    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        fetchDashboardData(true);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [hasAdminAccess, loading, refreshing, fetchDashboardData]);

  // Event handlers
  const handleRefresh = useCallback(() => {
    if (!loading && !refreshing) {
      fetchDashboardData(true);
    }
  }, [loading, refreshing, fetchDashboardData]);

  const handleQuickAction = useCallback((action) => {
    switch (action) {
      case "create_assessment":
        navigate("/assessments/create");
        break;
      case "add_user":
        navigate("/admin/users/create");
        break;
      case "create_organization":
        navigate("/admin/organizations/create");
        break;
      case "generate_report":
        setShowExportDialog(true);
        break;
      case "system_settings":
        navigate("/admin/settings");
        break;
      default:
        enqueueSnackbar(`Action: ${action}`, { variant: "info" });
    }
  }, [navigate, enqueueSnackbar]);

  const handleExport = useCallback((format) => {
    // Export logic here
    enqueueSnackbar(`Exporting dashboard data as ${format}`, { variant: "info" });
    setShowExportDialog(false);
  }, [enqueueSnackbar]);

  // Stat cards configuration
  const statCards = useMemo(
    () => [
      {
        title: "Total Assessments",
        value: stats.totalAssessments,
        icon: <AssessmentIcon />,
        trend: stats.totalAssessments > 0 ? "up" : "neutral",
        subtitle: `${stats.activeAssessments} active`,
        color: "primary",
        onClick: () => navigate("/admin/assessments"),
      },
      {
        title: "Active Users",
        value: stats.activeUsers,
        icon: <PeopleIcon />,
        trend: stats.activeUsers > 0 ? "up" : "neutral",
        subtitle: `${stats.totalCandidates} candidates`,
        color: "secondary",
        onClick: () => navigate("/admin/users"),
      },
      {
        title: "Organizations",
        value: stats.totalOrganizations,
        icon: <BusinessIcon />,
        trend: "neutral",
        subtitle: "Registered",
        color: "warning",
        onClick: () => navigate("/admin/organizations"),
      },
      {
        title: "Completed",
        value: stats.completedAssessments,
        icon: <CheckCircle />,
        trend: stats.completedAssessments > 0 ? "up" : "neutral",
        subtitle: `${stats.averageScore}% avg score`,
        color: "success",
        onClick: () => navigate("/admin/results"),
      },
      {
        title: "Pending",
        value: stats.pendingAssessments,
        icon: <Timer />,
        trend: stats.pendingAssessments > 0 ? "down" : "neutral",
        subtitle: "Awaiting review",
        color: "info",
        onClick: () => navigate("/admin/pending"),
      },
      {
        title: "Revenue",
        value: `$${stats.totalRevenue.toLocaleString()}`,
        icon: <TrendingUp />,
        trend: stats.totalRevenue > 0 ? "up" : "neutral",
        subtitle: "Total",
        color: "success",
        onClick: () => navigate("/admin/billing"),
      },
    ],
    [stats, navigate]
  );

  // Tabs configuration
  const tabs = [
    { label: "Overview", icon: <DashboardIcon /> },
    { label: "Analytics", icon: <BarChart /> },
    { label: "Organizations", icon: <Business /> },
    { label: "Users", icon: <People /> },
    { label: "System", icon: <Settings /> },
  ];

  if (loading && !refreshing) {
    return <LoadingScreen message="Loading Admin Dashboard..." type="admin" />;
  }

  if (!hasAdminAccess) {
    return (
      <RoleGuard requiredRole="super_admin" showAccessDenied={true}>
        <></>
      </RoleGuard>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: isMobile ? 1 : 3, bgcolor: "background.default" }}>
      {/* Header */}
      <Slide direction="down" in={true}>
        <Box sx={{ mb: 4 }}>
          <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
                  <AdminPanelSettings fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold" gutterBottom={isMobile}>
                    Admin Dashboard
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Chip
                      icon={<VerifiedUser />}
                      label={isSuperAdmin ? "Super Admin" : "Admin"}
                      color="primary"
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Welcome, {currentUser?.name || "Admin"}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh dashboard">
                <IconButton onClick={handleRefresh} disabled={refreshing} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="System health">
                <IconButton onClick={() => setShowHealthDialog(true)} color="info">
                  <Speed />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export data">
                <IconButton onClick={() => setShowExportDialog(true)} color="secondary">
                  <Download />
                </IconButton>
              </Tooltip>
              <Tooltip title="Settings">
                <IconButton onClick={() => navigate("/admin/settings")} color="default">
                  <Settings />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Filters and Controls */}
          <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
            <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="center" justifyContent="space-between">
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {tabs.map((tab, index) => (
                  <Tab key={index} label={tab.label} icon={tab.icon} iconPosition="start" />
                ))}
              </Tabs>

              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Time Range</InputLabel>
                  <Select
                    value={timeRange}
                    label="Time Range"
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <MenuItem value="1d">Last 24 Hours</MenuItem>
                    <MenuItem value="7d">Last 7 Days</MenuItem>
                    <MenuItem value="30d">Last 30 Days</MenuItem>
                    <MenuItem value="90d">Last 90 Days</MenuItem>
                    <MenuItem value="1y">Last Year</MenuItem>
                  </Select>
                </FormControl>

                {isSuperAdmin && organizations.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Organization</InputLabel>
                    <Select
                      value={selectedOrganization}
                      label="Organization"
                      onChange={(e) => setSelectedOrganization(e.target.value)}
                    >
                      <MenuItem value="all">All Organizations</MenuItem>
                      {organizations.map((org) => (
                        <MenuItem key={org.id} value={org.id}>
                          {org.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <IconButton onClick={() => setShowFilters(!showFilters)}>
                  <FilterList />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Slide>

      {/* Loading Indicator */}
      {refreshing && <LinearProgress sx={{ mb: 3 }} />}

      {/* Stats Grid */}
      <Fade in={!loading}>
        <Grid container spacing={isMobile ? 1 : 3} sx={{ mb: 4 }}>
          {statCards.map((card, index) => (
            <Grid item xs={12} sm={6} lg={4} xl={2} key={index}>
              <StatCard {...card} loading={refreshing} />
            </Grid>
          ))}
        </Grid>
      </Fade>

      {/* Main Content Area */}
      <Grid container spacing={isMobile ? 1 : 3}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={isMobile ? 2 : 3}>
            {/* Charts Section */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Assessment Analytics
                </Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={() => setViewMode("grid")}>
                    <GridView color={viewMode === "grid" ? "primary" : "inherit"} />
                  </IconButton>
                  <IconButton size="small" onClick={() => setViewMode("list")}>
                    <ViewList color={viewMode === "list" ? "primary" : "inherit"} />
                  </IconButton>
                </Stack>
              </Stack>

              <ErrorBoundary componentName="Assessment Chart">
                <Suspense fallback={<LoadingFallback message="Loading charts..." />}>
                  <AssessmentChart timeRange={timeRange} organizationId={selectedOrganization} />
                </Suspense>
              </ErrorBoundary>
            </Paper>

            {/* Revenue Chart */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Revenue Overview
              </Typography>
              <ErrorBoundary componentName="Revenue Chart">
                <Suspense fallback={<LoadingFallback message="Loading revenue data..." />}>
                  <RevenueChart timeRange={timeRange} />
                </Suspense>
              </ErrorBoundary>
            </Paper>
          </Stack>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={isMobile ? 2 : 3}>
            {/* System Health */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  System Health
                </Typography>
                <Chip
                  label={`${stats.systemHealth}%`}
                  color={stats.systemHealth > 90 ? "success" : stats.systemHealth > 70 ? "warning" : "error"}
                  variant="outlined"
                />
              </Stack>
              <ErrorBoundary componentName="System Health Monitor">
                <Suspense fallback={<LoadingFallback message="Loading system health..." />}>
                  <SystemHealthMonitor />
                </Suspense>
              </ErrorBoundary>
            </Paper>

            {/* Recent Activities */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Activities
              </Typography>
              <ErrorBoundary componentName="Recent Activities">
                <Suspense fallback={<LoadingFallback message="Loading activities..." />}>
                  <RecentActivities activities={recentActivities} />
                </Suspense>
              </ErrorBoundary>
            </Paper>

            {/* Organization Stats */}
            {isSuperAdmin && (
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Organization Overview
                </Typography>
                <ErrorBoundary componentName="Organization Stats">
                  <Suspense fallback={<LoadingFallback message="Loading organization data..." />}>
                    <OrganizationStats />
                  </Suspense>
                </ErrorBoundary>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* Dialogs */}
      {/* System Health Dialog */}
      <Dialog open={showHealthDialog} onClose={() => setShowHealthDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Speed />
            <Typography>System Health Details</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <ErrorBoundary componentName="System Health Details">
            <Suspense fallback={<LoadingFallback />}>
              <SystemHealthMonitor detailed />
            </Suspense>
          </ErrorBoundary>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHealthDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Dashboard Data</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select label="Export Format" defaultValue="pdf">
                <MenuItem value="pdf">PDF Report</MenuItem>
                <MenuItem value="excel">Excel Spreadsheet</MenuItem>
                <MenuItem value="csv">CSV Data</MenuItem>
                <MenuItem value="json">JSON Data</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select label="Time Range" defaultValue={timeRange}>
                <MenuItem value="1d">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Include charts and graphs"
            />

            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Include raw data"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleExport("pdf")} startIcon={<Download />}>
            Export Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

AdminDashboard.propTypes = {
  // Component uses hooks and context, no external props needed
};
