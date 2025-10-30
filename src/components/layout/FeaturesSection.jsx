import React, { useState, useMemo, useCallback } from 'react';
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
  useMediaQuery
} from '@mui/material';
import { 
  People, 
  DragIndicator, 
  PieChart, 
  Sync, 
  CheckCircle,
  ExpandMore,
  ExpandLess,
  PlayCircle
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const CORE_FEATURES = [
  { 
    icon: People, 
    title: 'Multi-role System', 
    description: 'Admin, Assessor, and Candidate roles with granular permissions and advanced access controls.', 
    color: 'primary',
    details: [
      'Role-based access control (RBAC)',
      'Custom permission sets',
      'Team management dashboard',
      'Audit logs and activity tracking'
    ]
  },
  { 
    icon: DragIndicator, 
    title: 'Assessment Builder', 
    description: 'Intuitive drag-and-drop interface with 15+ question types and advanced formatting options.', 
    color: 'secondary',
    details: [
      '15+ question types',
      'Drag-and-drop interface',
      'Rich text editor',
      'Template library',
      'Bulk import/export'
    ]
  },
  { 
    icon: PieChart, 
    title: 'Smart Analytics', 
    description: 'Real-time dashboards providing actionable insights with AI-powered performance predictions.', 
    color: 'info',
    details: [
      'Real-time analytics',
      'AI-powered insights',
      'Custom reporting',
      'Performance trends',
      'Export to PDF/Excel'
    ]
  },
  { 
    icon: Sync, 
    title: 'Offline Mode', 
    description: 'Work without internet access with automatic synchronization and conflict resolution.', 
    color: 'warning',
    details: [
      'Offline assessment taking',
      'Automatic sync when online',
      'Conflict resolution',
      'Progress persistence',
      'Low bandwidth optimization'
    ]
  },
];

const ASSESSMENT_TYPES = [
  'Exams & Quizzes', 
  'Employee Evaluations', 
  '360° Feedback', 
  'Surveys & Questionnaires', 
  'Certification Tests',
  'Skills Assessment',
  'Personality Tests',
  'Pre-employment Screening'
];

const LIFECYCLE_STEPS = [
  {
    step: 1,
    title: "Create Assessment",
    description: "Drag-and-drop builder with 15+ question types",
    icon: "🎯"
  },
  {
    step: 2,
    title: "Distribute & Invite",
    description: "Multi-channel invitations with tracking",
    icon: "📤"
  },
  {
    step: 3,
    title: "Collect Responses",
    description: "Secure & offline-capable response collection",
    icon: "📥"
  },
  {
    step: 4,
    title: "Generate Reports",
    description: "PDF exports with actionable insights",
    icon: "📊"
  },
  {
    step: 5,
    title: "Analyze & Optimize",
    description: "AI-powered analytics for data-driven decisions",
    icon: "🚀"
  }
];

const FeatureCard = React.memo(({ feature, index, isExpanded, onToggle }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Zoom in timeout={800} style={{ delay: index * 100 }}>
      <Card 
        elevation={isExpanded ? 8 : 2}
        sx={{
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: isExpanded 
            ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`
            : theme.palette.background.paper,
          border: `1px solid ${isExpanded ? theme.palette.primary.main : theme.palette.divider}`,
          position: 'relative',
          overflow: 'visible',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: 12,
            borderColor: theme.palette.primary.main,
          },
          '&::before': isExpanded ? {
            content: '""',
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            borderRadius: theme.shape.borderRadius * 1.5,
            zIndex: -1,
            animation: 'borderGlow 2s ease-in-out infinite alternate'
          } : {}
        }}
        onClick={() => onToggle(feature.title)}
      >
        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 60,
                height: 60,
                borderRadius: 3,
                bgcolor: `${feature.color}.main`,
                color: 'white',
                mr: 2,
                flexShrink: 0
              }}
            >
              <feature.icon sx={{ fontSize: 28 }} />
            </Box>
            
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography 
                variant="h6" 
                fontWeight="bold" 
                gutterBottom
                sx={{ 
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  lineHeight: 1.2 
                }}
              >
                {feature.title}
              </Typography>
            </Box>
            
            <Tooltip title={isExpanded ? "Show less" : "Learn more"}>
              <IconButton 
                size="small" 
                sx={{ 
                  ml: 1,
                  color: 'text.secondary',
                  transition: 'all 0.2s ease',
                  transform: isExpanded ? 'rotate(180deg)' : 'none'
                }}
              >
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Description */}
          <Typography 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: isExpanded ? 'unset' : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {feature.description}
          </Typography>

          {/* Expanded Details */}
          {isExpanded && (
            <Fade in timeout={500}>
              <Box sx={{ mt: 2 }}>
                <Typography 
                  variant="subtitle2" 
                  fontWeight="bold" 
                  color="primary" 
                  sx={{ mb: 1.5 }}
                >
                  Key Features:
                </Typography>
                <Box component="ul" sx={{ 
                  pl: 2, 
                  m: 0,
                  '& li': {
                    mb: 1,
                    display: 'flex',
                    alignItems: 'flex-start'
                  }
                }}>
                  {feature.details.map((detail, idx) => (
                    <Box component="li" key={idx}>
                      <CheckCircle 
                        sx={{ 
                          fontSize: 16, 
                          color: 'success.main', 
                          mr: 1.5,
                          mt: 0.25,
                          flexShrink: 0
                        }} 
                      />
                      <Typography variant="body2" color="text.secondary">
                        {detail}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Fade>
          )}

          {/* Interactive Indicator */}
          <Box 
            sx={{ 
              mt: 'auto',
              pt: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Typography 
              variant="caption" 
              color="primary" 
              fontWeight="medium"
              sx={{ 
                opacity: isExpanded ? 1 : 0.7,
                transition: 'opacity 0.2s ease'
              }}
            >
              {isExpanded ? 'Click to collapse' : 'Click to expand'}
            </Typography>
            
            {!isExpanded && (
              <PlayCircle 
                sx={{ 
                  fontSize: 16, 
                  color: 'primary.main',
                  opacity: 0.7
                }} 
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );
});

FeatureCard.propTypes = {
  feature: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

export default function FeaturesSection() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [hoveredStep, setHoveredStep] = useState(null);

  const handleFeatureToggle = useCallback((featureTitle) => {
    setExpandedFeature(prev => prev === featureTitle ? null : featureTitle);
  }, []);

  const handleStepHover = useCallback((step) => {
    setHoveredStep(step);
  }, []);

  const assessmentTypes = useMemo(() => 
    ASSESSMENT_TYPES.map(type => ({
      label: type,
      icon: <CheckCircle fontSize="small" />
    })), 
    []
  );

  return (
    <Box 
      component="section" 
      id="features-section"
      sx={{ 
        py: { xs: 6, md: 10 },
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.light, 0.1)} 0%, transparent 70%)`,
          zIndex: 0
        }}
      />
      
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Section Header */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Typography
              variant="h3"
              component="h2"
              sx={{
                fontWeight: 800,
                mb: 2,
                fontSize: { xs: '2.25rem', md: '3rem' },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Platform Capabilities
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
                fontSize: { xs: '1rem', md: '1.125rem' }
              }}
            >
              Everything you need to create, manage, and analyze assessments at scale with enterprise-grade reliability.
            </Typography>
          </Box>
        </Fade>

        {/* Core Features Grid */}
        <Grid container spacing={3} sx={{ mb: { xs: 8, md: 12 } }}>
          {CORE_FEATURES.map((feature, index) => (
            <Grid item xs={12} sm={6} lg={3} key={feature.title}>
              <FeatureCard
                feature={feature}
                index={index}
                isExpanded={expandedFeature === feature.title}
                onToggle={handleFeatureToggle}
              />
            </Grid>
          ))}
        </Grid>

        {/* Additional Features */}
        <Grid container spacing={4} alignItems="stretch">
          {/* Assessment Types */}
          <Grid item xs={12} md={5}>
            <Fade in timeout={1000} style={{ delay: 400 }}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  p: 4,
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
                  border: `1px solid ${theme.palette.divider}`,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                  }
                }}
              >
                <Typography 
                  variant="h4" 
                  fontWeight="bold" 
                  sx={{ mb: 3 }}
                >
                  Diverse Assessment Types
                </Typography>
                <Typography 
                  color="text.secondary" 
                  sx={{ mb: 3, lineHeight: 1.6 }}
                >
                  Support for various assessment formats to meet your specific organizational needs and use cases.
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {assessmentTypes.map((type, index) => (
                    <Zoom in key={type.label} timeout={600} style={{ delay: 500 + (index * 100) }}>
                      <Chip
                        label={type.label}
                        icon={type.icon}
                        color="secondary"
                        variant="outlined"
                        sx={{ 
                          mb: 1,
                          fontWeight: 500,
                          '& .MuiChip-icon': {
                            color: 'success.main'
                          }
                        }}
                      />
                    </Zoom>
                  ))}
                </Box>
              </Card>
            </Fade>
          </Grid>

          {/* Assessment Lifecycle */}
          <Grid item xs={12} md={7}>
            <Fade in timeout={1000} style={{ delay: 600 }}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  p: 4,
                  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
                  border: `1px solid ${theme.palette.divider}`,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: `linear-gradient(90deg, ${theme.palette.info.main}, ${theme.palette.success.main})`
                  }
                }}
              >
                <Typography 
                  variant="h4" 
                  fontWeight="bold" 
                  sx={{ mb: 3 }}
                >
                  Complete Assessment Lifecycle
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {LIFECYCLE_STEPS.map((step, index) => (
                    <Box 
                      key={step.step}
                      onMouseEnter={() => handleStepHover(step.step)}
                      onMouseLeave={() => handleStepHover(null)}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        p: 2,
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        bgcolor: hoveredStep === step.step ? 'action.hover' : 'transparent',
                        transform: hoveredStep === step.step ? 'translateX(8px)' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          flexShrink: 0,
                          transition: 'all 0.3s ease',
                          transform: hoveredStep === step.step ? 'scale(1.1)' : 'none'
                        }}
                      >
                        {step.icon}
                      </Box>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography 
                          variant="h6" 
                          fontWeight="600" 
                          sx={{ mb: 0.5 }}
                        >
                          {step.title}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ lineHeight: 1.5 }}
                        >
                          {step.description}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Card>
            </Fade>
          </Grid>
        </Grid>
      </Container>

      {/* Global Animations */}
      <style jsx global>{`
        @keyframes borderGlow {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </Box>
  );
}
