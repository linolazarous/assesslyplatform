// src/pages/Admin/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import PropTypes from "prop-types";
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
  Chip,
  Card,
  CardContent,
  Stack,
  Tabs,
  Tab,
  Avatar,
  Tooltip,
  Fade,
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  MenuItem,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  CheckCircle,
  Timer,
  TrendingUp,
  GridView,
  ViewList,
  AdminPanelSettings,
  VerifiedUser,
  Settings,
  Add,
  BarChart,
  Download,
  Speed,
  ArrowDropUp,
  ArrowDropDown,
  Error,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useSnackbar } from "../../contexts/SnackbarContext";
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

// Loading fallback component
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

LoadingFallback.propTypes = {
  message: PropTypes.string,
};

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

ErrorBoundary.propTypes = {
  componentName: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

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
        "&:hover": onClick ? { transform: "translateY(-4px)", boxShadow: 6 } : {},
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
                  {trendInfo.icon && <Box component="span" sx={{ ml: 1, verticalAlign: "middle" }}>{trendInfo.icon}</Box>}
                </>
              )}
            </Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 48, height: 48 }}>{icon}</Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
});

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.node.isRequired,
  loading: PropTypes.bool,
  trend: PropTypes.oneOf(["up", "down", "neutral"]),
  subtitle: PropTypes.string,
  color: PropTypes.string,
  onClick: PropTypes.func,
};

// Quick Actions Component
const QuickActions = ({ onAction }) => {
  const actions = [
    { icon: <Add />, name: "Create Assessment", action: "create_assessment", color: "primary" },
    { icon: <PeopleIcon />, name: "Add User", action: "add_user", color: "secondary" },
    { icon: <BusinessIcon />, name: "Create Organization", action: "create_organization", color: "warning" },
    { icon: <BarChart />, name: "Generate Report", action: "generate_report", color: "info" },
    { icon: <Settings />, name: "System Settings", action: "system_settings", color: "default" },
  ];

  return (
    <Box sx={{ position: "fixed", bottom: 32, right: 32, zIndex: 1500 }}>
      {actions.map((action) => (
        <Button
          key={action.action}
          variant="contained"
          sx={{ bgcolor: `${action.color}.main`, color: "#fff", mr: 1, mb: 1 }}
          onClick={() => onAction(action.action)}
        >
          {action.icon} {action.name}
        </Button>
      ))}
    </Box>
  );
};

QuickActions.propTypes = {
  onAction: PropTypes.func.isRequired,
};

