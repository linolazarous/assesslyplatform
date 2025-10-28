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
      title: "Multi-role System",
      description: "Admin, Assessor, and Candidate roles with granular permissions."
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
    <Box className="app-container landing-page" sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.background.default,
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      overflowX: 'hidden' // Prevent horizontal scroll
    }}>
      {/* Hero Section */}
      <Box 
        component="section"
        className="hero-section section-container"
        sx={{ 
          textAlign: 'center', 
          py: { xs: 8, md: 12 },
          px: 2,
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(180deg, #121212 0%, #1E1E1E 100%)' 
            : 'linear-gradient(180deg, #f5f7fa 0%, #e4e8f0 100%)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%'
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
            lineHeight: 1.2,
            maxWidth: '800px',
            width: '100%'
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
            px: 2,
            width: '100%'
          }}
        >
          From Questions to Insights, Anywhere — The modern assessment SaaS platform.
        </Typography>
        
        <Box sx={{ 
          mt: 4, 
          display: 'flex', 
          gap: 2, 
          justifyContent: 'center', 
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          width: '100%',
          maxWidth: '400px'
        }}>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/auth?tab=signup')}
            sx={{ 
              px: 5, 
              py: 1.5,
              flex: isMobile ? '1 1 100%' : 'none',
              minWidth: isMobile ? '200px' : 'auto'
            }}
          >
            Get Started Free
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => navigate('/demo')}
            sx={{
              px: 5, 
              py: 1.5,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': { 
                backgroundColor: 'primary.light', 
                borderColor: 'primary.dark',
                color: 'white'
              },
              flex: isMobile ? '1 1 100%' : 'none',
              minWidth: isMobile ? '200px' : 'auto'
            }}
          >
            See Features
          </Button>
        </Box>
      </Box>

      {/* Platform Capabilities Section */}
      <Container 
        maxWidth="lg" 
        className="capabilities-section section-container"
        sx={{ 
          py: 10,
          width: '100%'
        }} 
        component="section"
      >
        <Typography 
          variant="h3" 
          component="h2"
          align="center" 
          sx={{ 
            mb: 6, 
            fontWeight: 700,
            width: '100%'
          }}
        >
          Platform Capabilities
        </Typography>
        
        <Grid container spacing={4} sx={{ width: '100%', margin: 0 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={feature.title} sx={{ display: 'flex' }}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: theme.shadows[10]
                  },
                  borderRadius: 3,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <CardContent sx={{ p: 4, flex: 1 }}>
                  <Typography variant="h5" gutterBottom component="h3" sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box 
        className="section-container"
        sx={{ 
          py: 12, 
          bgcolor: theme.palette.background.paper,
          width: '100%'
        }} 
        component="section"
      >
        <Container maxWidth="md" sx={{ textAlign: 'center', width: '100%' }}>
          <Typography variant="h3" component="h2" sx={{ mb: 3, fontWeight: 700 }}>
            Ready to Transform Your Assessments?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 5 }}>
            Join Assessly today and start building reliable, actionable assessments.
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            sx={{ 
              px: 6, 
              py: 1.5, 
              fontSize: '1.1rem',
              minWidth: '200px'
            }}
            onClick={() => navigate('/auth?tab=signup')}
          >
            Start Your Free Trial
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
