import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  Tooltip
} from '@mui/material';
import { 
  FormatQuote,
  ArrowBackIos,
  ArrowForwardIos,
  PlayCircle,
  PauseCircle,
  Verified
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const TESTIMONIALS = [
  { 
    id: 1, 
    name: 'Alex Thompson', 
    role: 'HR Director, TechCorp', 
    company: 'Fortune 500',
    rating: 5, 
    feedback: 'Assessly revolutionized our hiring process. The multi-role system and advanced analytics have saved us countless hours while improving candidate quality by 40%.', 
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    featured: true,
    stats: '40% faster hiring'
  },
  { 
    id: 2, 
    name: 'Sarah Chen', 
    role: 'Training Manager', 
    company: 'GlobalOrg Inc',
    rating: 4.5, 
    feedback: 'The custom question types and smart scoring features are unparalleled for employee training. Our team engagement scores improved by 65% in just 3 months.', 
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    featured: false,
    stats: '65% engagement boost'
  },
  { 
    id: 3, 
    name: 'Marcus Rodriguez', 
    role: 'Project Lead', 
    company: 'FinServe Solutions',
    rating: 5, 
    feedback: 'Enterprise-grade reliability and security meant zero downtime during our certification exams. The offline mode was a game-changer for remote locations.', 
    avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=100&h=100&fit=crop&crop=face',
    featured: true,
    stats: 'Zero downtime'
  },
  { 
    id: 4, 
    name: 'Dr. Emily Watson', 
    role: 'Academic Dean', 
    company: 'University Tech',
    rating: 5, 
    feedback: 'The analytics dashboard provided insights we never had before. We identified learning gaps and improved our curriculum based on real data.', 
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    featured: false,
    stats: 'Data-driven curriculum'
  },
  { 
    id: 5, 
    name: 'James Kim', 
    role: 'CTO', 
    company: 'StartupScale',
    rating: 4.5, 
    feedback: 'API integration was seamless and the support team was incredibly responsive. Scalable solution that grew with our startup needs.', 
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    featured: true,
    stats: 'Seamless scaling'
  },
  { 
    id: 6, 
    name: 'Lisa Wang', 
    role: 'Product Manager', 
    company: 'InnovateLabs',
    rating: 5, 
    feedback: 'The drag-and-drop builder reduced our assessment creation time by 80%. Our team can now focus on content quality rather than technical setup.', 
    avatar: 'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=100&h=100&fit=crop&crop=face',
    featured: false,
    stats: '80% faster creation'
  }
];

const TestimonialCard = React.memo(({ testimonial, isActive, onClick, index }) => {
  const theme = useTheme();

  return (
    <Zoom in timeout={600} style={{ delay: index * 100 }}>
      <Card 
        elevation={isActive ? 8 : 2}
        onClick={onClick}
        sx={{
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isActive ? 'scale(1.02)' : 'scale(1)',
          background: isActive 
            ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`
            : theme.palette.background.paper,
          border: `2px solid ${isActive ? theme.palette.primary.main : 'transparent'}`,
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px) scale(1.01)',
            boxShadow: 12,
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

          {/* Rating */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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

          {/* Stats Chip */}
          {testimonial.stats && (
            <Chip
              label={testimonial.stats}
              color="primary"
              variant="filled"
              size="small"
              sx={{ 
                mb: 2,
                fontWeight: 600,
                alignSelf: 'flex-start'
              }}
            />
          )}

          {/* Author */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
            <Avatar 
              src={testimonial.avatar} 
              alt={testimonial.name}
              sx={{ 
                mr: 2, 
                width: 48, 
                height: 48,
                border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
              }}
            />
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
              <Typography variant="caption" color="text.secondary" noWrap>
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
  index: PropTypes.number.isRequired
};

export default function Testimonials() {
  const theme = useTheme();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const autoPlayRef = useRef(null);

  const featuredTestimonials = useMemo(() => 
    TESTIMONIALS.filter(t => t.featured),
    []
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
  React.useEffect(() => {
    if (!autoPlay) return;

    autoPlayRef.current = setInterval(handleNext, 5000);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [autoPlay, handleNext]);

  const stats = useMemo(() => ({
    totalCompanies: '500+',
    averageRating: '4.8',
    countries: '50+',
    assessments: '1M+'
  }), []);

  return (
    <Box 
      component="section" 
      sx={{ 
        py: { xs: 8, md: 12 },
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
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
            radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.light, 0.05)} 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.light, 0.05)} 0%, transparent 50%)
          `,
          zIndex: 0
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Section Header */}
        <Fade in timeout={800}>
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Chip
              label="TRUSTED BY INDUSTRY LEADERS"
              color="primary"
              variant="outlined"
              sx={{ mb: 3, fontWeight: 600 }}
            />
            <Typography
              variant="h3"
              component="h2"
              sx={{
                fontWeight: 800,
                mb: 2,
                fontSize: { xs: '2.25rem', md: '3rem' },
                background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.text.secondary} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Loved by Teams Worldwide
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6
              }}
            >
              Discover why forward-thinking organizations choose Assessly to transform their assessment processes.
            </Typography>
          </Box>
        </Fade>

        {/* Stats Bar */}
        <Fade in timeout={1000}>
          <Grid container spacing={3} sx={{ mb: 8 }}>
            {Object.entries(stats).map(([key, value]) => (
              <Grid item xs={6} sm={3} key={key}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h4"
                    component="div"
                    fontWeight="bold"
                    color="primary"
                    sx={{ mb: 1 }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textTransform="uppercase"
                    letterSpacing={1}
                    fontSize="0.75rem"
                    fontWeight="medium"
                  >
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Fade>

        {/* Featured Testimonials Carousel */}
        <Box sx={{ position: 'relative', mb: 8 }}>
          <Grid container spacing={3}>
            {featuredTestimonials.map((testimonial, index) => (
              <Grid item xs={12} md={6} lg={4} key={testimonial.id}>
                <TestimonialCard
                  testimonial={testimonial}
                  isActive={activeTestimonial === index}
                  onClick={() => setActiveTestimonial(index)}
                  index={index}
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
                  boxShadow: 2,
                  '&:hover': { bgcolor: 'primary.main', color: 'white' }
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
                  boxShadow: 2
                }}
              >
                {autoPlay ? <PauseCircle /> : <PlayCircle />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Next testimonial">
              <IconButton 
                onClick={handleNext}
                sx={{ 
                  bgcolor: 'background.paper',
                  boxShadow: 2,
                  '&:hover': { bgcolor: 'primary.main', color: 'white' }
                }}
              >
                <ArrowForwardIos fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Carousel Indicators */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
            {featuredTestimonials.map((_, index) => (
              <Box
                key={index}
                onClick={() => setActiveTestimonial(index)}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: activeTestimonial === index ? 'primary.main' : 'action.disabled',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: activeTestimonial === index ? 'primary.dark' : 'action.active',
                    transform: 'scale(1.2)'
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        {/* All Testimonials Grid */}
        <Fade in timeout={1200}>
          <Box>
            <Typography
              variant="h5"
              component="h3"
              textAlign="center"
              fontWeight="bold"
              sx={{ mb: 4 }}
            >
              More Success Stories
            </Typography>
            <Grid container spacing={3}>
              {TESTIMONIALS.filter(t => !t.featured).map((testimonial, index) => (
                <Grid item xs={12} sm={6} key={testimonial.id}>
                  <TestimonialCard
                    testimonial={testimonial}
                    isActive={false}
                    onClick={() => {}}
                    index={index}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}
