import React from 'react';
import { Box, Typography, Grid, Card, CardContent, useTheme, Chip } from '@mui/material';
import { People, DragIndicator, PieChart, Sync, CheckCircle } from '@mui/icons-material';

const CORE_FEATURES = [
  { icon: People, title: 'Multi-role System', description: 'Admin, Assessor, and Candidate roles with granular permissions.', color: 'primary' },
  { icon: DragIndicator, title: 'Assessment Builder', description: 'Intuitive drag-and-drop interface with 10+ question types.', color: 'secondary' },
  { icon: PieChart, title: 'Smart Analytics', description: 'Real-time dashboards providing actionable insights on performance.', color: 'info' },
  { icon: Sync, title: 'Offline Mode', description: 'Work without internet access with automatic synchronization.', color: 'warning' },
];

const ASSESSMENT_TYPES = [
  'Exams & Quizzes', 'Employee Evaluations', '360° Feedback', 'Surveys & Questionnaires', 'Certification Tests'
];

export default function FeaturesSection() {
  const theme = useTheme();

  return (
    <Box component="section" sx={{ py: 8 }} id="features-section">
      <Typography variant="h3" component="h2" align="center" sx={{ mb: 6, fontWeight: 700 }}>
        Platform Capabilities
      </Typography>

      {/* Core Features Grid */}
      <Grid container spacing={4} sx={{ mb: 8 }}>
        {CORE_FEATURES.map(feature => (
          <Grid item xs={12} sm={6} md={3} key={feature.title}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <feature.icon sx={{ fontSize: 48, color: `${feature.color}.main`, mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" gutterBottom>{feature.title}</Typography>
                <Typography color="text.secondary">{feature.description}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4} alignItems="stretch">
        {/* Assessment Types */}
        <Grid item xs={12} md={5}>
          <Box sx={{ p: 4, bgcolor: theme.palette.background.paper, borderRadius: 2, height: '100%' }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Diverse Assessment Types</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {ASSESSMENT_TYPES.map(type => (
                <Chip key={type} label={type} icon={<CheckCircle fontSize="small" />} color="secondary" variant="outlined" sx={{ mb: 1 }} />
              ))}
            </Box>
          </Box>
        </Grid>

        {/* Assessment Lifecycle */}
        <Grid item xs={12} md={7}>
          <Box sx={{ p: 4, bgcolor: theme.palette.background.paper, borderRadius: 2, height: '100%' }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Assessment Lifecycle</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                "Create Assessment (Drag-and-drop builder)",
                "Distribute (Multi-channel invitations)",
                "Collect Responses (Secure & offline)",
                "Generate Reports (PDF & actionable data)",
                "Analyze Insights (Data-driven decisions)"
              ].map((step, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold', mr: 2 }}>{i + 1}.</Typography>
                  <Typography variant="body1">{step}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
