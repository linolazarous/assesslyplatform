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
import { useSnackbar } from "../../contexts/SnackbarContext"; // assuming your custom SnackbarContext
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
  const [open, setOpen] = useState(false);

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
  // ... your dashboard logic remains the same
  // No props needed, all data is from context/hooks

  return <Box>{/* ...dashboard JSX... */}</Box>;
}

AdminDashboard.propTypes = {};
