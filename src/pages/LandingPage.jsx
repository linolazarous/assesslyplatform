// src/pages/LandingPage.jsx
import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  Grid,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Logo } from '../components/brand';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      title: "Create Assessments",
      description: "Build customized tests with our intuitive question builder"
    },
    {
      title: "Real-time Analytics",
      description: "Get instant insights with our powerful reporting dashboard"
    },
    {
      title: "Secure & Scalable",
      description: "Enterprise-grade security with unlimited scalability"
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      {/* Hero Section */}
      <Box 
        component="section"
        sx={{ 
          textAlign: 'center', 
          py: { xs: 8, md: 12 },
          px: 2,
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(180deg, #121212 0%, #1E1E1E 100%)' 
            : 'linear-gradient(180deg, #f5f7fa 0%, #e4e8f0 100%)',
        }}
      >
        <Logo size={isMobile ? 80 : 120} />
        <Typography 
          variant="h2" 
          component="h1"
          sx={{ 
            mt: 3,
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '3rem' },
            lineHeight: 1.2
          }}
        >
          Measure Smarter, Not Harder
        </Typography>
        <Typography 
          variant="h5" 
          sx={{ 
            mt: 2,
            color: 'text.secondary',
            maxWidth: 600,
            mx: 'auto',
            px: 2
          }}
        >
          From Questions to Insights, Anywhere — The modern assessment SaaS platform.
        </Typography>
        
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/auth?tab=signup')}
            sx={{ px: 5, py: 1.5 }}
          >
            Get Started Free
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => navigate('/demo')}
            sx={{
              px: 5, py: 1.5,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': { backgroundColor: 'primary.light', borderColor: 'primary.dark' }
            }}
          >
            Live Demo
          </Button>
        </Box>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 10 }} component="section">
        <Typography 
          variant="h3" 
          component="h2"
          align="center" 
          sx={{ mb: 6, fontWeight: 700 }}
        >
          Powerful Assessment Tools
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature) => (
            <Grid item xs={12} md={4} key={feature.title}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.03)',
                    boxShadow: theme.shadows[10]
                  },
                  borderRadius: 3
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" gutterBottom component="h3" sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ py: 12, bgcolor: theme.palette.background.paper }} component="section">
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" sx={{ mb: 3, fontWeight: 700 }}>
            Ready to Transform Your Assessments?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 5 }}>
            Join Assessly today and start building reliable, actionable assessments.
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}
            onClick={() => navigate('/auth?tab=signup')}
          >
            Start Your Free Trial
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
