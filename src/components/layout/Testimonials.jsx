// src/components/layout/Testimonials.jsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Avatar, 
  Rating, 
  useTheme,
  IconButton,
  Container,
  Fade,
  Zoom,
  alpha,
  Chip,
  Tooltip,
  Stack,
  Divider,
  Button,
  Alert,
  LinearProgress,
  Tab,
  Tabs
} from '@mui/material';
import { 
  FormatQuote,
  ArrowBackIos,
  ArrowForwardIos,
  PlayCircle,
  PauseCircle,
  Verified,
  Business,
  Group,
  TrendingUp,
  Security,
  AdminPanelSettings,
  Star,
  CheckCircle,
  CorporateFare,
  WorkspacePremium,
  AccountBalance,
  School,
  MedicalServices,
  Factory
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';

const INDUSTRY_TESTIMONIALS = {
  technology: [
    { 
      id: 1, 
      name: 'Alex Thompson', 
      role: 'HR Director', 
      company: 'TechCorp Global',
      logo: 'TC',
      rating: 5, 
      feedback: 'As a multinational tech company, we needed a scalable solution. Assessly\'s multitenant architecture allowed each regional office to operate independently while we maintained centralized control. Hiring efficiency improved by 40%.', 
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      featured: true,
      metrics: { improvement: '40%', metric: 'faster hiring', icon: '⚡' },
      subscription: 'Enterprise',
      usage: '500+ assessments/month'
    },
    { 
      id: 2, 
      name: 'James Kim', 
      role: 'CTO', 
      company: 'StartupScale',
      logo: 'SS',
      rating: 4.5, 
      feedback: 'The API-first approach and multi-organization support were perfect for our SaaS platform. We white-labeled the solution for our own clients while maintaining a single subscription.', 
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      featured: false,
      metrics: { improvement: '3x', metric: 'client acquisition', icon: '🚀' },
      subscription: 'Growth',
      usage: '200+ assessments/month'
    }
  ],
  education: [
    { 
      id: 3, 
      name: 'Dr. Emily Watson', 
      role: 'Academic Dean', 
      company: 'University Tech',
      logo: 'UT',
      rating: 5, 
      feedback: 'Managing multiple departments and courses was challenging until we found Assessly. Each department gets its own secure environment while administration maintains oversight.', 
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      featured: true,
      metrics: { improvement: '65%', metric: 'engagement boost', icon: '📈' },
      subscription: 'Education',
      usage: '1000+ assessments/month'
    }
  ],
  healthcare: [
    { 
      id: 4, 
      name: 'Dr. Sarah Chen', 
      role: 'Training Manager', 
      company: 'HealthFirst Group',
      logo: 'HF',
      rating: 5, 
      feedback: 'HIPAA compliance was non-negotiable. Assessly provided enterprise-grade security while allowing each hospital in our network to manage their own training programs.', 
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      featured: true,
      metrics: { improvement: '99.9%', metric: 'uptime', icon: '💯' },
      subscription: 'Healthcare',
      usage: '300+ assessments/month'
    }
  ],
  finance: [
    { 
      id: 5, 
      name: 'Marcus Rodriguez', 
      role: 'Compliance Director', 
      company: 'FinServe Solutions',
      logo: 'FS',
      rating: 5, 
      feedback: 'For financial certification exams, we needed bulletproof security and audit trails. Each branch operates independently while headquarters maintains complete visibility.', 
      avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=100&h=100&fit=crop&crop=face',
      featured: false,
      metrics: { improvement: '100%', metric: 'compliance rate', icon: '✅' },
      subscription: 'Enterprise',
      usage: '150+ assessments/month'
    }
  ],
  manufacturing: [
    { 
      id: 6, 
      name: 'Lisa Wang', 
      role: 'Operations Manager', 
      company: 'Innovate Manufacturing',
      logo: 'IM',
      rating: 5, 
      feedback: 'Training thousands of employees across multiple factories was inefficient. Now each plant manages their training while we track progress centrally. Assessment creation time reduced by 80%.', 
      avatar: 'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=100&h=100&fit=crop&crop=face',
      featured: false,
      metrics: { improvement: '80%', metric: 'time saved', icon: '⏱️' },
      subscription: 'Business',
      usage: '400+ assessments/month'
    }
  ]
};

const INDUSTRY_ICONS = {
  technology: <Business />,
  education: <School />,
  healthcare: <MedicalServices />,
  finance: <AccountBalance />,
  manufacturing: <Factory />
};

const TestimonialCard = React.memo(({ 
  testimonial, 
  isActive, 
  onClick, 
  index,
  industry,
  showSuperAdmin = false 
}) => {
  const theme = useTheme();
  const { isSuperAdmin } = useAuth();

  return (
    <Zoom in timeout={600} style={{ delay: index * 100 }}>
      <Card 
        elevation={isActive ? 8 : 3}
        onClick={onClick}
        sx={{
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isActive ? 'scale(1.02) translateY(-8px)' : 'scale(1)',
          background: isActive 
            ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.light, 0.08)} 100%)`
            : theme.palette.background.paper,
          border: `2px solid ${isActive ? theme.palette.primary.main : alpha(theme.palette.divider, 0.5)}`,
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-8px) scale(1.01)',
            boxShadow: 12,
            borderColor: theme.palette.primary.main,
          }
        }}
      >
        {/* Featured Ribbon */}
        {testimonial.featured && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: -30,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              color: 'white',
              padding: '4px 32px',
              transform: 'rotate(45deg)',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              zIndex: 2,
              boxShadow: 2
            }}
          >
            FEATURED
          </Box>
        )}

        {/* Industry Badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            zIndex: 2,
          }}
        >
          {INDUSTRY_ICONS[industry]}
          <Typography variant="caption" fontWeight="medium" textTransform="capitalize">
            {industry}
          </Typography>
        </Box>

        {/* Super Admin Note */}
        {showSuperAdmin && isSuperAdmin && (
          <Alert 
            severity="info" 
            icon={<AdminPanelSettings />}
            sx={{ 
              mt: 6, 
              mx: 2, 
              py: 0.5,
              fontSize: '0.75rem',
              '& .MuiAlert-message': { py: 0.5 }
            }}
          >
            <Typography variant="caption">
              <strong>Super Admin View:</strong> This organization is on {testimonial.subscription} plan
            </Typography>
          </Alert>
        )}

        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Quote Icon */}
          <FormatQuote 
            sx={{ 
              fontSize: 48, 
              color: alpha(theme.palette.primary.main, 0.1),
              mb: 2,
              transform: 'scaleX(-1)'
            }} 
          />

          {/* Rating and Subscription */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Rating 
                value={testimonial.rating} 
                precision={0.5} 
                readOnly 
                size="small"
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {testimonial.rating}/5
              </Typography>
            </Box>
            <Chip
              label={testimonial.subscription}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Stack>

          {/* Feedback */}
          <Typography 
            variant="body1" 
            sx={{ 
              flexGrow: 1,
              fontStyle: 'italic',
              lineHeight: 1.6,
              mb: 3,
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            "{testimonial.feedback}"
          </Typography>

          {/* Metrics */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h4" fontWeight={800} color="primary.main">
                {testimonial.metrics.improvement}
              </Typography>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  {testimonial.metrics.icon} {testimonial.metrics.metric}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {testimonial.usage}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Author */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
            <Avatar 
              sx={{ 
                mr: 2, 
                width: 56, 
                height: 56,
                border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                bgcolor: theme.palette.primary.main,
                fontSize: '1.25rem',
                fontWeight: 'bold',
              }}
            >
              {testimonial.logo}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight="bold" noWrap>
                  {testimonial.name}
                </Typography>
                <Verified 
                  sx={{ 
                    fontSize: 16, 
                    color: 'primary.main', 
                    ml: 0.5 
                  }} 
                />
              </Box>
              <Typography variant="body2" color="text.secondary" noWrap>
                {testimonial.role}
              </Typography>
              <Typography variant="body1" fontWeight={600} color="primary" noWrap>
                {testimonial.company}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );
});

TestimonialCard.propTypes = {
  testimonial: PropTypes.object.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  industry: PropTypes.string.isRequired,
  showSuperAdmin: PropTypes.bool,
};

export default function Testimonials({ showSuperAdminView = false }) {
  const theme = useTheme();
  const { isSuperAdmin } = useAuth();
  const [activeIndustry, setActiveIndustry] = useState('technology');
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const autoPlayRef = useRef(null);

  const allTestimonials = useMemo(() => 
    Object.values(INDUSTRY_TESTIMONIALS).flat(),
    []
  );

  const featuredTestimonials = useMemo(() => 
    allTestimonials.filter(t => t.featured),
    [allTestimonials]
  );

  const currentIndustryTestimonials = useMemo(() => 
    INDUSTRY_TESTIMONIALS[activeIndustry] || [],
    [activeIndustry]
  );

  const handleNext = useCallback(() => {
    setActiveTestimonial(prev => 
      prev === featuredTestimonials.length - 1 ? 0 : prev + 1
    );
  }, [featuredTestimonials.length]);

  const handlePrev = useCallback(() => {
    setActiveTestimonial(prev => 
      prev === 0 ? featuredTestimonials.length - 1 : prev - 1
    );
  }, [featuredTestimonials.length]);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay(prev => !prev);
  }, []);

  // Auto-play effect
  useEffect(() => {
    if (!autoPlay) return;

    autoPlayRef.current = setInterval(handleNext, 5000);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [autoPlay, handleNext]);

  const platformMetrics = useMemo(() => [
    { value: '500+', label: 'Organizations', description: 'Using our platform', icon: <CorporateFare />, color: 'primary' },
    { value: '99.9%', label: 'Uptime', description: 'Enterprise reliability', icon: <TrendingUp />, color: 'success' },
    { value: '1M+', label: 'Assessments', description: 'Delivered monthly', icon: <Group />, color: 'secondary' },
    { value: '50+', label: 'Countries', description: 'Global presence', icon: <Business />, color: 'info' },
    { value: 'SOC 2', label: 'Compliance', description: 'Enterprise security', icon: <Security />, color: 'warning' },
    { value: '4.8/5', label: 'Rating', description: 'Customer satisfaction', icon: <Star />, color: 'error' },
  ], []);

  const subscriptionStats = useMemo(() => ({
    enterprise: { count: 150, revenue: 'High', growth: '25%' },
    business: { count: 250, revenue: 'Medium', growth: '40%' },
    education: { count: 75, revenue: 'Medium', growth: '30%' },
    startup: { count: 100, revenue: 'Low', growth: '50%' },
  }), []);

  const renderPlatformMetrics = () => (
    <Fade in timeout={1000}>
      <Card sx={{ 
        p: 4, 
        mb: 6,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)}, ${alpha(theme.palette.secondary.dark, 0.9)})`,
        color: 'white',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          width: 300, 
          height: 300,
          background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.1)} 0%, transparent 70%)`,
          borderRadius: '50%',
          transform: 'translate(150px, -150px)',
        }} />
        
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 4, position: 'relative', zIndex: 1 }}>
          Platform Performance
        </Typography>
        
        <Grid container spacing={3}>
          {platformMetrics.map((metric, index) => (
            <Grid item xs={6} md={4} lg={2} key={index}>
              <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                  mx: 'auto',
                  mb: 2,
                  color: 'white',
                }}>
                  {metric.icon}
                </Box>
                <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5 }}>
                  {metric.value}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  {metric.label}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {metric.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Fade>
  );

  const renderSubscriptionOverview = () => (
    <Fade in timeout={1200}>
      <Card sx={{ p: 4, mb: 6 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Subscription Distribution
        </Typography>
        <Typography color="text.secondary" paragraph>
          Our multitenant platform serves organizations of all sizes with flexible subscription plans.
        </Typography>
        
        <Grid container spacing={3}>
          {Object.entries(subscriptionStats).map(([plan, stats], index) => (
            <Grid item xs={6} md={3} key={plan}>
              <Card sx={{ 
                p: 2, 
                textAlign: 'center',
                border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                bgcolor: alpha(theme.palette.primary.light, 0.05),
              }}>
                <Typography variant="h6" color="primary" fontWeight={800} gutterBottom>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </Typography>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                  {stats.count}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Organizations
                </Typography>
                <Chip 
                  label={`${stats.growth} growth`} 
                  size="small" 
                  color="success" 
                  variant="outlined"
                />
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {showSuperAdminView && isSuperAdmin && (
          <Alert 
            severity="info" 
            icon={<AdminPanelSettings />}
            sx={{ mt: 3 }}
          >
            <Typography variant="body2">
              <strong>Super Admin Insight:</strong> You manage all {Object.values(subscriptionStats).reduce((sum, s) => sum + s.count, 0)} organizations centrally. 
              Each operates independently while you control billing and subscriptions.
            </Typography>
          </Alert>
        )}
      </Card>
    </Fade>
  );

  const renderIndustryTabs = () => (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Success Across Industries
      </Typography>
      <Tabs 
        value={activeIndustry}
        onChange={(e, newValue) => setActiveIndustry(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {Object.keys(INDUSTRY_TESTIMONIALS).map((industry) => (
          <Tab 
            key={industry}
            value={industry}
            label={industry.charAt(0).toUpperCase() + industry.slice(1)}
            icon={INDUSTRY_ICONS[industry]}
            iconPosition="start"
          />
        ))}
      </Tabs>
      
      <Grid container spacing={3}>
        {currentIndustryTestimonials.map((testimonial, index) => (
          <Grid item xs={12} md={6} key={testimonial.id}>
            <TestimonialCard
              testimonial={testimonial}
              isActive={false}
              onClick={() => {}}
              index={index}
              industry={activeIndustry}
              showSuperAdmin={showSuperAdminView}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box 
      component="section" 
      id="testimonials-section"
      sx={{ 
        py: { xs: 8, md: 12 },
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.background.default, 1)} 0%,
          ${alpha(theme.palette.primary.light, 0.03)} 50%,
          ${alpha(theme.palette.secondary.light, 0.03)} 100%
        )`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 10% 20%, ${alpha(theme.palette.primary.light, 0.03)} 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, ${alpha(theme.palette.secondary.light, 0.03)} 0%, transparent 40%)
          `,
          zIndex: 0
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Section Header */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Chip
              label="ENTERPRISE PROVEN"
              color="primary"
              sx={{ 
                mb: 3, 
                fontWeight: 700,
                fontSize: '0.875rem',
                py: 1,
              }}
              icon={<WorkspacePremium />}
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontWeight: 800,
                mb: 2,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% 200%',
                animation: 'gradientShift 8s ease infinite',
              }}
            >
              Trusted by Forward-Thinking Organizations
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                maxWidth: 800,
                mx: 'auto',
                lineHeight: 1.6,
                mb: 2
              }}
            >
              Discover how organizations across industries leverage our multitenant platform 
              to transform their assessment processes while maintaining data isolation and security.
            </Typography>
            {showSuperAdminView && isSuperAdmin && (
              <Alert 
                severity="info" 
                sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}
                icon={<AdminPanelSettings />}
              >
                <Typography variant="body2">
                  <strong>Super Admin Perspective:</strong> You see all organizations here. 
                  Each operates independently with their own data, while you manage subscriptions centrally.
                </Typography>
              </Alert>
            )}
          </Box>
        </Fade>

        {/* Platform Metrics */}
        {renderPlatformMetrics()}

        {/* Featured Testimonials Carousel */}
        <Box sx={{ position: 'relative', mb: 8 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Featured Success Stories
          </Typography>
          
          <Grid container spacing={3}>
            {featuredTestimonials.map((testimonial, index) => (
              <Grid item xs={12} md={6} lg={4} key={testimonial.id}>
                <TestimonialCard
                  testimonial={testimonial}
                  isActive={activeTestimonial === index}
                  onClick={() => setActiveTestimonial(index)}
                  index={index}
                  industry={Object.keys(INDUSTRY_TESTIMONIALS).find(key => 
                    INDUSTRY_TESTIMONIALS[key].some(t => t.id === testimonial.id)
                  )}
                  showSuperAdmin={showSuperAdminView}
                />
              </Grid>
            ))}
          </Grid>

          {/* Carousel Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4, gap: 2 }}>
            <Tooltip title="Previous testimonial">
              <IconButton 
                onClick={handlePrev}
                sx={{ 
                  bgcolor: 'background.paper',
                  boxShadow: 3,
                  '&:hover': { 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <ArrowBackIos fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={autoPlay ? "Pause auto-play" : "Play auto-play"}>
              <IconButton 
                onClick={toggleAutoPlay}
                color={autoPlay ? "primary" : "default"}
                sx={{ 
                  bgcolor: 'background.paper',
                  boxShadow: 3,
                  '&:hover': { transform: 'scale(1.1)' },
                  transition: 'all 0.3s ease',
                }}
              >
                {autoPlay ? <PauseCircle fontSize="medium" /> : <PlayCircle fontSize="medium" />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Next testimonial">
              <IconButton 
                onClick={handleNext}
                sx={{ 
                  bgcolor: 'background.paper',
                  boxShadow: 3,
                  '&:hover': { 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <ArrowForwardIos fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Subscription Overview (Super Admin Focus) */}
        {showSuperAdminView && renderSubscriptionOverview()}

        {/* Industry Tabs */}
        {renderIndustryTabs()}

        {/* CTA Section */}
        <Fade in timeout={1500}>
          <Card sx={{ 
            p: 6, 
            textAlign: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Ready to Join Industry Leaders?
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Start your journey with Assessly and see why organizations worldwide trust our platform
              for their critical assessment needs.
            </Typography>
            
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              justifyContent="center"
              sx={{ mt: 3 }}
            >
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => window.location.href = '/register'}
                sx={{ 
                  px: 6, 
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                onClick={() => window.location.href = '/contact'}
                sx={{ 
                  px: 6, 
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                Request Enterprise Demo
              </Button>
            </Stack>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              No credit card required • 14-day free trial • Dedicated support
            </Typography>
          </Card>
        </Fade>
      </Container>

      <style jsx global>{`
        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </Box>
  );
}

Testimonials.propTypes = {
  showSuperAdminView: PropTypes.bool,
};

Testimonials.defaultProps = {
  showSuperAdminView: false,
};
