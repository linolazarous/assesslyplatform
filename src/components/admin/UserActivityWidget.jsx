// src/components/admin/UserActivityWidget.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  Button,
  List,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
} from "@mui/material";
import {
  Person,
  Assessment,
  AssignmentTurnedIn,
  Login,
  Logout,
  Create,
  Delete,
  Settings,
  Download,
  Visibility,
  Refresh,
  FilterList,
  ClearAll,
  History,
} from "@mui/icons-material";
import { formatDistanceToNow, format } from "date-fns";
import userActivityAPI from "../../api/userActivityApi";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../../contexts/SnackbarContext";

// Activity configuration for consistent mapping
const ACTIVITY_CONFIG = {
  login: { 
    icon: Login, 
    color: "success", 
    label: "Login",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} logged in`
  },
  logout: { 
    icon: Logout, 
    color: "default", 
    label: "Logout",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} logged out`
  },
  assessment_created: { 
    icon: Assessment, 
    color: "primary", 
    label: "Assessment Created",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} created assessment: ${activity.assessmentName || "Untitled"}`
  },
  assessment_completed: { 
    icon: AssignmentTurnedIn, 
    color: "success", 
    label: "Assessment Completed",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} completed assessment: ${activity.assessmentName || "Untitled"}`
  },
  assessment_updated: { 
    icon: Create, 
    color: "warning", 
    label: "Assessment Updated",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} updated assessment: ${activity.assessmentName || "Untitled"}`
  },
  assessment_deleted: { 
    icon: Delete, 
    color: "error", 
    label: "Assessment Deleted",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} deleted assessment: ${activity.assessmentName || "Untitled"}`
  },
  assessment_viewed: { 
    icon: Visibility, 
    color: "info", 
    label: "Assessment Viewed",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} viewed assessment: ${activity.assessmentName || "Untitled"}`
  },
  user_created: { 
    icon: Person, 
    color: "info", 
    label: "User Created",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} account was created`
  },
  profile_updated: { 
    icon: Settings, 
    color: "warning", 
    label: "Profile Updated",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} updated their profile`
  },
  file_downloaded: { 
    icon: Download, 
    color: "secondary", 
    label: "File Downloaded",
    description: (activity) => `${activity.userName || activity.userEmail || "User"} downloaded ${activity.fileType || "file"}`
  },
};

const TIME_RANGE_OPTIONS = [
  { value: "1h", label: "Last Hour" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
];

/**
 * User Activity Widget Component
 * Displays recent user activities with filtering and analytics for multi-tenant monitoring
 */
function UserActivityWidget({ 
  limit = 10, 
  organizationId = null, 
  userId = null,
  activityType = null,
  showFilters = true,
  showMetrics = true,
  showViewAll = true,
  autoRefresh = false,
  refreshInterval = 30000,
  compact = false,
  elevation = 0,
}) {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedUser, setSelectedUser] = useState(userId);
  const [selectedType, setSelectedType] = useState(activityType);
  const [timeRange, setTimeRange] = useState("today");
  const [lastUpdated, setLastUpdated] = useState(null);

  const activityTypes = useMemo(() => 
    Object.entries(ACTIVITY_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
      icon: config.icon,
      color: config.color,
    })), 
  []);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {
        limit,
        organizationId,
        userId: selectedUser,
        activityType: selectedType,
        timeRange,
        includeUserDetails: true,
      };

      const [activityResponse, analyticsResponse] = await Promise.all([
        fetchUserActivities(params),
        showMetrics ? fetchUserActivityAnalytics(params) : Promise.resolve(null),
      ]);

      // Handle API response format
      if (activityResponse.success) {
        setActivities(activityResponse.data?.activities || activityResponse.data || []);
      } else {
        throw new Error(activityResponse.message || "Failed to load activities");
      }

      if (analyticsResponse?.success) {
        setAnalytics(analyticsResponse.data);
      }

      setError(null);
      setLastUpdated(new Date());
      
      if (activityResponse.data?.activities?.length === 0 && !selectedUser && !selectedType) {
        showSnackbar("No recent activities found", "info");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to load user activities";
      setError(errorMessage);
      showSnackbar(errorMessage, "error");
      console.error("Error loading user activities:", err);
    } finally {
      setLoading(false);
    }
  }, [limit, organizationId, selectedUser, selectedType, timeRange, showMetrics, showSnackbar]);

  useEffect(() => {
    loadActivities();

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(loadActivities, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loadActivities, autoRefresh, refreshInterval]);

  const handleActivityClick = (activity) => {
    if (activity.assessmentId) {
      navigate(`/admin/assessments/${activity.assessmentId}`);
    } else if (activity.userId && activity.userId !== selectedUser) {
      setSelectedUser(activity.userId);
      showSnackbar(`Filtered to user: ${activity.userName || activity.userId}`, "info");
    }
  };

  const handleClearFilters = () => {
    setSelectedUser(null);
    setSelectedType(null);
    setTimeRange("today");
    showSnackbar("Filters cleared", "info");
  };

  const getActivityConfig = (type) => {
    return ACTIVITY_CONFIG[type] || { 
      icon: Person, 
      color: "default", 
      label: type?.replace('_', ' ') || 'Activity',
      description: (activity) => activity.description || activity.title || "User activity"
    };
  };

  const renderActivityMetrics = () => {
    if (!analytics || !showMetrics) return null;

    const metrics = [
      { 
        label: "Total Activities", 
        value: analytics.totalActivities || activities.length,
        color: "primary",
        icon: <History fontSize="small" />
      },
      { 
        label: "Active Users", 
        value: analytics.uniqueUsers || new Set(activities.map(a => a.userId)).size,
        color: "success",
        icon: <Person fontSize="small" />
      },
      { 
        label: "Assessments", 
        value: analytics.assessmentActivities || activities.filter(a => a.type?.includes('assessment')).length,
        color: "info",
        icon: <Assessment fontSize="small" />
      },
      { 
        label: "Most Active", 
        value: analytics.mostActiveUser || "N/A",
        color: "warning",
        icon: <Person fontSize="small" />
      },
    ];

    return (
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card 
              variant="outlined" 
              sx={{ 
                p: 1, 
                height: '100%',
                borderColor: `${metric.color}.light`,
                bgcolor: alpha(theme => theme.palette[metric.color].light, 0.1),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: `${metric.color}.light`, 
                    color: `${metric.color}.dark`,
                    width: 30, 
                    height: 30 
                  }}
                >
                  {metric.icon}
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {metric.label}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color={`${metric.color}.dark`}>
                    {metric.value}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    const hasFilters = selectedUser || selectedType || timeRange !== "today";

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FilterList fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            Filter Activities
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
              size="small"
            >
              {TIME_RANGE_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Activity Type</InputLabel>
            <Select
              value={selectedType || ""}
              label="Activity Type"
              onChange={(e) => setSelectedType(e.target.value || null)}
              size="small"
            >
              <MenuItem value="">All Types</MenuItem>
              {activityTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <type.icon fontSize="small" color={type.color} />
                    {type.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {hasFilters && (
            <Tooltip title="Clear all filters">
              <Button
                size="small"
                onClick={handleClearFilters}
                startIcon={<ClearAll />}
                variant="outlined"
                color="inherit"
              >
                Clear
              </Button>
            </Tooltip>
          )}

          {selectedUser && (
            <Chip
              label={`User: ${selectedUser}`}
              onDelete={() => setSelectedUser(null)}
              color="info"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>
    );
  };

  const renderActivityItem = (activity, index) => {
    const config = getActivityConfig(activity.type);
    const IconComponent = config.icon;
    const description = config.description(activity);
    const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
    const exactTime = format(new Date(activity.timestamp), 'PPpp');

    return (
      <React.Fragment key={activity.id || activity._id || index}>
        <ListItemButton 
          onClick={() => handleActivityClick(activity)}
          sx={{
            borderRadius: 1,
            py: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ListItemAvatar>
            <Avatar 
              sx={{ 
                bgcolor: `${config.color}.light`, 
                color: `${config.color}.dark`,
                width: 36, 
                height: 36 
              }}
            >
              <IconComponent fontSize="small" />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                {description}
              </Typography>
            }
            secondary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={config.label}
                  size="small"
                  color={config.color}
                  variant="outlined"
                />
                <Tooltip title={exactTime}>
                  <Typography variant="caption" color="text.secondary">
                    {timeAgo}
                  </Typography>
                </Tooltip>
                {activity.ipAddress && (
                  <Typography variant="caption" color="text.secondary">
                    • IP: {activity.ipAddress}
                  </Typography>
                )}
                {activity.organizationName && (
                  <Typography variant="caption" color="text.secondary">
                    • Org: {activity.organizationName}
                  </Typography>
                )}
              </Box>
            }
            secondaryTypographyProps={{ component: 'div' }}
          />
        </ListItemButton>
        {index < activities.length - 1 && <Divider variant="inset" component="li" />}
      </React.Fragment>
    );
  };

  const renderEmptyState = () => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      py: 4,
      textAlign: 'center'
    }}>
      <History sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
      <Typography variant="body1" color="text.secondary" gutterBottom>
        No activities found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {selectedUser || selectedType || timeRange !== "today" 
          ? "Try adjusting your filters" 
          : "User activities will appear here"}
      </Typography>
      {(selectedUser || selectedType || timeRange !== "today") && (
        <Button
          size="small"
          onClick={handleClearFilters}
          startIcon={<ClearAll />}
        >
          Clear Filters
        </Button>
      )}
    </Box>
  );

  const renderErrorState = () => (
    <Alert 
      severity="error" 
      sx={{ my: 2 }}
      action={
        <Button 
          color="inherit" 
          size="small" 
          onClick={loadActivities}
          disabled={loading}
        >
          Retry
        </Button>
      }
    >
      <Typography variant="body2">
        Failed to load activities
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {error}
      </Typography>
    </Alert>
  );

  const renderLoadingState = () => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      py: 4 
    }}>
      <CircularProgress size={32} sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        Loading user activities...
      </Typography>
    </Box>
  );

  return (
    <Card 
      elevation={elevation}
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: elevation === 0 ? 1 : 0,
        borderColor: 'divider',
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History color="primary" />
            <Typography variant="h6">
              User Activity
            </Typography>
          </Box>
        }
        subheader={compact ? null : "Recent user actions and system events"}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastUpdated && !compact && (
              <Tooltip title={`Last updated: ${format(lastUpdated, 'PPpp')}`}>
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </Typography>
              </Tooltip>
            )}
            <Tooltip title="Refresh activities">
              <IconButton 
                size="small" 
                onClick={loadActivities} 
                disabled={loading}
                color="primary"
              >
                {loading ? <CircularProgress size={20} /> : <Refresh />}
              </IconButton>
            </Tooltip>
          </Box>
        }
        sx={{ pb: showFilters || showMetrics ? 1 : 2 }}
      />
      
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pt: 0 }}>
        {showMetrics && renderActivityMetrics()}
        {showFilters && renderFilters()}

        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {loading && activities.length === 0 ? (
            renderLoadingState()
          ) : error && activities.length === 0 ? (
            renderErrorState()
          ) : activities.length === 0 ? (
            renderEmptyState()
          ) : (
            <List 
              dense={!compact}
              sx={{ 
                maxHeight: compact ? 300 : 400, 
                overflow: 'auto',
                pr: 1,
                '&::-webkit-scrollbar': {
                  width: 6,
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: theme => theme.palette.divider,
                  borderRadius: 3,
                },
              }}
            >
              {activities.map(renderActivityItem)}
            </List>
          )}
        </Box>

        {showViewAll && activities.length > 0 && (
          <Box sx={{ 
            pt: 2, 
            borderTop: 1, 
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="caption" color="text.secondary">
              Showing {activities.length} of {analytics?.totalActivities || 'many'} activities
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              size="small"
              onClick={() => navigate("/admin/activities")}
              startIcon={<Visibility />}
            >
              View All
            </Button>
          </Box>
        )}

        {autoRefresh && !compact && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            Auto-refresh: {refreshInterval / 1000}s interval
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

UserActivityWidget.propTypes = {
  /** Number of activities to display */
  limit: PropTypes.number,
  /** Organization ID for multi-tenant filtering (null for super admin) */
  organizationId: PropTypes.string,
  /** Filter by specific user ID */
  userId: PropTypes.string,
  /** Filter by activity type */
  activityType: PropTypes.string,
  /** Show filter controls */
  showFilters: PropTypes.bool,
  /** Show analytics metrics */
  showMetrics: PropTypes.bool,
  /** Show "View All" button */
  showViewAll: PropTypes.bool,
  /** Enable auto-refresh of data */
  autoRefresh: PropTypes.bool,
  /** Auto-refresh interval in milliseconds */
  refreshInterval: PropTypes.number,
  /** Compact mode for dashboard widgets */
  compact: PropTypes.bool,
  /** Card elevation level */
  elevation: PropTypes.number,
};

UserActivityWidget.defaultProps = {
  limit: 10,
  organizationId: null,
  userId: null,
  activityType: null,
  showFilters: true,
  showMetrics: true,
  showViewAll: true,
  autoRefresh: false,
  refreshInterval: 30000,
  compact: false,
  elevation: 0,
};

export default React.memo(UserActivityWidget);
