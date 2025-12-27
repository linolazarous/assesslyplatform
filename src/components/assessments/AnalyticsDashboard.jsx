import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import { BarChart, TrendingUp, People, Timer } from '@mui/icons-material';

const AnalyticsDashboard = ({ data }) => {
  const stats = data || {
    totalCandidates: 150,
    completed: 120,
    averageScore: 78,
    averageTime: 42,
    questions: [
      { id: 1, difficulty: 'Easy', correctRate: 85 },
      { id: 2, difficulty: 'Medium', correctRate: 65 },
      { id: 3, difficulty: 'Hard', correctRate: 45 }
    ]
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Assessment Analytics
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Candidates</Typography>
              </Box>
              <Typography variant="h4">{stats.totalCandidates}</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Completion Rate</Typography>
              </Box>
              <Typography variant="h4">
                {Math.round((stats.completed / stats.totalCandidates) * 100)}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(stats.completed / stats.totalCandidates) * 100}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BarChart color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Average Score</Typography>
              </Box>
              <Typography variant="h4">{stats.averageScore}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Timer color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Avg Time</Typography>
              </Box>
              <Typography variant="h4">{stats.averageTime}m</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Question Performance
        </Typography>
        <Typography color="text.secondary">
          Detailed analytics dashboard is under development.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AnalyticsDashboard;
