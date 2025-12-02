// src/components/admin/AssessmentChart.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip as MuiTooltip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { fetchAssessmentAnalytics } from '../../api/assessmentApi';
import { format } from 'date-fns';
import { useSnackbar } from '../../contexts/SnackbarContext';

/**
 * Assessment Analytics Chart Component
 * Displays comprehensive analytics for assessments with multiple visualization options
 * Supports multi-tenant filtering via organizationId
 */
export default function AssessmentChart({ 
  organizationId, 
  timeRange = '7d', 
  showExport = false,
  compact = false 
}) {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState('bar');
  const [selectedMetric, setSelectedMetric] = useState('completionRate');
  const [timeRangeOption, setTimeRangeOption] = useState(timeRange);

  useEffect(() => {
    loadChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, timeRangeOption]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const response = await fetchAssessmentAnalytics(organizationId, {
        timeRange: timeRangeOption,
        metrics: ['assessments', 'responses', 'completionRate', 'averageScore'],
      });
      
      if (response.success) {
        setChartData(response.data);
        setError(null);
      } else {
        throw new Error(response.message || 'Failed to load analytics data');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load assessment analytics';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
      console.error('Failed to load assessment analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    if (!chartData) return;
    
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        organizationId,
        timeRange: timeRangeOption,
        metrics: chartData,
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `assessly-analytics-${organizationId || 'all'}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showSnackbar('Analytics data exported successfully', 'success');
    } catch (err) {
      showSnackbar('Failed to export analytics data', 'error');
      console.error('Export failed:', err);
    }
  };

  const chartOptions = [
    { value: 'bar', label: 'Bar Chart', icon: '📊' },
    { value: 'line', label: 'Line Chart', icon: '📈' },
    { value: 'pie', label: 'Pie Chart', icon: '🥧' },
  ];

  const metricOptions = [
    { value: 'completionRate', label: 'Completion Rate', color: theme.palette.primary.main },
    { value: 'averageScore', label: 'Average Score', color: theme.palette.success.main },
    { value: 'responses', label: 'Total Responses', color: theme.palette.info.main },
    { value: 'assessments', label: 'Assessments Created', color: theme.palette.warning.main },
  ];

  const timeRangeOptions = [
    { value: '1d', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'all', label: 'All Time' },
  ];

  const renderChart = () => {
    if (!chartData || !chartData.timeSeries || chartData.timeSeries.length === 0) {
      return (
        <Box sx={{ 
          height: compact ? 300 : 400, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 2 
        }}>
          <Typography variant="body1" color="text.secondary">
            📊 No assessment data available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create assessments or wait for candidate responses to see analytics
          </Typography>
        </Box>
      );
    }

    const data = chartData.timeSeries.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      completionRate: Math.round((item.completionRate || 0) * 100),
      averageScore: Math.round(item.averageScore || 0),
      responses: item.responses || 0,
      assessments: item.assessments || 0,
    }));

    const statusData = chartData.statusDistribution || [
      { name: 'Draft', value: 10, color: theme.palette.grey[400] },
      { name: 'Active', value: 40, color: theme.palette.success.main },
      { name: 'Paused', value: 20, color: theme.palette.warning.main },
      { name: 'Completed', value: 30, color: theme.palette.info.main },
    ];

    switch (selectedChart) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={compact ? 300 : 350}>
            <BarChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={theme.palette.divider} 
                vertical={false}
              />
              <XAxis 
                dataKey="date" 
                stroke={theme.palette.text.secondary}
                tick={{ fill: theme.palette.text.secondary }}
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                tick={{ fill: theme.palette.text.secondary }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: theme.shape.borderRadius,
                  boxShadow: theme.shadows[3],
                }}
                formatter={(value) => [value, metricOptions.find(m => m.value === selectedMetric)?.label]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => (
                  <span style={{ color: theme.palette.text.primary }}>
                    {metricOptions.find(m => m.value === value)?.label || value}
                  </span>
                )}
              />
              <Bar 
                dataKey={selectedMetric} 
                fill={metricOptions.find(m => m.value === selectedMetric)?.color}
                name={metricOptions.find(m => m.value === selectedMetric)?.label}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={compact ? 300 : 350}>
            <LineChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={theme.palette.divider} 
              />
              <XAxis 
                dataKey="date" 
                stroke={theme.palette.text.secondary}
                tick={{ fill: theme.palette.text.secondary }}
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                tick={{ fill: theme.palette.text.secondary }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: theme.shape.borderRadius,
                  boxShadow: theme.shadows[3],
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
              />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={metricOptions.find(m => m.value === selectedMetric)?.color}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name={metricOptions.find(m => m.value === selectedMetric)?.label}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={compact ? 300 : 350}>
            <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={compact ? 80 : 120}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || theme.palette.primary.main} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} assessments`, 'Count']}
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: theme.shape.borderRadius,
                  boxShadow: theme.shadows[3],
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const renderKeyMetrics = () => {
    if (!chartData) return null;

    const metrics = [
      { 
        label: 'Total Assessments', 
        value: chartData.totalAssessments || 0, 
        color: 'primary',
        icon: '📋'
      },
      { 
        label: 'Active Assessments', 
        value: chartData.activeAssessments || 0, 
        color: 'success',
        icon: '🚀'
      },
      { 
        label: 'Total Responses', 
        value: chartData.totalResponses || 0, 
        color: 'info',
        icon: '📝'
      },
      { 
        label: 'Avg Completion Rate', 
        value: `${Math.round((chartData.avgCompletionRate || 0) * 100)}%`, 
        color: 'warning',
        icon: '🎯'
      },
      { 
        label: 'Avg Score', 
        value: Math.round(chartData.avgScore || 0), 
        color: 'secondary',
        icon: '⭐'
      },
      { 
        label: 'Unique Candidates', 
        value: chartData.uniqueCandidates || 0, 
        color: 'error',
        icon: '👥'
      },
    ];

    return (
      <Grid container spacing={compact ? 1 : 2} sx={{ mb: 3 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={6} sm={4} md={2} key={index}>
            <Card 
              sx={{ 
                bgcolor: `${metric.color}.lightest`, 
                border: `1px solid ${theme.palette[metric.color].light}`,
                borderRadius: 2,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[2],
                }
              }}
            >
              <CardContent sx={{ p: compact ? 1.5 : 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>
                  {metric.icon} {metric.label}
                </Typography>
                <Typography 
                  variant={compact ? "h6" : "h5"} 
                  component="div" 
                  color={`${metric.color}.dark`}
                  fontWeight="bold"
                >
                  {metric.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: compact ? 300 : 400,
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading assessment analytics...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ mt: 2 }}
        action={
          <IconButton
            color="inherit"
            size="small"
            onClick={loadChartData}
          >
            <RefreshIcon />
          </IconButton>
        }
      >
        Failed to load assessment analytics: {error}
      </Alert>
    );
  }

  return (
    <Card 
      sx={{ 
        width: '100%',
        height: compact ? 'auto' : '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: compact ? 'flex-start' : 'center', 
          mb: 3,
          flexDirection: compact ? 'column' : 'row',
          gap: compact ? 2 : 0
        }}>
          <Box>
            <Typography variant={compact ? "h6" : "h5"} color="primary" gutterBottom>
              📊 Assessment Analytics
            </Typography>
            {!compact && (
              <Typography variant="body2" color="text.secondary">
                Monitor assessment performance and engagement metrics
              </Typography>
            )}
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            flexWrap: 'wrap',
            justifyContent: compact ? 'space-between' : 'flex-end',
            width: compact ? '100%' : 'auto'
          }}>
            <FormControl size="small" sx={{ minWidth: compact ? 100 : 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRangeOption}
                label="Time Range"
                onChange={(e) => setTimeRangeOption(e.target.value)}
                size={compact ? "small" : "medium"}
              >
                {timeRangeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: compact ? 100 : 120 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                label="Metric"
                onChange={(e) => setSelectedMetric(e.target.value)}
                size={compact ? "small" : "medium"}
              >
                {metricOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: compact ? 100 : 120 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={selectedChart}
                label="Chart Type"
                onChange={(e) => setSelectedChart(e.target.value)}
                size={compact ? "small" : "medium"}
              >
                {chartOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <MuiTooltip title="Refresh data">
                <IconButton 
                  size="small" 
                  onClick={loadChartData}
                  disabled={loading}
                >
                  <RefreshIcon />
                </IconButton>
              </MuiTooltip>
              {showExport && (
                <MuiTooltip title="Export analytics data">
                  <IconButton 
                    size="small" 
                    onClick={handleExportData}
                    disabled={!chartData}
                  >
                    <DownloadIcon />
                  </IconButton>
                </MuiTooltip>
              )}
            </Box>
          </Box>
        </Box>

        {renderKeyMetrics()}
        
        <Box sx={{ flex: 1 }}>
          {renderChart()}
        </Box>

        {chartData && chartData.insights && !compact && (
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: 'info.light', 
            borderRadius: 1,
            borderLeft: `4px solid ${theme.palette.info.main}`
          }}>
            <Typography variant="subtitle2" color="info.dark" gutterBottom>
              💡 Key Insights
            </Typography>
            <Typography variant="body2">
              {chartData.insights}
            </Typography>
          </Box>
        )}

        {showExport && chartData && !compact && (
          <Box sx={{ 
            mt: 3, 
            pt: 2, 
            borderTop: `1px solid ${theme.palette.divider}`,
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="caption" color="text.secondary">
              Data refreshed: {format(new Date(), 'MMM dd, yyyy HH:mm')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Organization: {organizationId || 'All Organizations'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

AssessmentChart.propTypes = {
  /** Organization ID for multi-tenant filtering (null for super admin view) */
  organizationId: PropTypes.string,
  /** Default time range for data visualization */
  timeRange: PropTypes.oneOf(['1d', '7d', '30d', '90d', 'ytd', 'all']),
  /** Show export functionality and timestamp */
  showExport: PropTypes.bool,
  /** Compact mode for dashboard widgets */
  compact: PropTypes.bool,
};

AssessmentChart.defaultProps = {
  organizationId: null,
  timeRange: '7d',
  showExport: true,
  compact: false,
};
