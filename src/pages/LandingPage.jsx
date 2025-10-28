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
  useMediaQuery,
  Chip
} from '@mui/material';
import { 
  People, 
  DragIndicator, 
  PieChart, 
  Sync, 
  CheckCircle 
} from '@mui/icons-material';
import { Logo } from '../components/brand';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const CORE_FEATURES = [
    { 
      icon: People, 
      title: 'Multi-role System', 
      description: 'Admin, Assessor, and Candidate roles with granular permissions.', 
      color: 'primary' 
    },
    { 
      icon: DragIndicator, 
      title: 'Assessment Builder', 
      description: 'Intuitive drag-and-drop interface with 10+ question types.', 
      color: 'secondary' 
    },
    { 
      icon: PieChart, 
      title: 'Smart Analytics', 
      description: 'Real-time dashboards providing actionable insights on performance.', 
      color: 'info' 
    },
    { 
      icon: Sync, 
      title: 'Offline Mode', 
      description: 'Work without internet access with automatic synchronization.', 
      color: 'warning' 
    },
  ];

  const ASSESSMENT_TYPES = [
    'Exams & Quizzes', 
    'Employee Evaluations', 
    '360° Feedback', 
    'Surveys & Questionnaires', 
    'Certification Tests'
  ];

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Box 
      className="app-container landing-page"
      sx={{ 
        minHeight: '100vh', 
        bgcolor: theme.palette.background.default,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        overflowX: 'hidden'
      }}
    >
      {/* Hero Section with Video Background */}
      <Box
        component="section"
        className="hero-section"
        sx={{
          position: 'relative',
          minHeight: { xs: '70vh', md: '80vh' },
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: theme.palette.background.default,
          width: '100%'
        }}
      >
        {/* Video Background */}
        <Box
          component="video"
          src="/Assessly.mp4"
          autoPlay
          loop
          muted
          playsInline
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />

        {/* Dark overlay for better text readability */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1,
          }}
        />

        {/* Content */}
        <Container 
          maxWidth="xl" 
          className="section-container"
          sx={{ 
            position: 'relative', 
            zIndex: 2, 
            width: '100%', 
            py: 8 
          }}
        >
          <Grid container spacing={4} alignItems="center">
            {/* Text Content */}
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                {/* Logo for mobile */}
                {isMobile && (
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                    <Logo size={60} />
                  </Box>
                )}

                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 800,
                    mb: 3,
                    fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                    lineHeight: 1.1,
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  Measure Smarter, Not Harder
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    mb: 4,
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                    maxWidth: 500,
                    mx: { xs: 'auto', md: 0 },
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}
                >
                  From Questions to Insights, Anywhere — A modern assessment SaaS platform.
                </Typography>

                <Box 
                  sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    justifyContent: { xs: 'center', md: 'flex-start' },
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    width: '100%'
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/auth?tab=signup')}
                    sx={{ 
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      flex: isMobile ? '1 1 100%' : 'none',
                      minWidth: isMobile ? '200px' : 'auto'
                    }}
                  >
                    Get Started Free
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={scrollToFeatures}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: 'white',
                      borderColor: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      flex: isMobile ? '1 1 100%' : 'none',
                      minWidth: isMobile ? '200px' : 'auto'
                    }}
                  >
                    See Features
                  </Button>
                </Box>
              </Box>
            </Grid>

            {/* Video Preview for desktop */}
            {!isMobile && (
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Box
                    component="video"
                    src="/Assessly.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    sx={{
                      width: '100%',
                      maxWidth: 500,
                      borderRadius: 2,
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                      border: `2px solid ${theme.palette.primary.main}`,
                    }}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </Container>
      </Box>

      {/* Platform Capabilities Section */}
      <Container 
        maxWidth="xl" 
        className="capabilities-section section-container"
        component="section"
        id="features-section"
        sx={{ 
          py: 10,
          width: '100%'
        }}
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

        {/* Core Features Grid */}
        <Grid container spacing={4} sx={{ mb: 8, width: '100%', margin: 0 }}>
          {CORE_FEATURES.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title} sx={{ display: 'flex' }}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4, flex: 1 }}>
                  <feature.icon 
                    sx={{ 
                      fontSize: 48, 
                      color: `${feature.color}.main`, 
                      mb: 2 
                    }} 
                  />
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
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

        {/* Additional Features */}
        <Grid container spacing={4} alignItems="stretch" sx={{ width: '100%', margin: 0 }}>
          {/* Assessment Types */}
          <Grid item xs={12} md={5}>
            <Card 
              elevation={2}
              sx={{ 
                height: '100%',
                p: 4, 
                borderRadius: 2 
              }}
            >
              <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                Diverse Assessment Types
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {ASSESSMENT_TYPES.map(type => (
                  <Chip 
                    key={type} 
                    label={type} 
                    icon={<CheckCircle fontSize="small" />} 
                    color="secondary" 
                    variant="outlined" 
                    sx={{ mb: 1 }} 
                  />
                ))}
              </Box>
            </Card>
          </Grid>

          {/* Assessment Lifecycle */}
          <Grid item xs={12} md={7}>
            <Card 
              elevation={2}
              sx={{ 
                height: '100%',
                p: 4, 
                borderRadius: 2 
              }}
            >
              <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
                Assessment Lifecycle
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  "Create Assessment (Drag-and-drop builder)",
                  "Distribute (Multi-channel invitations)",
                  "Collect Responses (Secure & offline)",
                  "Generate Reports (PDF & actionable data)",
                  "Analyze Insights (Data-driven decisions)"
                ].map((step, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography 
                      variant="h4" 
                      color="primary" 
                      sx={{ fontWeight: 'bold', mr: 2, minWidth: '40px' }}
                    >
                      {i + 1}.
                    </Typography>
                    <Typography variant="body1">{step}</Typography>
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>
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

      {/* Scroll-to-Top Button */}
      <Box
        component="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          bgcolor: 'primary.main',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 50,
          height: 50,
          cursor: 'pointer',
          boxShadow: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': { bgcolor: 'primary.dark' },
          zIndex: 999,
        }}
        aria-label="Scroll to top"
      >
        ↑
      </Box>
    </Box>
  );
                                           }
