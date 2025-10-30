import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  useTheme,
  Fade,
  Zoom,
  alpha,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  ArrowForward,
  Rocket,
  Security,
  Support,
  Star,
  Close
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const BENEFITS = [
  {
    icon: Rocket,
    title: 'Launch in Minutes',
    description: 'Get started immediately with our intuitive setup process'
  },
  {
    icon: Security,
    title: 'Enterprise Security',
    description: 'Bank-level encryption and compliance with industry standards'
  },
  {
    icon: Support,
    title: '24/7 Support',
    description: 'Dedicated support team ready to help you succeed'
  },
  {
    icon: Star,
    title: 'Proven Results',
    description: 'Join 500+ companies already transforming their assessments'
  }
];

const BenefitCard = React.memo(({ benefit, index }) => {
  const theme = useTheme();

  return (
    <Zoom in timeout={600} style={{ delay: 800 + (index * 100) }}>
      <Card 
        elevation={0}
        sx={{
          textAlign: 'center',
          bgcolor: 'transparent',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            borderColor: alpha(theme.palette.primary.main, 0.3),
            bgcolor: alpha(theme.palette.primary.main, 0.02)
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              mb: 2
            }}
          >
            <benefit.icon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {benefit.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {benefit.description}
          </Typography>
        </CardContent>
      </Card>
    </Zoom>
  );
});

BenefitCard.propTypes = {
  benefit: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired
};

export default function CallToAction({ showPromo = true }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [showPromoBanner, setShowPromoBanner] = useState(showPromo);

  const handleCTAClick = useCallback((plan = 'trial') => {
    navigate('/auth?tab=signup', { 
      state: { 
        from: 'cta_section',
        plan 
      } 
    });
  }, [navigate]);

  const handleClosePromo = useCallback(() => {
    setShowPromoBanner(false);
  }, []);

  return (
    <Box 
      component="section" 
      sx={{ 
        py: { xs: 8, md: 12 },
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#fff', 0.1)} 0%, transparent 70%)`,
          animation: 'float 6s ease-in-out infinite'
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -50,
          left: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#fff', 0.05)} 0%, transparent 70%)`,
          animation: 'float 8s ease-in-out infinite reverse'
        }}
      />

      {/* Promo Banner */}
      {showPromoBanner && (
        <Fade in timeout={500}>
          <Box
            sx={{
              position: 'absolute',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: alpha('#000', 0.2),
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              px: 3,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              zIndex: 2,
              border: `1px solid ${alpha('#fff', 0.2)}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Rocket sx={{ fontSize: 20 }} />
              <Typography variant="body2" fontWeight="medium">
                🎉 Limited Time: Extended 30-day free trial!
              </Typography>
            </Box>
            <Tooltip title="Close banner">
              <IconButton 
                size="small" 
                onClick={handleClosePromo}
                sx={{ color: 'white' }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Fade>
      )}

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          {/* Main CTA Content */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={800}>
              <Box sx={{ textAlign: { xs: 'center', lg: 'left' } }}>
                <Typography
                  variant="h3"
                  component="h2"
                  sx={{
                    fontWeight: 800,
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    lineHeight: 1.1,
                    textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  Ready to Transform Your{' '}
                  <Box
                    component="span"
                    sx={{
                      background: 'linear-gradient(45deg, #fbbf24, #f59e0b, #eab308)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundSize: '200% 200%',
                      animation: 'gradientShift 3s ease infinite'
                    }}
                  >
                    Assessment Process?
                  </Box>
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    mb: 4,
                    opacity: 0.9,
                    lineHeight: 1.6,
                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                    maxWidth: 500,
                    mx: { xs: 'auto', lg: 0 }
                  }}
                >
                  Join thousands of forward-thinking organizations using Assessly to make data-driven decisions and drive meaningful outcomes.
                </Typography>

                {/* CTA Buttons */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    justifyContent: { xs: 'center', lg: 'flex-start' },
                    flexWrap: 'wrap',
                    mb: 4
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => handleCTAClick('trial')}
                    endIcon={<ArrowForward />}
                    sx={{
                      px: 5,
                      py: 1.75,
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      borderRadius: 3,
                      bgcolor: 'white',
                      color: 'primary.main',
                      minWidth: { xs: '100%', sm: 'auto' },
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
                        bgcolor: 'grey.50'
                      }
                    }}
                  >
                    Start Free Trial
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => handleCTAClick('demo')}
                    sx={{
                      px: 4,
                      py: 1.75,
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      borderRadius: 3,
                      borderColor: 'white',
                      color: 'white',
                      minWidth: { xs: '100%', sm: 'auto' },
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        bgcolor: alpha('#fff', 0.1),
                        borderColor: 'white',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                      }
                    }}
                  >
                    Book Demo
                  </Button>
                </Box>

                {/* Guarantee */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', lg: 'flex-start' }, gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    ✅ No credit card required
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    🚀 Free 30-day trial
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    💬 24/7 Support
                  </Typography>
                </Box>
              </Box>
            </Fade>
          </Grid>

          {/* Benefits Grid */}
          <Grid item xs={12} lg={6}>
            <Grid container spacing={3}>
              {BENEFITS.map((benefit, index) => (
                <Grid item xs={12} sm={6} key={benefit.title}>
                  <BenefitCard benefit={benefit} index={index} />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Trust Indicators */}
        <Fade in timeout={1200}>
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.7, 
                mb: 3,
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: '0.875rem'
              }}
            >
              Trusted by innovative teams at
            </Typography>
            
            {/* Logo Grid */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              gap: { xs: 4, md: 6 },
              flexWrap: 'wrap',
              opacity: 0.8
            }}>
              {['TechCorp', 'GlobalOrg', 'FinServe', 'InnovateLabs', 'StartupScale'].map((company) => (
                <Typography 
                  key={company}
                  variant="h6" 
                  fontWeight="bold"
                  sx={{ 
                    fontStyle: 'italic',
                    opacity: 0.7,
                    transition: 'opacity 0.3s ease',
                    '&:hover': { opacity: 1 }
                  }}
                >
                  {company}
                </Typography>
              ))}
            </Box>
          </Box>
        </Fade>
      </Container>

      {/* Global Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </Box>
  );
}

CallToAction.propTypes = {
  showPromo: PropTypes.bool
};

CallToAction.defaultProps = {
  showPromo: true
};
