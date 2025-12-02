// src/components/admin/RecentActivities.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  Badge,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  History,
  Refresh,
  FilterList,
  ClearAll,
  Visibility,
  Person,
  Assessment,
  AssignmentTurnedIn,
  Settings,
  Download,
  Create,
  Delete,
  Login,
  Logout,
  Error as ErrorIcon,
  Warning,
  Info,
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';
import { fetchRecentActivities, fetchActivitySummary } from '../../api/activityApi';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useNavigate } from 'react-router-dom';

/**
 * Recent Activities Component
 * Displays real-time user and system activities with filtering and analytics
 */
export default function RecentActivities({ 
  limit = 15,
  organizationId = null,
  activityType = null,
  userId = null,
  showFilters = true,
  showSummary = true,
  showViewAll = true,
  compact = false,
  elevation = 1,
  autoRefresh = false,
  refreshInterval = 45000,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState(activityType);
  const [selectedUser, setSelectedUser] = useState(userId);
  const [timeRange, setTimeRange] = useState('today');
  const [lastUpdated, setLastUpdated] = useState(null);

  const activityTypes = useMemo(() => [
    { value: 'all', label: 'All Activities', icon: History, color: 'default' },
    { value: 'assessment_created', label: 'Assessment Created', icon: Assessment, color: 'primary' },
    { value: 'assessment_completed', label: 'Assessment Completed', icon: AssignmentTurnedIn, color: 'success' },
    { value: 'assessment_updated', label: 'Assessment Updated', icon: Create, color: 'warning' },
    { value: 'assessment_deleted', label: 'Assessment Deleted', icon: Delete, color: 'error' },
    { value: 'user_login', label: 'User Login', icon: Login, color: 'info' },
    { value: 'user_logout', label: 'User Logout', icon: Logout, color: 'default' },
    { value: 'user_created', label: 'User Created', icon: Person, color: 'success' },
    { value: 'profile_updated', label: 'Profile Updated', icon: Settings, color: 'warning' },
    { value: 'file_downloaded', label: 'File Downloaded', icon: Download, color: 'secondary' },
    { value: 'error_occurred', label: 'Error Occurred', icon: ErrorIcon, color: 'error' },
    { value: 'system_warning', label: 'System Warning', icon: Warning, color: 'warning' },
    { value: 'system_info', label: 'System Info', icon: Info, color: 'info' },
  ], []);

  const timeRangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const getActivityConfig = (type) => {
    const config = activityTypes.find(t => t.value === type);
    return config || { label: type?.replace('_', ' ') || 'Activity', icon: History, color: 'default' };
  };

  const getActivityDescription = (activity) => {
    const userName = activity.userName || activity.userEmail || 'System';
    const orgName = activity.organizationName ? ` (${activity.organizationName})` : '';
    
    switch (activity.type) {
      case 'assessment_created':
        return `${userName}${orgName} created assessment "${activity.assessmentName || 'Untitled'}"`;
      case 'assessment_completed':
        return `${userName}${orgName} completed assessment "${activity.assessmentName || 'Untitled'}" with score ${activity.score || 'N/A'}`;
      case 'assessment_updated':
        return `${userName}${orgName} updated assessment "${activity.assessmentName || 'Untitled'}"`;
      case 'assessment_deleted':
        return `${userName}${orgName} deleted assessment "${activity.assessmentName || 'Untitled'}"`;
      case 'user_login':
        return `${userName}${orgName} logged in from ${activity.ipAddress || 'unknown location'}`;
      case 'user_logout':
        return `${userName}${orgName} logged out`;
      case 'user_created':
        return `New user account created for ${userName}${orgName}`;
      case 'profile_updated':
        return `${userName}${orgName} updated their profile`;
      case 'file_downloaded':
        return `${userName}${orgName} downloaded ${activity.fileName || 'a file'}`;
      case 'error_occurred':
        return `Error: ${activity.errorMessage || 'An error occurred'}`;
      case 'system_warning':
        return `Warning: ${activity.message || 'System warning'}`;
      case 'system_info':
        return `Info: ${activity.message || 'System information'}`;
      default:
        return activity.description || activity.message || 'Activity recorded';
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      const params = {
        limit,
        organizationId,
        activityType: selectedType === 'all' ? null : selectedType,
        userId: selectedUser,
        timeRange,
      };

      const [activitiesResponse, summaryResponse] = await Promise.all([
        fetchRecentActivities(params),
        showSummary ? fetchActivitySummary(params) : Promise.resolve(null),
      ]);

      if (activitiesResponse.success) {
        setActivities(activitiesResponse.data?.activities || activitiesResponse.data || []);
      } else {
        throw new Error(activitiesResponse.message || 'Failed to load recent activities');
      }

      if (summaryResponse?.success) {
        setSummary(summaryResponse.data);
      }

      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load recent activities';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
      console.error('Error loading recent activities:', err);
    } finally {
      setLoading(false);
    }
  };

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
  }, [organizationId, selectedType, selectedUser, timeRange, autoRefresh, refreshInterval]);

  const handleActivityClick = (activity) => {
    if (activity.assessmentId) {
      navigate(`/admin/assessments/${activity.assessmentId}`);
    } else if (activity.userId && activity.userId !== selectedUser) {
      setSelectedUser(activity.userId);
      showSnackbar(`Filtered to user: ${activity.userName || activity.userId}`, 'info');
    }
  };

  const handleClearFilters = () => {
    setSelectedType(null);
    setSelectedUser(null);
    setTimeRange('today');
    showSnackbar('All filters cleared', 'info');
  };

  const renderSummaryCards = () => {
    if (!summary || !showSummary) return null;

    const summaryMetrics = [
      { 
        title: 'Total Activities', 
        value: summary.totalActivities || activities.length,
        color: 'primary',
        icon: History,
      },
      { 
        title: 'Active Users', 
        value: summary.uniqueUsers || new Set(activities.map(a => a.userId)).size,
        color: 'success',
        icon: Person,
      },
      { 
        title: 'Assessments', 
        value: summary.assessmentActivities || activities.filter(a => a.type?.includes('assessment')).length,
        color: 'info',
        icon: Assessment,
      },
      { 
        title: 'Errors', 
        value: summary.errorActivities || activities.filter(a => a.type === 'error_occurred').length,
        color: 'error',
        icon: ErrorIcon,
      },
    ];

    return (
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {summaryMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Grid item xs={6} sm={3} key={index}>
              <Card 
                variant="outlined" 
                sx={{ 
                  p: 1,
                  borderColor: `${metric.color}.light`,
                  bgcolor: alpha(theme.palette[metric.color].light, 0.1),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: `${metric.color}.light`, 
                      color: `${metric.color}.dark`,
                      width: 32, 
                      height: 32 
                    }}
                  >
                    <Icon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="bold" color={`${metric.color}.dark`}>
                      {metric.value.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {metric.title}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    const hasFilters = selectedType || selectedUser || timeRange !== 'today';

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              {timeRangeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Activity Type</InputLabel>
            <Select
              value={selectedType || ''}
              label="Activity Type"
              onChange={(e) => setSelectedType(e.target.value || null)}
            >
              <MenuItem value="">All Types</MenuItem>
              {activityTypes
                .filter(type => type.value !== 'all')
                .map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <type.icon fontSize="small" />
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {hasFilters && (
            <Button
              size="small"
              onClick={handleClearFilters}
              startIcon={<ClearAll />}
              variant="outlined"
              color="inherit"
            >
              Clear Filters
            </Button>
          )}
        </Box>

        {selectedUser && (
          <Chip
            label={`User: ${selectedUser}`}
            onDelete={() => setSelectedUser(null)}
            color="info"
            size="small"
            sx={{ mb: 1 }}
          />
        )}
      </Box>
    );
  };

  const renderActivityItem = (activity, index) => {
    const config = getActivityConfig(activity.type);
    const Icon = config.icon;
    const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
    const exactTime = format(new Date(activity.timestamp), 'PPpp');
    const description = getActivityDescription(activity);

    return (
      <React.Fragment key={activity.id || activity._id || index}>
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
            <Badge
              color={config.color}
              variant="dot"
              overlap="circular"
              invisible={!activity.isImportant}
              anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: `${config.color}.light`, 
                  color: `${config.color}.dark`,
                  width: 40,
                  height: 40,
                }}
              >
                <Icon />
              </Avatar>
            </Badge>
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
                {activity.organizationName && !organizationId && (
                  <Typography variant="caption" color="text.secondary">
                    • {activity.organizationName}
                  </Typography>
                )}
              </Box>
            }
            secondaryTypographyProps={{ component: 'div' }}
          />
        </ListItemButton>
        
        {index < activities.length - 1 && (
          <Divider variant="inset" component="li" />
        )}
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
      <Typography variant="body2" color="text.secondary">
        {selectedType || selectedUser || timeRange !== 'today' 
          ? 'Try adjusting your filters' 
          : 'Activities will appear here as they occur'}
      </Typography>
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
        Loading recent activities...
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
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: compact ? 2 : 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History />
              Recent Activities
            </Typography>
            {!compact && (
              <Typography variant="body2" color="text.secondary">
                Real-time monitoring of user and system activities
              </Typography>
            )}
          </Box>
          
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
        </Box>

        {showSummary && renderSummaryCards()}
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
              dense={compact}
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
                  background: theme.palette.divider,
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
            mt: 2, 
            borderTop: 1, 
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="caption" color="text.secondary">
              Showing {activities.length} activities
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              size="small"
              onClick={() => navigate('/admin/activities')}
              startIcon={<Visibility />}
            >
              View All
            </Button>
          </Box>
        )}

        {autoRefresh && !compact && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            Auto-refresh: {refreshInterval / 1000}s interval
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

RecentActivities.propTypes = {
  /** Number of activities to display */
  limit: PropTypes.number,
  /** Organization ID for multi-tenant filtering */
  organizationId: PropTypes.string,
  /** Filter by activity type */
  activityType: PropTypes.string,
  /** Filter by user ID */
  userId: PropTypes.string,
  /** Show filter controls */
  showFilters: PropTypes.bool,
  /** Show activity summary cards */
  showSummary: PropTypes.bool,
  /** Show "View All" button */
  showViewAll: PropTypes.bool,
  /** Compact mode for dashboard widgets */
  compact: PropTypes.bool,
  /** Card elevation level */
  elevation: PropTypes.number,
  /** Enable auto-refresh */
  autoRefresh: PropTypes.bool,
  /** Auto-refresh interval in milliseconds */
  refreshInterval: PropTypes.number,
};

RecentActivities.defaultProps = {
  limit: 15,
  organizationId: null,
  activityType: null,
  userId: null,
  showFilters: true,
  showSummary: true,
  showViewAll: true,
  compact: false,
  elevation: 1,
  autoRefresh: false,
  refreshInterval: 45000,
};