export default function AdminDashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { currentUser, currentOrganization, isSuperAdmin } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { startLoading, stopLoading, isLoading } = useLoading(false, {
    timeout: 15000,
    onError: (error) => showSnackbar(`Dashboard error: ${error.message}`, "error"),
  });

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalUsers: 0,
    totalAssessments: 0,
    activeAssessments: 0,
    pendingReviews: 0,
    systemHealth: 100,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemHealth, setSystemHealth] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [filterPeriod, setFilterPeriod] = useState("today");

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    startLoading("Loading dashboard data...");
    try {
      const [statsData, healthData, activitiesData] = await Promise.all([
        fetchAdminStats(filterPeriod),
        fetchSystemHealth(),
        fetchRecentActivities(),
      ]);

      setStats(statsData);
      setSystemHealth(healthData);
      setRecentActivities(activitiesData);
      stopLoading("success", null, "Dashboard data loaded");
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      stopLoading("error", error, "Failed to load dashboard data");
    }
  }, [filterPeriod, startLoading, stopLoading]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchDashboardData();
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchDashboardData]);

  // Handle quick actions
  const handleQuickAction = useCallback((action) => {
    switch (action) {
      case "create_assessment":
        navigate("/assessments/create");
        break;
      case "add_user":
        navigate("/users/create");
        break;
      case "create_organization":
        navigate("/organizations/create");
        break;
      case "generate_report":
        showSnackbar("Report generation started", "info");
        break;
      case "system_settings":
        navigate("/admin/settings");
        break;
      default:
        showSnackbar(`Action ${action} not implemented`, "warning");
    }
  }, [navigate, showSnackbar]);

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(prev => prev === "grid" ? "list" : "grid");
  };

  // env.MODE
  if (import.meta.env.MODE === "development") {
  console.log("Development mode - showing debug info");
  }
  if (isLoading) {
    return <LoadingScreen message="Loading admin dashboard..." type="data" fullScreen={false} />;
  }

  return (
    <RoleGuard requiredRole="super_admin">
      <Box sx={{ p: isMobile ? 2 : 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Admin Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage platform-wide statistics, organizations, and system health
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchDashboardData}
                disabled={isLoading}
              >
                Refresh
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto-refresh"
              />
              <IconButton onClick={toggleViewMode}>
                {viewMode === "grid" ? <ViewList /> : <GridView />}
              </IconButton>
            </Stack>
          </Stack>

          {/* User/Organization info */}
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={`Super Admin: ${currentUser?.name || "User"}`}
                icon={<AdminPanelSettings />}
                color="primary"
                variant="outlined"
              />
              {currentOrganization && (
                <Chip
                  label={`Organization: ${currentOrganization.name}`}
                  icon={<BusinessIcon />}
                  color="secondary"
                  variant="outlined"
                />
              )}
              <Chip
                label={`View: ${viewMode === "grid" ? "Grid" : "List"}`}
                color="default"
                variant="outlined"
              />
            </Stack>
          </Box>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 4, borderRadius: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Overview" />
            <Tab label="Organizations" />
            <Tab label="Assessments" />
            <Tab label="Users" />
            <Tab label="System Health" />
            <Tab label="Analytics" />
          </Tabs>
        </Paper>

        {/* Main Content */}
        <Box sx={{ mb: 4 }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* Stats Cards */}
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <StatCard
                  title="Organizations"
                  value={stats.totalOrganizations}
                  icon={<BusinessIcon />}
                  color="primary"
                  trend="up"
                  subtitle="Active organizations"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <StatCard
                  title="Users"
                  value={stats.totalUsers}
                  icon={<PeopleIcon />}
                  color="secondary"
                  trend="up"
                  subtitle="Registered users"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <StatCard
                  title="Assessments"
                  value={stats.totalAssessments}
                  icon={<AssessmentIcon />}
                  color="warning"
                  trend="up"
                  subtitle="Total assessments"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <StatCard
                  title="System Health"
                  value={`${stats.systemHealth}%`}
                  icon={<CheckCircle />}
                  color={stats.systemHealth > 90 ? "success" : stats.systemHealth > 70 ? "warning" : "error"}
                  trend="neutral"
                  subtitle="Overall system status"
                />
              </Grid>

              {/* Charts and Widgets */}
              <Grid item xs={12} lg={8}>
                <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
                  <Typography variant="h6" gutterBottom>
                    Assessment Analytics
                  </Typography>
                  <ErrorBoundary componentName="AssessmentChart">
                    <Suspense fallback={<LoadingFallback message="Loading chart..." />}>
                      <AssessmentChart period={filterPeriod} />
                    </Suspense>
                  </ErrorBoundary>
                </Paper>
              </Grid>
              <Grid item xs={12} lg={4}>
                <Paper sx={{ p: 3, borderRadius: 2, height: "100%" }}>
                  <Typography variant="h6" gutterBottom>
                    System Health
                  </Typography>
                  <ErrorBoundary componentName="SystemHealthMonitor">
                    <Suspense fallback={<LoadingFallback message="Loading system health..." />}>
                      <SystemHealthMonitor data={systemHealth} />
                    </Suspense>
                  </ErrorBoundary>
                </Paper>
              </Grid>

              {/* Recent Activities */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Recent Activities
                  </Typography>
                  <ErrorBoundary componentName="RecentActivities">
                    <Suspense fallback={<LoadingFallback message="Loading activities..." />}>
                      <RecentActivities activities={recentActivities} />
                    </Suspense>
                  </ErrorBoundary>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Other tabs would have their own content here */}
          {activeTab !== 0 && (
            <Paper sx={{ p: 3, borderRadius: 2, minHeight: 400 }}>
              <Typography variant="h6" gutterBottom>
                Tab {activeTab + 1} Content
              </Typography>
              <Typography color="text.secondary">
                This tab content would be loaded based on the active tab selection.
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Quick Actions */}
        {isSuperAdmin && <QuickActions onAction={handleQuickAction} />}
      </Box>
    </RoleGuard>
  );
}

AdminDashboard.propTypes = {
  // Add any props if needed
};
