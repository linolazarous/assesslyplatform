// src/components/layout/FeaturesSection.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  useTheme,
  Chip,
  Fade,
  Zoom,
  Container,
  alpha,
  IconButton,
  Tooltip,
  useMediaQuery,
  Stack,
  Avatar,
  Button,
  Divider,
  LinearProgress,
  Badge,
  Tab,
  Tabs,
  Alert,
} from '@mui/material';
import {
  People,
  DragIndicator,
  PieChart,
  Sync,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  PlayCircle,
  Business,
  Security,
  Timeline,
  Cloud,
  Analytics,
  Code,
  Settings,
  Lock,
  Language,
  Speed,
  Storage,
  VpnLock,
  GroupWork,
  Assignment,
  Dashboard,
  CompareArrows,
  // Integration icon doesn't exist, using alternatives:
  SyncAlt, // Alternative for Integration
  Api, // Another alternative
  SettingsInputComponent, // Or this
  Extension, // Or this
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';

// Use SyncAlt as Integration icon replacement
const IntegrationIcon = SyncAlt;

const CORE_FEATURES = [
  {
    icon: Business,
    title: 'Multitenant Architecture',
    description: 'Each organization gets isolated data with shared infrastructure. Super admin manages all subscriptions centrally.',
    color: 'primary',
    details: [
      'Complete data isolation per organization',
      'Shared infrastructure for cost efficiency',
      'Centralized subscription management',
      'Organization-specific branding',
      'Custom domain support',
    ],
    badge: 'Enterprise',
  },
  {
    icon: People,
    title: 'Role-Based Access Control',
    description: 'Granular permissions for Super Admin, Organization Admin, Assessor, and Candidate roles with custom permission sets.',
    color: 'secondary',
    details: [
      'Super Admin (Developer) oversight',
      'Organization Admin controls',
      'Assessor-level permissions',
      'Candidate access restrictions',
      'Custom permission groups',
    ],
    badge: 'Security',
  },
  {
    icon: DragIndicator,
    title: 'Assessment Builder',
    description: 'Intuitive drag-and-drop interface with 15+ question types, templates, and AI-powered question suggestions.',
    color: 'info',
    details: [
      '15+ question types (MCQ, Essay, File Upload, etc.)',
      'Drag-and-drop interface',
      'AI-powered question suggestions',
      'Template library with 100+ templates',
      'Version control and history',
    ],
    badge: 'Productivity',
  },
  {
    icon: Analytics,
    title: 'Real-time Analytics',
    description: 'AI-powered insights with predictive analytics, performance trends, and customizable dashboards for each organization.',
    color: 'success',
    details: [
      'Real-time performance dashboards',
      'Predictive analytics engine',
      'Custom report builder',
      'Export to PDF/Excel/CSV',
      'Organization-specific metrics',
    ],
    badge: 'Insights',
  },
  {
    icon: Security,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption, audit logs, and compliance with GDPR, HIPAA, and other regulations.',
    color: 'warning',
    details: [
      'End-to-end encryption',
      'SOC 2 compliance',
      'GDPR & HIPAA ready',
      'Comprehensive audit logs',
      'Two-factor authentication',
    ],
    badge: 'Compliance',
  },
  {
    icon: IntegrationIcon, // Changed from Integration to SyncAlt
    title: 'API & Integrations',
    description: 'RESTful API with webhooks, Zapier integration, and pre-built connectors for HR systems, LMS, and CRMs.',
    color: 'error',
    details: [
      'Comprehensive REST API',
      'Webhook support',
      'Zapier integration',
      'HRIS/LMS integrations',
      'Custom connector builder',
    ],
    badge: 'Extensible',
  },
];

const ARCHITECTURE_FEATURES = [
  {
    title: 'Scalable Infrastructure',
    description: 'Auto-scaling microservices architecture built on Node.js & MongoDB',
    icon: <Speed />,
    color: 'primary',
  },
  {
    title: 'Data Isolation',
    description: 'Complete data separation between organizations with shared infrastructure',
    icon: <VpnLock />,
    color: 'secondary',
  },
  {
    title: 'High Availability',
    description: '99.9% uptime SLA with multi-region deployment and automatic failover',
    icon: <Cloud />,
    color: 'success',
  },
  {
    title: 'Backup & Recovery',
    description: 'Automatic daily backups with point-in-time recovery capability',
    icon: <Storage />,
    color: 'warning',
  },
];

const ASSESSMENT_TYPES = [
  { type: 'Exams & Quizzes', icon: '📝', category: 'Education' },
  { type: 'Employee Evaluations', icon: '👨‍💼', category: 'HR' },
  { type: '360° Feedback', icon: '🔄', category: 'Performance' },
  { type: 'Surveys & Questionnaires', icon: '📊', category: 'Research' },
  { type: 'Certification Tests', icon: '🏅', category: 'Certification' },
  { type: 'Skills Assessment', icon: '🎯', category: 'Recruitment' },
  { type: 'Personality Tests', icon: '🧠', category: 'Psychology' },
  { type: 'Pre-employment Screening', icon: '🔍', category: 'Hiring' },
  { type: 'Course Assessments', icon: '📚', category: 'eLearning' },
  { type: 'Compliance Training', icon: '⚖️', category: 'Legal' },
];

const LIFECYCLE_STEPS = [
  { 
    step: 1, 
    title: "Create & Design", 
    description: "Use our drag-and-drop builder with 15+ question types", 
    icon: "🎨",
    time: "5 minutes"
  },
  { 
    step: 2, 
    title: "Configure & Brand", 
    description: "Add organization branding and configure assessment settings", 
    icon: "⚙️",
    time: "2 minutes"
  },
  { 
    step: 3, 
    title: "Distribute & Invite", 
    description: "Send invitations via email, link, or integrate with your systems", 
    icon: "📤",
    time: "1 minute"
  },
  { 
    step: 4, 
    title: "Monitor & Analyze", 
    description: "Real-time tracking with live dashboards and notifications", 
    icon: "📈",
    time: "Ongoing"
  },
  { 
    step: 5, 
    title: "Generate Reports", 
    description: "Automated reporting with AI-powered insights", 
    icon: "📊",
    time: "Instant"
  },
  { 
    step: 6, 
    title: "Take Action", 
    description: "Make data-driven decisions with actionable insights", 
    icon: "🚀",
    time: "Continuous"
  }
];

const FeatureCard = React.memo(({ feature, index, isExpanded, onToggle, isDemo }) => {
  const theme = useTheme();
  const { isSuperAdmin } = useAuth();

  return (
    <Zoom in timeout={800} style={{ transitionDelay: `${index * 100}ms` }}>
      <Card
        elevation={isExpanded ? 8 : 3}
        onClick={() => onToggle(feature.title)}
        sx={{
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: 2,
          borderColor: isExpanded ? theme.palette[feature.color].main : 'transparent',
          background: isExpanded
            ? `linear-gradient(135deg, ${alpha(theme.palette[feature.color].light, 0.1)}, ${alpha(theme.palette.background.paper, 0.95)})`
            : theme.palette.background.paper,
          '&:hover': { 
            transform: 'translateY(-8px)', 
            boxShadow: 12,
            borderColor: theme.palette[feature.color].light,
          },
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {feature.badge && (
          <Chip
            label={feature.badge}
            size="small"
            sx={{
              position: 'absolute',
              top: -10,
              right: 16,
              bgcolor: theme.palette[feature.color].main,
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.7rem',
            }}
          />
        )}
        
        {isDemo && feature.title === 'Multitenant Architecture' && isSuperAdmin && (
          <Badge
            badgeContent="Super Admin"
            color="error"
            sx={{
              position: 'absolute',
              top: -10,
              left: 16,
              '& .MuiBadge-badge': {
                fontSize: '0.6rem',
                fontWeight: 'bold',
              },
            }}
          />
        )}

        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 60,
                height: 60,
                borderRadius: 3,
                bgcolor: theme.palette[feature.color].main,
                color: 'white',
                mr: 2,
                flexShrink: 0,
                boxShadow: 2,
              }}
            >
              <feature.icon sx={{ fontSize: 32 }} />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
                {feature.title}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: isExpanded ? 'unset' : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  fontSize: '0.9rem',
                }}
              >
                {feature.description}
              </Typography>
            </Box>
            <Tooltip title={isExpanded ? "Show less" : "Learn more"}>
              <IconButton 
                size="small" 
                sx={{ 
                  ml: 1,
                  bgcolor: alpha(theme.palette[feature.color].main, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette[feature.color].main, 0.2),
                  },
                }}
              >
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Tooltip>
          </Box>

          {isExpanded && (
            <Fade in timeout={400}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ mb: 1.5 }}>
                  Key Capabilities:
                </Typography>
                <Stack spacing={1.5}>
                  {feature.details.map((detail, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <CheckCircle 
                        sx={{ 
                          fontSize: 18, 
                          color: theme.palette[feature.color].main, 
                          mr: 1.5, 
                          mt: 0.25,
                          flexShrink: 0,
                        }} 
                      />
                      <Typography variant="body2" color="text.secondary">
                        {detail}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Fade>
          )}

          <Box sx={{ mt: 'auto', pt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color={feature.color} fontWeight="medium">
              {isExpanded ? 'Click to collapse' : 'Click to expand'}
            </Typography>
            {!isExpanded && (
              <PlayCircle sx={{ 
                fontSize: 18, 
                color: theme.palette[feature.color].main, 
                opacity: 0.8,
                animation: isExpanded ? 'none' : 'pulse 2s infinite',
              }} />
            )}
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );
});

FeatureCard.displayName = 'FeatureCard';

FeatureCard.propTypes = {
  feature: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  isDemo: PropTypes.bool,
};

export default function FeaturesSection({ isDemo = false }) {
  const theme = useTheme();
  const { isSuperAdmin } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [hoveredStep, setHoveredStep] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [animatedStats, setAnimatedStats] = useState({
    organizations: 0,
    assessments: 0,
    candidates: 0,
    questions: 0,
  });

  useEffect(() => {
    // Animate stats on component mount
    const statsTargets = { organizations: 500, assessments: 12500, candidates: 85000, questions: 250000 };
    const duration = 2000;
    const steps = 60;
    const increment = {};
    
    Object.keys(statsTargets).forEach(key => {
      increment[key] = statsTargets[key] / steps;
    });

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedStats(statsTargets);
        return;
      }
      
      setAnimatedStats(prev => {
        const newStats = {};
        Object.keys(statsTargets).forEach(key => {
          newStats[key] = Math.min(
            Math.floor(prev[key] + increment[key]),
            statsTargets[key]
          );
        });
        return newStats;
      });
      
      currentStep++;
    }, duration / steps);

    return () => clearInterval(interval);
  }, []);

  const handleFeatureToggle = useCallback((title) => {
    setExpandedFeature(prev => prev === title ? null : title);
  }, []);

  const handleStepHover = useCallback((step) => setHoveredStep(step), []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderPlatformStats = useCallback(() => (
    <Fade in timeout={1200}>
      <Card sx={{ 
        p: 3, 
        mb: 4,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)}, ${alpha(theme.palette.secondary.dark, 0.9)})`,
        color: 'white',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          width: 200, 
          height: 200,
          background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.1)} 0%, transparent 70%)`,
          borderRadius: '50%',
          transform: 'translate(100px, -100px)',
        }} />
        
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
          Platform at Scale
        </Typography>
        
        <Grid container spacing={3}>
          {[
            { label: 'Organizations', value: animatedStats.organizations, icon: <Business /> },
            { label: 'Assessments', value: animatedStats.assessments.toLocaleString(), icon: <Assignment /> },
            { label: 'Candidates', value: animatedStats.candidates.toLocaleString(), icon: <People /> },
            { label: 'Questions', value: animatedStats.questions.toLocaleString(), icon: <DragIndicator /> },
          ].map((stat, index) => (
            <Grid item xs={6} sm={3} key={index}>
              <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  {stat.icon}
                </Box>
                <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5 }}>
                  {stat.value}
                  {index === 0 && '+'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {stat.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Fade>
  ), [animatedStats, theme]);

  const renderArchitectureOverview = useCallback(() => (
    <Fade in timeout={1000}>
      <Card sx={{ p: 4, mb: 4, bgcolor: alpha(theme.palette.info.light, 0.05) }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Enterprise Architecture
        </Typography>
        <Typography color="text.secondary" paragraph>
          Built for scalability, security, and performance with our multitenant architecture.
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {ARCHITECTURE_FEATURES.map((feature, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2, 
                borderRadius: 2,
                bgcolor: alpha(theme.palette[feature.color].light, 0.1),
                border: `1px solid ${alpha(theme.palette[feature.color].main, 0.2)}`,
              }}>
                <Avatar sx={{ 
                  mr: 2, 
                  bgcolor: theme.palette[feature.color].main,
                  color: 'white',
                }}>
                  {feature.icon}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Fade>
  ), [theme]);

  const renderAssessmentTypes = useCallback(() => (
    <Fade in timeout={1000}>
      <Card sx={{ p: 4, bgcolor: alpha(theme.palette.secondary.light, 0.05) }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Assessment Types
        </Typography>
        <Typography color="text.secondary" paragraph sx={{ mb: 3 }}>
          Support for various assessment formats across industries and use cases.
        </Typography>
        
        <Grid container spacing={2}>
          {ASSESSMENT_TYPES.map((item, idx) => (
            <Grid item xs={6} sm={4} md={3} key={idx}>
              <Box
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.light, 0.05),
                  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    bgcolor: alpha(theme.palette.primary.light, 0.1),
                  },
                }}
              >
                <Typography variant="h3" sx={{ mb: 1 }}>
                  {item.icon}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {item.type}
                </Typography>
                <Chip 
                  label={item.category} 
                  size="small" 
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Fade>
  ), [theme]);

  const renderLifecycle = useCallback(() => (
    <Fade in timeout={1000}>
      <Card sx={{ p: 4, bgcolor: alpha(theme.palette.success.light, 0.05) }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Assessment Lifecycle
        </Typography>
        <Typography color="text.secondary" paragraph sx={{ mb: 4 }}>
          Complete workflow from creation to insights in minutes.
        </Typography>
        
        <Box sx={{ position: 'relative' }}>
          {/* Progress line */}
          <LinearProgress 
            variant="determinate" 
            value={(hoveredStep ? hoveredStep : LIFECYCLE_STEPS.length) / LIFECYCLE_STEPS.length * 100} 
            sx={{ 
              position: 'absolute', 
              top: 40, 
              left: 40, 
              right: 40, 
              height: 4,
              zIndex: 0,
            }} 
          />
          
          <Grid container spacing={0}>
            {LIFECYCLE_STEPS.map((step, index) => (
              <Grid item xs={6} md={4} key={step.step}>
                <Box
                  onMouseEnter={() => handleStepHover(step.step)}
                  onMouseLeave={() => handleStepHover(null)}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 1,
                    transition: 'all 0.3s ease',
                    transform: hoveredStep === step.step ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: hoveredStep === step.step ? theme.palette.primary.main : theme.palette.background.paper,
                      color: hoveredStep === step.step ? 'white' : 'text.primary',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      mx: 'auto',
                      mb: 2,
                      fontSize: '2rem',
                      border: `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                      transition: 'all 0.3s ease',
                      boxShadow: hoveredStep === step.step ? 4 : 0,
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {step.description}
                  </Typography>
                  <Chip 
                    label={step.time} 
                    size="small" 
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Card>
    </Fade>
  ), [hoveredStep, theme]);

  return (
    <Box 
      component="section" 
      id="features-section"
      sx={{ 
        py: { xs: 8, md: 12 }, 
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 1)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.light, 0.1)} 0%, transparent 70%)`,
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -200,
          left: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.light, 0.08)} 0%, transparent 70%)`,
          zIndex: 0,
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 12 } }}>
            <Chip
              label="Enterprise Platform"
              color="primary"
              sx={{ mb: 3, fontWeight: 600 }}
              icon={<CheckCircle />}
            />
            <Typography
              variant="h2"
              fontWeight={800}
              sx={{
                mb: 3,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Built for Modern Organizations
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ 
                maxWidth: 800, 
                mx: 'auto', 
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              A comprehensive multitenant assessment platform designed for organizations of all sizes. 
              Super admin manages all subscriptions while each organization maintains complete data isolation.
            </Typography>
            
            {isDemo && isSuperAdmin && (
              <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
                <Typography variant="body2">
                  <strong>Super Admin Access:</strong> As the platform developer, you manage all organizations and subscriptions centrally.
                  Each organization operates independently with their own data and settings.
                </Typography>
              </Alert>
            )}
          </Box>
        </Fade>

        {/* Platform Stats */}
        {renderPlatformStats()}

        {/* Tabs for different views */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 6 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
          >
            <Tab label="Core Features" />
            <Tab label="Architecture" />
            <Tab label="Assessment Types" />
            <Tab label="Workflow" />
          </Tabs>
        </Box>

        {/* Tab content */}
        {activeTab === 0 && (
          <Grid container spacing={3} sx={{ mb: 8 }}>
            {CORE_FEATURES.map((feature, index) => (
              <Grid item xs={12} sm={6} lg={4} key={feature.title}>
                <FeatureCard
                  feature={feature}
                  index={index}
                  isExpanded={expandedFeature === feature.title}
                  onToggle={handleFeatureToggle}
                  isDemo={isDemo}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {activeTab === 1 && renderArchitectureOverview()}
        {activeTab === 2 && renderAssessmentTypes()}
        {activeTab === 3 && renderLifecycle()}

        {/* CTA */}
        <Fade in timeout={1500}>
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
              Ready to transform your assessment process?
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
                  px: 4, 
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 600,
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
                  px: 4, 
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 600,
                }}
              >
                Request Enterprise Demo
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              No credit card required • 14-day free trial • Support included
            </Typography>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}

FeaturesSection.displayName = 'FeaturesSection';

FeaturesSection.propTypes = {
  isDemo: PropTypes.bool,
};

FeaturesSection.defaultProps = {
  isDemo: false,
};
