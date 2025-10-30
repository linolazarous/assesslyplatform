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
import { 
  People, 
  DragIndicator, 
  PieChart, 
  Sync, 
  CheckCircle 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import Footer from '../components/common/Footer.jsx';
import { Logo } from '../components/brand';

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

  const NAVBAR_LINKS = [
    { label: 'Features', href: '#features-section' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
    { label: 'Documentation', href: 'https://docs.assessly.com', external: true },
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
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        overflowX: 'hidden'
      }}
    >
      {/* Navigation */}
      <Navbar links={NAVBAR_LINKS} />

      {/* Hero Section with Video Background */}
      <Box
        component="section"
        className="hero-section"
        sx={{
          position: 'relative',
          height: { xs: '70vh', md: '80vh' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          color: 'white',
        }}
      >
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'translate(-50%, -50%)',
            zIndex: 0,
          }}
        >
          <source src="/Assessly.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Dark Overlay for Better Text Readability */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1,
          }}
        />

        {/* Content */}
        <Container 
          maxWidth="lg" 
          className="section-container"
          sx={{ 
            position: 'relative', 
            zIndex: 2,
            textAlign: 'center' 
          }}
        >
          {/* Logo */}
          <Box sx={{ mb: 4 }}>
            <Logo size={isMobile ? 60 : 80} variant="light" />
          </Box>

          {/* Main Heading */}
          <Typography
            variant="h1"
            sx={{
              fontWeight: 800,
              mb: 3,
              fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
              lineHeight: 1.1,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            Measure Smarter,{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Not Harder
            </Box>
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="h5"
            sx={{
              mb: 4,
              opacity: 0.9,
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              maxWidth: 600,
              mx: 'auto',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              fontWeight: 400,
            }}
          >
            From Questions to Insights, Anywhere — A modern assessment SaaS platform.
          </Typography>

          {/* CTA Buttons */}
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'center',
              flexWrap: 'wrap',
              mb: 2
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
                backgroundColor: 'white',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'grey.50',
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                transition: 'all 0.3s ease',
                minWidth: { xs: '200px', md: 'auto' }
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
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
                minWidth: { xs: '200px', md: 'auto' }
              }}
            >
              See Features
            </Button>
          </Box>

          {/* Trust Indicator */}
          <Typography
            variant="body2"
            sx={{
              opacity: 0.8,
              mt: 4,
            }}
          >
            Trusted by 500+ companies worldwide
          </Typography>
        </Container>
      </Box>

      {/* Platform Capabilities Section */}
      <Container 
        maxWidth="lg" 
        className="capabilities-section section-container"
        component="section"
        id="features-section"
        sx={{ 
          py: { xs: 8, md: 12 },
          width: '100%'
        }}
      >
        <Typography 
          variant="h2" 
          component="h2"
          align="center" 
          sx={{ 
            mb: 2, 
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '2.5rem' }
          }}
        >
          Platform Capabilities
        </Typography>

        <Typography 
          variant="h6" 
          align="center" 
          color="text.secondary"
          sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
        >
          Everything you need to create, manage, and analyze assessments at scale
        </Typography>

        {/* Core Features Grid */}
        <Grid container spacing={4} sx={{ mb: 8 }}>
          {CORE_FEATURES.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <feature.icon 
                    sx={{ 
                      fontSize: 48, 
                      color: `${feature.color}.main`, 
                      mb: 3,
                    }} 
                  />
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
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
        <Grid container spacing={4} alignItems="stretch">
          {/* Assessment Types */}
          <Grid item xs={12} md={6}>
            <Card 
              elevation={2}
              sx={{ 
                height: '100%',
                p: 4,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                Diverse Assessment Types
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Support for various assessment formats to meet your specific needs
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {ASSESSMENT_TYPES.map(type => (
                  <Box
                    key={type}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 16, mr: 1 }} />
                    {type}
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>

          {/* Assessment Lifecycle */}
          <Grid item xs={12} md={6}>
            <Card 
              elevation={2}
              sx={{ 
                height: '100%',
                p: 4,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                Complete Assessment Lifecycle
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  "Create Assessment (Drag-and-drop builder)",
                  "Distribute (Multi-channel invitations)",
                  "Collect Responses (Secure & offline)",
                  "Generate Reports (PDF & actionable data)",
                  "Analyze Insights (Data-driven decisions)"
                ].map((step, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                    >
                      {i + 1}
                    </Box>
                    <Typography variant="body1" sx={{ lineHeight: 1.5 }}>
                      {step}
                    </Typography>
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
          py: { xs: 8, md: 12 }, 
          bgcolor: 'background.paper',
          width: '100%'
        }} 
        component="section"
      >
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ mb: 3, fontWeight: 700 }}>
            Ready to Transform Your Assessments?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 5 }}>
            Join thousands of organizations using Assessly to make data-driven decisions.
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            sx={{ 
              px: 6, 
              py: 1.5, 
              fontSize: '1.1rem',
              fontWeight: 600,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
              transition: 'all 0.3s ease',
            }}
            onClick={() => navigate('/auth?tab=signup')}
          >
            Start Your Free Trial
          </Button>
          
          {/* Additional Info */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              ✅ No credit card required
            </Typography>
            <Typography variant="body2" color="text.secondary">
              🚀 Free 14-day trial
            </Typography>
            <Typography variant="body2" color="text.secondary">
              💬 24/7 Support
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />

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
          '&:hover': { 
            bgcolor: 'primary.dark',
            transform: 'translateY(-2px)',
            boxShadow: 6,
          },
          transition: 'all 0.3s ease',
          zIndex: 999,
        }}
        aria-label="Scroll to top"
      >
        ↑
      </Box>
    </Box>
  );
}
