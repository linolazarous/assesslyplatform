// src/components/admin/SystemHealthMonitor.jsx
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
  LinearProgress,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  Badge,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Storage,
  Cloud,
  Memory,
  NetworkCheck,
  Security,
  Speed,
  AccessTime,
  Download,
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';
import { fetchSystemHealth, fetchServiceStatus } from '../../api/systemApi';
import { useSnackbar } from '../../contexts/SnackbarContext';

/**
 * System Health Monitor Component
 * Real-time monitoring of platform health, services, and infrastructure
 */
export default function SystemHealthMonitor({ 
  showServices = true,
  showMetrics = true,
  showIncidents = true,
  autoRefresh = true,
  refreshInterval = 30000,
  compact = false,
}) {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [healthData, setHealthData] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      
      const [healthResponse, servicesResponse] = await Promise.all([
        fetchSystemHealth(),
        showServices ? fetchServiceStatus() : Promise.resolve(null),
      ]);

      if (healthResponse.success) {
        setHealthData(healthResponse.data);
      } else {
        throw new Error(healthResponse.message || 'Failed to load system health data');
      }

      if (servicesResponse?.success) {
        setServices(servicesResponse.data?.services || []);
      }

      setError(null);
      setLastCheck(new Date());
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load system health';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
      console.error('Error loading system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthData();

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(loadHealthData, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const getHealthStatus = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'up':
        return { color: 'success', icon: CheckCircle, label: 'Healthy' };
      case 'degraded':
      case 'warning':
        return { color: 'warning', icon: Warning, label: 'Degraded' };
      case 'unhealthy':
      case 'down':
        return { color: 'error', icon: Error, label: 'Unhealthy' };
      default:
        return { color: 'info', icon: Info, label: 'Unknown' };
    }
  };

  const healthIndicators = useMemo(() => {
    if (!healthData) return [];

    return [
      {
        title: 'API Service',
        value: healthData.api?.uptime || 0,
        status: healthData.api?.status,
        icon: Cloud,
        metric: `${healthData.api?.responseTime || 0}ms`,
        description: 'Main API gateway and endpoints',
      },
      {
        title: 'Database',
        value: healthData.database?.uptime || 0,
        status: healthData.database?.status,
        icon: Storage,
        metric: `${healthData.database?.connections || 0} connections`,
        description: 'MongoDB database cluster',
      },
      {
        title: 'Memory Usage',
        value: healthData.memory?.usage || 0,
        status: healthData.memory?.status,
        icon: Memory,
        metric: `${Math.round(healthData.memory?.used || 0)}MB / ${Math.round(healthData.memory?.total || 0)}MB`,
        description: 'System memory utilization',
      },
      {
        title: 'Network',
        value: healthData.network?.latency || 0,
        status: healthData.network?.status,
        icon: NetworkCheck,
        metric: `${healthData.network?.latency || 0}ms latency`,
        description: 'Network connectivity and latency',
      },
      {
        title: 'Security',
        value: healthData.security?.score || 0,
        status: healthData.security?.status,
        icon: Security,
        metric: `${healthData.security?.score || 0}/100`,
        description: 'Security and compliance status',
      },
      {
        title: 'Performance',
        value: healthData.performance?.score || 0,
        status: healthData.performance?.status,
        icon: Speed,
        metric: `${healthData.performance?.requestsPerSecond || 0} req/sec`,
        description: 'System performance metrics',
      },
    ];
  }, [healthData]);

  const renderHealthIndicator = (indicator, index) => {
    const status = getHealthStatus(indicator.status);
    const StatusIcon = status.icon;
    const progressValue = typeof indicator.value === 'number' ? Math.min(indicator.value, 100) : 0;

    return (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card 
          sx={{ 
            height: '100%',
            border: `1px solid ${alpha(theme.palette[status.color].main, 0.2)}`,
            '&:hover': {
              boxShadow: theme.shadows[1],
            },
          }}
        >
          <CardContent sx={{ p: compact ? 1.5 : 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Badge
                color={status.color}
                variant="dot"
                overlap="circular"
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: `${status.color}.light`, 
                    color: `${status.color}.dark`,
                    width: compact ? 36 : 40,
                    height: compact ? 36 : 40,
                  }}
                >
                  <indicator.icon />
                </Avatar>
              </Badge>
              
              <Box sx={{ ml: 2, flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {indicator.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {indicator.description}
                </Typography>
              </Box>
              
              <Chip
                label={status.label}
                size="small"
                color={status.color}
                icon={<StatusIcon fontSize="small" />}
                sx={{ height: 24 }}
              />
            </Box>

            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                {indicator.metric}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={progressValue}
                color={status.color}
                sx={{ 
                  height: 6,
                  borderRadius: 3,
                }}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <AccessTime fontSize="inherit" sx={{ mr: 0.5 }} />
              Updated {formatDistanceToNow(new Date(healthData?.timestamp || new Date()), { addSuffix: true })}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderServiceTable = () => {
    if (!showServices || services.length === 0) return null;

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Cloud />
            Service Status
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Service</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Version</TableCell>
                  <TableCell align="center">Uptime</TableCell>
                  <TableCell align="center">Response Time</TableCell>
                  <TableCell align="center">Last Check</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service, index) => {
                  const status = getHealthStatus(service.status);
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIcon color={status.color} fontSize="small" />
                          <Typography variant="body2">{service.name}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {service.description}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={status.label}
                          size="small"
                          color={status.color}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={service.version || 'N/A'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {service.uptime ? `${Math.round(service.uptime * 100)}%` : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {service.responseTime ? `${service.responseTime}ms` : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption" color="text.secondary">
                          {service.lastCheck ? formatDistanceToNow(new Date(service.lastCheck), { addSuffix: true }) : 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    );
  };

  const renderIncidents = () => {
    if (!showIncidents || !healthData?.incidents?.length) return null;

    const activeIncidents = healthData.incidents.filter(incident => incident.status === 'active');

    if (activeIncidents.length === 0) return null;

    return (
      <Card sx={{ mt: 3, borderColor: 'warning.main' }}>
        <CardContent>
          <Typography variant="subtitle1" color="warning.dark" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning />
            Active Incidents ({activeIncidents.length})
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activeIncidents.map((incident, index) => (
              <Alert 
                key={index}
                severity="warning"
                sx={{ 
                  border: `1px solid ${theme.palette.warning.light}`,
                  bgcolor: alpha(theme.palette.warning.light, 0.1),
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  {incident.title}
                </Typography>
                <Typography variant="body2" paragraph>
                  {incident.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Started: {format(new Date(incident.startTime), 'PPpp')}
                </Typography>
              </Alert>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderOverallStatus = () => {
    if (!healthData) return null;

    const overallStatus = getHealthStatus(healthData.overallStatus);
    const StatusIcon = overallStatus.icon;
    const isHealthy = overallStatus.color === 'success';

    return (
      <Card 
        sx={{ 
          mb: 3,
          borderColor: `${overallStatus.color}.main`,
          bgcolor: alpha(theme.palette[overallStatus.color].light, 0.1),
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <StatusIcon color={overallStatus.color} sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" color={`${overallStatus.color}.dark`}>
                  System Status: {overallStatus.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isHealthy ? 'All systems operational' : 'Some services may be experiencing issues'}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Last check
              </Typography>
              <Typography variant="body2">
                {lastCheck ? format(lastCheck, 'PPpp') : 'Never'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading && !healthData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !healthData) {
    return (
      <Alert 
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={loadHealthData}>
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
            <Speed />
            System Health Monitor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time monitoring of platform services and infrastructure
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh health check">
            <IconButton onClick={loadHealthData} disabled={loading} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          
          {!compact && (
            <Tooltip title="Export health report">
              <IconButton onClick={() => {}} disabled={!healthData}>
                <Download />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {renderOverallStatus()}

      <Grid container spacing={2}>
        {healthIndicators.map(renderHealthIndicator)}
      </Grid>

      {renderServiceTable()}
      {renderIncidents()}

      {autoRefresh && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          Auto-refresh: {refreshInterval / 1000}s interval
        </Typography>
      )}
    </Box>
  );
}

SystemHealthMonitor.propTypes = {
  /** Show service status table */
  showServices: PropTypes.bool,
  /** Show health metrics */
  showMetrics: PropTypes.bool,
  /** Show active incidents */
  showIncidents: PropTypes.bool,
  /** Enable auto-refresh */
  autoRefresh: PropTypes.bool,
  /** Auto-refresh interval in milliseconds */
  refreshInterval: PropTypes.number,
  /** Compact mode for dashboard widgets */
  compact: PropTypes.bool,
};

SystemHealthMonitor.defaultProps = {
  showServices: true,
  showMetrics: true,
  showIncidents: true,
  autoRefresh: true,
  refreshInterval: 30000,
  compact: false,
};
