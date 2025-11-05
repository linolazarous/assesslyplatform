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
  }
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
  { step: 1, title: "Create Assessment", description: "Drag-and-drop builder with 15+ question types", icon: "🎯" },
  { step: 2, title: "Distribute & Invite", description: "Multi-channel invitations with tracking", icon: "📤" },
  { step: 3, title: "Collect Responses", description: "Secure & offline-capable response collection", icon: "📥" },
  { step: 4, title: "Generate Reports", description: "PDF exports with actionable insights", icon: "📊" },
  { step: 5, title: "Analyze & Optimize", description: "AI-powered analytics for data-driven decisions", icon: "🚀" }
];

const FeatureCard = React.memo(({ feature, index, isExpanded, onToggle }) => {
  const theme = useTheme();

  return (
    <Zoom in timeout={800} style={{ transitionDelay: `${index * 100}ms` }}>
      <Card
        elevation={isExpanded ? 8 : 2}
        onClick={() => onToggle(feature.title)}
        sx={{
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: 1,
          borderColor: isExpanded ? theme.palette.primary.main : 'divider',
          background: isExpanded
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)}, ${alpha(theme.palette.background.paper, 0.9)})`
            : theme.palette.background.paper,
          '&:hover': { transform: 'translateY(-6px)', boxShadow: 8 }
        }}
      >
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: `${feature.color}.main`,
                color: 'white',
                mr: 2
              }}
            >
              <feature.icon sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight="bold" noWrap>
                {feature.title}
              </Typography>
            </Box>
            <Tooltip title={isExpanded ? "Show less" : "Learn more"}>
              <IconButton size="small">
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Tooltip>
          </Box>

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

          {isExpanded && (
            <Fade in timeout={400}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                  Key Features:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0, '& li': { display: 'flex', alignItems: 'flex-start', mb: 1 } }}>
                  {feature.details.map((detail, idx) => (
                    <Box component="li" key={idx}>
                      <CheckCircle sx={{ fontSize: 16, color: 'success.main', mr: 1.5, mt: 0.25 }} />
                      <Typography variant="body2" color="text.secondary">{detail}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Fade>
          )}

          <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="primary">
              {isExpanded ? 'Click to collapse' : 'Click to expand'}
            </Typography>
            {!isExpanded && <PlayCircle sx={{ fontSize: 16, color: 'primary.main', opacity: 0.7 }} />}
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
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [hoveredStep, setHoveredStep] = useState(null);

  const handleFeatureToggle = useCallback((title) => {
    setExpandedFeature(prev => prev === title ? null : title);
  }, []);

  const handleStepHover = useCallback((step) => setHoveredStep(step), []);

  const assessmentTypes = useMemo(() => ASSESSMENT_TYPES.map(type => ({
    label: type,
    icon: <CheckCircle fontSize="small" />
  })), []);

  return (
    <Box component="section" sx={{ py: { xs: 6, md: 10 }, background: alpha(theme.palette.background.default, 0.98) }}>
      <Container maxWidth="lg">
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                mb: 2,
                fontSize: { xs: '2.25rem', md: '3rem' },
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Platform Capabilities
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
              Everything you need to create, manage, and analyze assessments at scale with enterprise-grade reliability.
            </Typography>
          </Box>
        </Fade>

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

        <Grid container spacing={4} alignItems="stretch">
          {/* Assessment Types */}
          <Grid item xs={12} md={5}>
            <Fade in timeout={1000}>
              <Card sx={{ p: 4, border: 1, borderColor: 'divider', background: alpha(theme.palette.primary.light, 0.05) }}>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>Diverse Assessment Types</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>Support for various assessment formats to meet your organizational needs.</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {assessmentTypes.map((type, idx) => (
                    <Zoom key={type.label} in timeout={500} style={{ transitionDelay: `${idx * 50}ms` }}>
                      <Chip label={type.label} icon={type.icon} color="secondary" variant="outlined" />
                    </Zoom>
                  ))}
                </Box>
              </Card>
            </Fade>
          </Grid>

          {/* Assessment Lifecycle */}
          <Grid item xs={12} md={7}>
            <Fade in timeout={1000}>
              <Card sx={{ p: 4, border: 1, borderColor: 'divider', background: alpha(theme.palette.info.light, 0.05) }}>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>Complete Assessment Lifecycle</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {LIFECYCLE_STEPS.map(step => (
                    <Box
                      key={step.step}
                      onMouseEnter={() => handleStepHover(step.step)}
                      onMouseLeave={() => handleStepHover(null)}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        p: 2,
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        bgcolor: hoveredStep === step.step ? 'action.hover' : 'transparent',
                        transform: hoveredStep === step.step ? 'translateX(6px)' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        flexShrink: 0
                      }}>
                        {step.icon}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight={600}>{step.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{step.description}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Card>
            </Fade>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
