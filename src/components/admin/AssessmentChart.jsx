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
import { fetchAssessmentAnalytics } from '../../api/assessmentApi';
import { format } from 'date-fns';

export default function AssessmentChart({ organizationId, timeRange = '7d', showExport = false }) {
  const theme = useTheme();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState('bar');
  const [selectedMetric, setSelectedMetric] = useState('completionRate');
  const [timeRangeOption, setTimeRangeOption] = useState(timeRange);

  useEffect(() => {
    loadChartData();
  }, [organizationId, timeRangeOption]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const analytics = await fetchAssessmentAnalytics(organizationId, {
        timeRange: timeRangeOption,
        metrics: ['assessments', 'responses', 'completionRate', 'averageScore'],
      });
      setChartData(analytics.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load assessment analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'pie', label: 'Pie Chart' },
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
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No assessment data available for the selected period.
          </Typography>
        </Box>
      );
    }

    const data = chartData.timeSeries.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      completionRate: Math.round(item.completionRate * 100),
      averageScore: Math.round(item.averageScore),
      responses: item.responses,
      assessments: item.assessments,
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
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: theme.shape.borderRadius,
                }}
              />
              <Legend />
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
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
              <YAxis stroke={theme.palette.text.secondary} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: theme.shape.borderRadius,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={metricOptions.find(m => m.value === selectedMetric)?.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name={metricOptions.find(m => m.value === selectedMetric)?.label}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || theme.palette.primary.main} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} assessments`, 'Count']}
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderColor: theme.palette.divider,
                  borderRadius: theme.shape.borderRadius,
                }}
              />
              <Legend />
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
      { label: 'Total Assessments', value: chartData.totalAssessments || 0, color: 'primary' },
      { label: 'Active Assessments', value: chartData.activeAssessments || 0, color: 'success' },
      { label: 'Total Responses', value: chartData.totalResponses || 0, color: 'info' },
      { label: 'Avg Completion Rate', value: `${Math.round((chartData.avgCompletionRate || 0) * 100)}%`, color: 'warning' },
      { label: 'Avg Score', value: Math.round(chartData.avgScore || 0), color: 'secondary' },
      { label: 'Unique Candidates', value: chartData.uniqueCandidates || 0, color: 'error' },
    ];

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={6} sm={4} md={2} key={index}>
            <Card sx={{ bgcolor: `${metric.color}.light`, color: `${metric.color}.dark` }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" component="div">
                  {metric.value}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {metric.label}
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load assessment analytics: {error}
      </Alert>
    );
  }

  return (
    <Card sx={{ width: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" color="primary">
            Assessment Analytics
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRangeOption}
                label="Time Range"
                onChange={(e) => setTimeRangeOption(e.target.value)}
              >
                {timeRangeOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
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

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={selectedChart}
                label="Chart Type"
                onChange={(e) => setSelectedChart(e.target.value)}
              >
                {chartOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {renderKeyMetrics()}
        
        {renderChart()}

        {chartData && chartData.insights && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="info.dark" gutterBottom>
              Insights
            </Typography>
            <Typography variant="body2">
              {chartData.insights}
            </Typography>
          </Box>
        )}

        {showExport && chartData && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Typography variant="caption" color="text.secondary">
              Data as of {format(new Date(), 'MMM dd, yyyy HH:mm')}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

AssessmentChart.propTypes = {
  /** Organization ID for multitenant filtering */
  organizationId: PropTypes.string,
  /** Default time range for data */
  timeRange: PropTypes.oneOf(['1d', '7d', '30d', '90d', 'ytd', 'all']),
  /** Show export timestamp */
  showExport: PropTypes.bool,
};

AssessmentChart.defaultProps = {
  organizationId: null,
  timeRange: '7d',
  showExport: true,
};
