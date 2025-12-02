// src/components/admin/RevenueChart.jsx
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Equalizer,
  Refresh,
  Download,
  AttachMoney,
  Payment,
  Receipt,
  ShowChart,
  BarChart,
  PieChart,
  CalendarMonth,
} from '@mui/icons-material';
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO, subMonths } from 'date-fns';
import { fetchRevenueData, fetchRevenueAnalytics } from '../../api/revenueApi';
import { useSnackbar } from '../../contexts/SnackbarContext';

/**
 * Revenue Analytics Chart Component
 * Displays revenue metrics, trends, and financial analytics for B2B SaaS
 */
export default function RevenueChart({ 
  organizationId = null,
  currency = 'USD',
  timeRange = '30d',
  chartType = 'bar',
  showComparison = true,
  showBreakdown = true,
  compact = false,
  autoRefresh = false,
  refreshInterval = 60000,
}) {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [revenueData, setRevenueData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [selectedChart, setSelectedChart] = useState(chartType);
  const [selectedRange, setSelectedRange] = useState(timeRange);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      
      const params = {
        organizationId,
        currency,
        timeRange: selectedRange,
        includeComparison: showComparison,
        includeBreakdown: showBreakdown,
      };

      const [revenueResponse, analyticsResponse] = await Promise.all([
        fetchRevenueData(params),
        fetchRevenueAnalytics(params),
      ]);

      if (revenueResponse.success) {
        setRevenueData(revenueResponse.data);
      } else {
        throw new Error(revenueResponse.message || 'Failed to load revenue data');
      }

      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data);
      }

      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load revenue data';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
      console.error('Error loading revenue data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenueData();

    let intervalId;
    if (autoRefresh) {
      intervalId = setInterval(loadRevenueData, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [organizationId, currency, selectedRange, autoRefresh, refreshInterval]);

  const handleExportData = () => {
    if (!revenueData) return;
    
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        organizationId,
        currency,
        timeRange: selectedRange,
        revenueData,
        analytics,
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const fileName = `revenue-analytics-${organizationId || 'all'}-${format(new Date(), 'yyyy-MM-dd')}.json`;
      
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = fileName;
      link.click();
      
      showSnackbar('Revenue data exported successfully', 'success');
    } catch (err) {
      showSnackbar('Failed to export revenue data', 'error');
      console.error('Export failed:', err);
    }
  };

  const chartOptions = [
    { value: 'bar', label: 'Bar Chart', icon: BarChart },
    { value: 'line', label: 'Line Chart', icon: ShowChart },
    { value: 'pie', label: 'Pie Chart', icon: PieChart },
  ];

  const metricOptions = [
    { value: 'revenue', label: 'Revenue', color: theme.palette.primary.main },
    { value: 'mrr', label: 'Monthly Recurring Revenue', color: theme.palette.success.main },
    { value: 'arr', label: 'Annual Recurring Revenue', color: theme.palette.info.main },
    { value: 'newCustomers', label: 'New Customers', color: theme.palette.warning.main },
    { value: 'churnRate', label: 'Churn Rate', color: theme.palette.error.main },
  ];

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'ytd', label: 'Year to Date' },
    { value: '1y', label: 'Last Year' },
    { value: 'all', label: 'All Time' },
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderChart = () => {
    if (!revenueData?.timeSeries || revenueData.timeSeries.length === 0) {
      return (
        <Box sx={{ height: compact ? 250 : 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No revenue data available for the selected period.
          </Typography>
        </Box>
      );
    }

    const data = revenueData.timeSeries.map(item => ({
      date: format(parseISO(item.date), 'MMM dd'),
      revenue: item.revenue || 0,
      mrr: item.mrr || 0,
      arr: item.arr || 0,
      newCustomers: item.newCustomers || 0,
      churnRate: item.churnRate ? item.churnRate * 100 : 0,
    }));

    const breakdownData = revenueData.breakdown || [
      { name: 'Enterprise', value: 45, color: theme.palette.primary.main },
      { name: 'Business', value: 30, color: theme.palette.success.main },
      { name: 'Professional', value: 15, color: theme.palette.warning.main },
      { name: 'Basic', value: 10, color: theme.palette.info.main },
    ];

    const chartProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    const axisProps = {
      stroke: theme.palette.text.secondary,
      tick: { fill: theme.palette.text.secondary },
    };

    const tooltipProps = {
      contentStyle: { 
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[3],
      },
      formatter: (value) => {
        if (selectedMetric === 'churnRate') return [`${value.toFixed(1)}%`, 'Churn Rate'];
        if (['revenue', 'mrr', 'arr'].includes(selectedMetric)) return [formatCurrency(value), metricOptions.find(m => m.value === selectedMetric)?.label];
        return [value, metricOptions.find(m => m.value === selectedMetric)?.label];
      },
    };

    switch (selectedChart) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={compact ? 250 : 350}>
            <RechartsBarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis 
                {...axisProps}
                tickFormatter={(value) => {
                  if (['revenue', 'mrr', 'arr'].includes(selectedMetric)) {
                    return formatCurrency(value);
                  }
                  return value;
                }}
              />
              <RechartsTooltip {...tooltipProps} />
              <Legend />
              <Bar 
                dataKey={selectedMetric}
                fill={metricOptions.find(m => m.value === selectedMetric)?.color}
                radius={[4, 4, 0, 0]}
                name={metricOptions.find(m => m.value === selectedMetric)?.label}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={compact ? 250 : 350}>
            <RechartsLineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="date" {...axisProps} />
              <YAxis 
                {...axisProps}
                tickFormatter={(value) => {
                  if (['revenue', 'mrr', 'arr'].includes(selectedMetric)) {
                    return formatCurrency(value);
                  }
                  return value;
                }}
              />
              <RechartsTooltip {...tooltipProps} />
              <Legend />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={metricOptions.find(m => m.value === selectedMetric)?.color}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name={metricOptions.find(m => m.value === selectedMetric)?.label}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={compact ? 250 : 350}>
            <RechartsPieChart>
              <Pie
                data={breakdownData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={compact ? 80 : 100}
                fill="#8884d8"
                dataKey="value"
              >
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value) => [formatCurrency(value), 'Revenue']}
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: theme.shape.borderRadius,
                }}
              />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const renderKeyMetrics = () => {
    if (!analytics) return null;

    const metrics = [
      {
        title: 'Total Revenue',
        value: formatCurrency(analytics.totalRevenue || 0),
        icon: AttachMoney,
        color: 'primary',
        growth: analytics.revenueGrowth || 0,
        trend: analytics.revenueGrowth >= 0 ? 'up' : 'down',
      },
      {
        title: 'Monthly Recurring Revenue',
        value: formatCurrency(analytics.mrr || 0),
        icon: Payment,
        color: 'success',
        growth: analytics.mrrGrowth || 0,
        trend: analytics.mrrGrowth >= 0 ? 'up' : 'down',
      },
      {
        title: 'Annual Recurring Revenue',
        value: formatCurrency(analytics.arr || 0),
        icon: Receipt,
        color: 'info',
        growth: analytics.arrGrowth || 0,
        trend: analytics.arrGrowth >= 0 ? 'up' : 'down',
      },
      {
        title: 'Avg Revenue per User',
        value: formatCurrency(analytics.arpu || 0),
        icon: Equalizer,
        color: 'warning',
        growth: analytics.arpuGrowth || 0,
        trend: analytics.arpuGrowth >= 0 ? 'up' : 'down',
      },
      {
        title: 'New Customers',
        value: analytics.newCustomers || 0,
        icon: TrendingUp,
        color: 'success',
        growth: analytics.customerGrowth || 0,
        trend: analytics.customerGrowth >= 0 ? 'up' : 'down',
      },
      {
        title: 'Churn Rate',
        value: `${((analytics.churnRate || 0) * 100).toFixed(1)}%`,
        icon: TrendingDown,
        color: 'error',
        growth: analytics.churnChange || 0,
        trend: analytics.churnChange <= 0 ? 'up' : 'down',
      },
    ];

    return (
      <Grid container spacing={compact ? 1 : 2} sx={{ mb: 3 }}>
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.trend === 'up';
          const growthColor = isPositive ? 'success' : 'error';
          const growthIcon = isPositive ? <TrendingUp fontSize="inherit" /> : <TrendingDown fontSize="inherit" />;

          return (
            <Grid item xs={6} md={4} lg={2} key={index}>
              <Card 
                sx={{ 
                  p: compact ? 1 : 1.5,
                  height: '100%',
                  border: `1px solid ${alpha(theme.palette[metric.color].main, 0.2)}`,
                  bgcolor: alpha(theme.palette[metric.color].light, 0.05),
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: `${metric.color}.light`, 
                      color: `${metric.color}.dark`,
                      width: compact ? 28 : 32,
                      height: compact ? 28 : 32,
                      mr: 1,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Avatar>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {metric.title}
                  </Typography>
                  {metric.growth !== undefined && showComparison && (
                    <Chip
                      label={`${isPositive ? '+' : ''}${metric.growth}%`}
                      size="small"
                      color={growthColor}
                      icon={growthIcon}
                      sx={{ height: 20 }}
                    />
                  )}
                </Box>
                
                <Typography variant={compact ? "h6" : "h5"} color={`${metric.color}.dark`} fontWeight="bold">
                  {metric.value}
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderComparison = () => {
    if (!analytics?.comparison || !showComparison) return null;

    return (
      <Card sx={{ mt: 3, p: 2 }}>
        <Typography variant="subtitle1" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Equalizer />
          Period Comparison
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="caption" color="success.dark" display="block" gutterBottom>
                Current Period ({selectedRange})
              </Typography>
              <Typography variant="h6" color="success.dark">
                {formatCurrency(analytics.comparison.current || 0)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="caption" color="info.dark" display="block" gutterBottom>
                Previous Period
              </Typography>
              <Typography variant="h6" color="info.dark">
                {formatCurrency(analytics.comparison.previous || 0)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body1" color="text.primary" gutterBottom>
                Growth: {analytics.comparison.growth >= 0 ? '+' : ''}{analytics.comparison.growth || 0}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Compared to previous {selectedRange}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>
    );
  };

  if (loading && !revenueData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !revenueData) {
    return (
      <Alert 
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={loadRevenueData}>
            <Refresh />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachMoney />
              Revenue Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {organizationId ? `Revenue for organization: ${organizationId}` : 'Platform-wide revenue metrics'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh revenue data">
              <IconButton onClick={loadRevenueData} disabled={loading} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Export revenue data">
              <IconButton onClick={handleExportData} disabled={!revenueData}>
                <Download />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {renderKeyMetrics()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={selectedRange}
                label="Time Range"
                onChange={(e) => setSelectedRange(e.target.value)}
              >
                {timeRangeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Metric</InputLabel>
              <Select
                value={selectedMetric}
                label="Metric"
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                {metricOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <ButtonGroup size="small" variant="outlined">
            {chartOptions.map(option => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  onClick={() => setSelectedChart(option.value)}
                  color={selectedChart === option.value ? 'primary' : 'inherit'}
                  startIcon={<Icon />}
                >
                  {!compact && option.label}
                </Button>
              );
            })}
          </ButtonGroup>
        </Box>

        <Box sx={{ flex: 1 }}>
          {renderChart()}
        </Box>

        {!compact && (
          <>
            {renderComparison()}
            
            {analytics?.insights && (
              <Card sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderColor: 'info.main' }}>
                <Typography variant="subtitle1" color="info.dark" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Equalizer />
                  Revenue Insights
                </Typography>
                <Typography variant="body2" color="info.dark">
                  {analytics.insights}
                </Typography>
              </Card>
            )}
          </>
        )}

        {autoRefresh && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            Auto-refresh: {refreshInterval / 1000}s interval
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

RevenueChart.propTypes = {
  /** Organization ID for tenant-specific revenue (null for platform-wide) */
  organizationId: PropTypes.string,
  /** Currency for revenue display */
  currency: PropTypes.string,
  /** Time range for data */
  timeRange: PropTypes.oneOf(['7d', '30d', '90d', 'ytd', '1y', 'all']),
  /** Type of chart to display */
  chartType: PropTypes.oneOf(['bar', 'line', 'pie']),
  /** Show period comparison */
  showComparison: PropTypes.bool,
  /** Show revenue breakdown */
  showBreakdown: PropTypes.bool,
  /** Compact mode for dashboard widgets */
  compact: PropTypes.bool,
  /** Enable auto-refresh */
  autoRefresh: PropTypes.bool,
  /** Auto-refresh interval in milliseconds */
  refreshInterval: PropTypes.number,
};

RevenueChart.defaultProps = {
  organizationId: null,
  currency: 'USD',
  timeRange: '30d',
  chartType: 'bar',
  showComparison: true,
  showBreakdown: true,
  compact: false,
  autoRefresh: false,
  refreshInterval: 60000,
};
