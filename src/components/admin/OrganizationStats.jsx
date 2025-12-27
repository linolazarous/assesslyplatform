// src/components/admin/OrganizationStats.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  alpha,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  Business,
  People,
  Assessment,
  TrendingUp,
  TrendingDown,
  Equalizer,
  Refresh,
  Download,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fetchOrganizationStats, fetchOrganizationGrowth } from '../../api/organizationApi';
import { useSnackbar } from '../../contexts/SnackbarContext';

/**
 * Organization Statistics Dashboard Component
 * Displays comprehensive organization metrics for multi-tenant B2B SaaS platform
 */
export default function OrganizationStats({ 
  organizationId = null, 
  timeRange = '30d',
  compareToPrevious = true,
  showGrowth = true,
  compact = false,
  autoRefresh = false,
  refreshInterval = 60000,
}) {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [stats, setStats] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      const params = {
        organizationId,
        timeRange,
        includeGrowth: showGrowth,
      };

      const [statsResponse, growthResponse] = await Promise.all([
        fetchOrganizationStats(params),
        showGrowth ? fetchOrganizationGrowth(params) : Promise.resolve(null),
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      } else {
        throw new Error(statsResponse.message || 'Failed to load organization statistics');
      }

      if (growthResponse?.success) {
        setGrowth(growthResponse.data);
      }

      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load organization statistics';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
      console.error('Error loading organization stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(loadStats, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [organizationId, timeRange, autoRefresh, refreshInterval]);

  const handleExportData = () => {
    if (!stats) return;
    
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        organizationId,
        timeRange,
        stats,
        growth,
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const fileName = `organization-stats-${organizationId || 'all'}-${format(new Date(), 'yyyy-MM-dd')}.json`;
      
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = fileName;
      link.click();
      
      showSnackbar('Organization stats exported successfully', 'success');
    } catch (err) {
      showSnackbar('Failed to export organization stats', 'error');
      console.error('Export failed:', err);
    }
  };

  const statsCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: 'Active Organizations',
        value: stats.activeOrganizations || 0,
        total: stats.totalOrganizations || 0,
        icon: Business,
        color: 'primary',
        growth: growth?.organizationsGrowth || 0,
        tooltip: 'Number of active vs total organizations',
      },
      {
        title: 'Total Users',
        value: stats.totalUsers || 0,
        active: stats.activeUsers || 0,
        icon: People,
        color: 'success',
        growth: growth?.usersGrowth || 0,
        tooltip: 'Total users vs active users',
      },
      {
        title: 'Active Assessments',
        value: stats.activeAssessments || 0,
        total: stats.totalAssessments || 0,
        icon: Assessment,
        color: 'info',
        growth: growth?.assessmentsGrowth || 0,
        tooltip: 'Active vs total assessments',
      },
      {
        title: 'Assessment Completions',
        value: stats.completedAssessments || 0,
        rate: stats.completionRate ? `${Math.round(stats.completionRate * 100)}%` : '0%',
        icon: Equalizer,
        color: 'warning',
        growth: growth?.completionsGrowth || 0,
        tooltip: 'Completed assessments and completion rate',
      },
    ];
  }, [stats, growth]);

  const renderStatCard = (stat, index) => {
    const Icon = stat.icon;
    const isPositive = stat.growth >= 0;
    const growthIcon = isPositive ? <ArrowUpward fontSize="inherit" /> : <ArrowDownward fontSize="inherit" />;
    const growthColor = isPositive ? 'success' : 'error';

    return (
      <Grid item xs={12} sm={6} md={3} key={index}>
        <Card 
          sx={{ 
            height: '100%',
            border: `1px solid ${alpha(theme.palette[stat.color].main, 0.2)}`,
            '&:hover': {
              boxShadow: theme.shadows[2],
              borderColor: theme.palette[stat.color].main,
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <CardContent sx={{ p: compact ? 2 : 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Avatar 
                sx={{ 
                  bgcolor: `${stat.color}.light`, 
                  color: `${stat.color}.dark`,
                  width: compact ? 40 : 48,
                  height: compact ? 40 : 48,
                }}
              >
                <Icon />
              </Avatar>
              
              {showGrowth && compareToPrevious && stat.growth !== undefined && (
                <Chip
                  label={`${isPositive ? '+' : ''}${stat.growth}%`}
                  size="small"
                  color={growthColor}
                  icon={growthIcon}
                  variant="outlined"
                  sx={{ height: 24 }}
                />
              )}
            </Box>

            <Typography variant={compact ? "h5" : "h4"} component="div" gutterBottom>
              {stat.value.toLocaleString()}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
              {stat.title}
            </Typography>

            {stat.total !== undefined && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total: {stat.total.toLocaleString()}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stat.total > 0 ? (stat.value / stat.total) * 100 : 0}
                  sx={{ 
                    mt: 0.5,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: `${stat.color}.light`,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: `${stat.color}.main`,
                    }
                  }}
                />
              </Box>
            )}

            {stat.rate && (
              <Chip
                label={stat.rate}
                size="small"
                color={stat.color}
                variant="outlined"
                sx={{ mt: 1 }}
              />
            )}

            {stat.active !== undefined && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Active: {stat.active.toLocaleString()}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderSummaryMetrics = () => {
    if (!stats) return null;

    const metrics = [
      { label: 'Avg Users per Org', value: stats.avgUsersPerOrg?.toFixed(1) || '0.0', icon: People },
      { label: 'Avg Assessments per Org', value: stats.avgAssessmentsPerOrg?.toFixed(1) || '0.0', icon: Assessment },
      { label: 'Active Subscription Plans', value: stats.activePlans || 0, icon: Business },
      { label: 'Avg Response Rate', value: stats.avgResponseRate ? `${Math.round(stats.avgResponseRate * 100)}%` : '0%', icon: Equalizer },
    ];

    return (
      <Card sx={{ mt: 3, p: 2 }}>
        <Typography variant="subtitle1" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Equalizer fontSize="small" />
          Summary Metrics
        </Typography>
        <Grid container spacing={2}>
          {metrics.map((metric, index) => (
            <Grid item xs={6} md={3} key={index}>
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="h6" color="text.primary" gutterBottom>
                  {metric.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {metric.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
    );
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !stats) {
    return (
      <Alert 
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={loadStats}>
            <Refresh />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Business />
            Organization Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {organizationId ? `Statistics for organization: ${organizationId}` : 'Platform-wide organization metrics'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh statistics">
            <IconButton onClick={loadStats} disabled={loading} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Export statistics">
            <IconButton onClick={handleExportData} disabled={!stats}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Last updated: {format(lastUpdated, 'PPpp')}
        </Typography>
      )}

      <Grid container spacing={3}>
        {statsCards.map(renderStatCard)}
      </Grid>

      {!compact && renderSummaryMetrics()}

      {autoRefresh && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          Auto-refresh enabled ({refreshInterval / 1000}s interval)
        </Typography>
      )}
    </Box>
  );
}

OrganizationStats.propTypes = {
  /** Organization ID for tenant-specific stats (null for platform-wide) */
  organizationId: PropTypes.string,
  /** Time range for statistics */
  timeRange: PropTypes.oneOf(['7d', '30d', '90d', 'ytd', 'all']),
  /** Show comparison to previous period */
  compareToPrevious: PropTypes.bool,
  /** Show growth metrics */
  showGrowth: PropTypes.bool,
  /** Compact mode for dashboard widgets */
  compact: PropTypes.bool,
  /** Enable auto-refresh */
  autoRefresh: PropTypes.bool,
  /** Auto-refresh interval in milliseconds */
  refreshInterval: PropTypes.number,
};

OrganizationStats.defaultProps = {
  organizationId: null,
  timeRange: '30d',
  compareToPrevious: true,
  showGrowth: true,
  compact: false,
  autoRefresh: false,
  refreshInterval: 60000,
};
