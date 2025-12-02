// src/components/admin/UserActivityWidget.jsx
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
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
} from "@mui/icons-material";
import { formatDistanceToNow, format } from "date-fns";
import { fetchUserActivities, fetchUserActivityAnalytics } from "../../api/userActivityApi";
import { useNavigate } from "react-router-dom";

const activityIcons = {
  login: Login,
  logout: Logout,
  assessment_created: Assessment,
  assessment_completed: AssignmentTurnedIn,
  user_created: Person,
  profile_updated: Settings,
  file_downloaded: Download,
  assessment_viewed: Visibility,
  assessment_deleted: Delete,
  assessment_updated: Create,
};

const activityColors = {
  login: "success",
  logout: "default",
  assessment_created: "primary",
  assessment_completed: "success",
  user_created: "info",
  profile_updated: "warning",
  file_downloaded: "secondary",
  assessment_viewed: "info",
  assessment_deleted: "error",
  assessment_updated: "warning",
};

function UserActivityWidget({ 
  limit = 10, 
  organizationId = null, 
  userId = null,
  activityType = null,
  showFilters = true,
  showMetrics = true,
  showViewAll = true,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedUser, setSelectedUser] = useState(userId);
  const [selectedType, setSelectedType] = useState(activityType);
  const [timeRange, setTimeRange] = useState("today");

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit,
        organizationId,
        userId: selectedUser,
        activityType: selectedType,
        timeRange,
      };

      const [activityData, analyticsData] = await Promise.all([
        fetchUserActivities(params),
        showMetrics ? fetchUserActivityAnalytics(params) : Promise.resolve(null),
      ]);

      setActivities(activityData.data || activityData);
      setAnalytics(analyticsData?.data || analyticsData);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load user activities");
      console.error("Error loading user activities:", err);
    } finally {
      setLoading(false);
    }
  }, [limit, organizationId, selectedUser, selectedType, timeRange, showMetrics]);

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
    }
  };

  const handleClearFilters = () => {
    setSelectedUser(null);
    setSelectedType(null);
    setTimeRange("today");
  };

  const getActivityIcon = (type) => {
    const IconComponent = activityIcons[type] || Person;
    const color = activityColors[type] || "default";
    return (
      <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>
        <IconComponent fontSize="small" />
      </Avatar>
    );
  };

  const getActivityDescription = (activity) => {
    const userName = activity.userName || activity.userEmail || "User";
    
    switch (activity.type) {
      case "login":
        return `${userName} logged in`;
      case "logout":
        return `${userName} logged out`;
      case "assessment_created":
        return `${userName} created assessment: ${activity.assessmentName || "Untitled"}`;
      case "assessment_completed":
        return `${userName} completed assessment: ${activity.assessmentName || "Untitled"}`;
      case "assessment_updated":
        return `${userName} updated assessment: ${activity.assessmentName || "Untitled"}`;
      case "assessment_deleted":
        return `${userName} deleted assessment: ${activity.assessmentName || "Untitled"}`;
      case "assessment_viewed":
        return `${userName} viewed assessment: ${activity.assessmentName || "Untitled"}`;
      case "user_created":
        return `${userName} account was created`;
      case "profile_updated":
        return `${userName} updated their profile`;
      case "file_downloaded":
        return `${userName} downloaded ${activity.fileType || "file"}`;
      default:
        return activity.description || activity.title || "User activity";
    }
  };

  const renderActivityMetrics = () => {
    if (!analytics || !showMetrics) return null;

    return (
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Chip 
          label={`Total: ${analytics.totalActivities || activities.length}`}
          color="primary" 
          variant="outlined" 
          size="small"
        />
        <Chip 
          label={`Users: ${analytics.uniqueUsers || new Set(activities.map(a => a.userId)).size}`}
          color="secondary" 
          variant="outlined" 
          size="small"
        />
        <Chip 
          label={`Today: ${analytics.todayCount || activities.filter(a => 
            new Date(a.timestamp).toDateString() === new Date().toDateString()
          ).length}`}
          color="success" 
          variant="outlined" 
          size="small"
        />
        {analytics.mostActiveUser && (
          <Chip 
            label={`Most Active: ${analytics.mostActiveUser}`}
            color="info" 
            variant="outlined" 
            size="small"
          />
        )}
      </Box>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label="Today"
          onClick={() => setTimeRange("today")}
          color={timeRange === "today" ? "primary" : "default"}
          variant={timeRange === "today" ? "filled" : "outlined"}
          size="small"
        />
        <Chip
          label="Week"
          onClick={() => setTimeRange("week")}
          color={timeRange === "week" ? "primary" : "default"}
          variant={timeRange === "week" ? "filled" : "outlined"}
          size="small"
        />
        <Chip
          label="Month"
          onClick={() => setTimeRange("month")}
          color={timeRange === "month" ? "primary" : "default"}
          variant={timeRange === "month" ? "filled" : "outlined"}
          size="small"
        />
        
        {selectedUser && (
          <Chip
            label={`User: ${selectedUser}`}
            onDelete={() => setSelectedUser(null)}
            color="info"
            size="small"
          />
        )}
        
        {selectedType && (
          <Chip
            label={`Type: ${selectedType.replace('_', ' ')}`}
            onDelete={() => setSelectedType(null)}
            color="warning"
            size="small"
          />
        )}
        
        {(selectedUser || selectedType || timeRange !== "today") && (
          <Chip
            label="Clear Filters"
            onClick={handleClearFilters}
            color="error"
            variant="outlined"
            size="small"
          />
        )}
      </Box>
    );
  };

  if (loading && activities.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error && activities.length === 0) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load activities: {error}
        <Button size="small" onClick={loadActivities} sx={{ ml: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!loading && activities.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No user activity found for the selected filters.
        {(selectedUser || selectedType) && (
          <Button size="small" onClick={handleClearFilters} sx={{ ml: 1 }}>
            Clear Filters
          </Button>
        )}
      </Alert>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="primary">
          Recent User Activity
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={loadActivities} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <Settings fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {renderActivityMetrics()}
      {renderFilters()}

      <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
        {activities.map((activity, idx) => {
          const IconComponent = activityIcons[activity.type] || Person;
          const color = activityColors[activity.type] || "default";
          
          return (
            <React.Fragment key={activity.id || idx}>
              <ListItemButton 
                onClick={() => handleActivityClick(activity)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemAvatar>
                  {getActivityIcon(activity.type)}
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {getActivityDescription(activity)}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={activity.type?.replace('_', ' ') || 'activity'}
                        size="small"
                        color={color}
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </Typography>
                      {activity.ipAddress && (
                        <Typography variant="caption" color="text.secondary">
                          • IP: {activity.ipAddress}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
              {idx < activities.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          );
        })}
      </List>

      {showViewAll && (
        <Box textAlign="center" mt={2}>
          <Button 
            variant="outlined" 
            color="primary" 
            size="small"
            onClick={() => navigate("/admin/activities")}
            startIcon={<Visibility />}
          >
            View All Activities
          </Button>
        </Box>
      )}

      {autoRefresh && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Auto-refresh every {refreshInterval / 1000} seconds
        </Typography>
      )}
    </Paper>
  );
}

UserActivityWidget.propTypes = {
  /** Number of activities to display */
  limit: PropTypes.number,
  /** Filter by organization ID for multitenancy */
  organizationId: PropTypes.string,
  /** Filter by specific user ID */
  userId: PropTypes.string,
  /** Filter by activity type */
  activityType: PropTypes.string,
  /** Show filter chips */
  showFilters: PropTypes.bool,
  /** Show activity metrics */
  showMetrics: PropTypes.bool,
  /** Show "View All" button */
  showViewAll: PropTypes.bool,
  /** Auto-refresh data */
  autoRefresh: PropTypes.bool,
  /** Auto-refresh interval in milliseconds */
  refreshInterval: PropTypes.number,
};

UserActivityWidget.defaultProps = {
  limit: 10,
  organizationId: null,
  userId: null,
  activityType: null,
  showFilters: true,
  showMetrics: true,
  showViewAll: true,
  autoRefresh: true,
  refreshInterval: 30000,
};

export default React.memo(UserActivityWidget);
