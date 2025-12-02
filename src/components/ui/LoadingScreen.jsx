// src/components/ui/LoadingScreen.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Fade,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Chip,
  Alert,
  Collapse,
  IconButton,
  Stack,
  alpha
} from '@mui/material';
import {
  Refresh,
  Error,
  CheckCircle,
  HourglassEmpty,
  CloudSync,
  AdminPanelSettings,
  Business,
  Assessment,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';

// Global styles - only inject once
const globalStyles = `
  @keyframes pulse {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: 200px 0;
    }
  }
`;

// Inject global styles once
if (typeof document !== 'undefined' && !document.querySelector('#loading-screen-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'loading-screen-styles';
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

/**
 * Enhanced LoadingScreen for Multitenant Assessment Platform
 */
const LoadingScreen = React.memo(({ 
  fullScreen = false, 
  message = 'Loading...',
  size = 'medium',
  overlay = false,
  delay = 0,
  progressVariant = 'indeterminate',
  progressValue,
  className,
  sx = {},
  type = 'default', // 'default', 'organization', 'assessment', 'data'
  showRetry = false,
  onRetry,
  error = null,
  showSuperAdminInfo = false,
  showOrganizationContext = false,
  loadingSteps = null,
  currentStep = 0,
  estimatedTime = null,
}) => {
  const theme = useTheme();
  const { isSuperAdmin, currentOrganization } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [show, setShow] = useState(delay === 0);
  const [currentStepProgress, setCurrentStepProgress] = useState(0);
  const [loadingTips] = useState([
    "Preparing your assessment environment...",
    "Loading organization data...",
    "Synchronizing assessment results...",
    "Setting up real-time analytics...",
    "Configuring security protocols...",
  ]);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  // Rotate loading tips
  useEffect(() => {
    if (type === 'data' || type === 'assessment') {
      const interval = setInterval(() => {
        setCurrentTip(prev => (prev + 1) % loadingTips.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [type, loadingTips.length]);

  // Simulate step progress
  useEffect(() => {
    if (loadingSteps && currentStep < loadingSteps.length) {
      const interval = setInterval(() => {
        setCurrentStepProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [loadingSteps, currentStep]);

  const sizeMap = {
    small: { progress: 24, typography: 'body2', spacing: 1 },
    medium: { progress: 40, typography: 'body1', spacing: 2 },
    large: { progress: 56, typography: 'h6', spacing: 3 }
  };

  const typeIcons = {
    default: <HourglassEmpty />,
    organization: <Business />,
    assessment: <Assessment />,
    data: <CloudSync />,
    error: <Error />,
  };

  const typeColors = {
    default: 'primary',
    organization: 'info',
    assessment: 'warning',
    data: 'success',
    error: 'error',
  };

  const currentSize = sizeMap[size] || sizeMap.medium;
  const currentColor = typeColors[type] || 'primary';
  const currentIcon = typeIcons[type];

  const getDefaultMessage = () => {
    if (error) return 'Something went wrong';
    switch (type) {
      case 'organization':
        return 'Loading organization data...';
      case 'assessment':
        return 'Preparing assessment...';
      case 'data':
        return 'Processing data...';
      default:
        return 'Loading...';
    }
  };

  const renderOrganizationContext = () => {
    if (!showOrganizationContext || !currentOrganization) return null;

    return (
      <Fade in timeout={500}>
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          borderRadius: 2,
          bgcolor: alpha(theme.palette.info.light, 0.1),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          maxWidth: 300,
          textAlign: 'center',
        }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 1 }}>
            <Business fontSize="small" />
            <Typography variant="caption" fontWeight="medium">
              Current Organization
            </Typography>
          </Stack>
          <Typography variant="body2" fontWeight="bold">
            {currentOrganization.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Plan: {currentOrganization.plan || 'Free'}
          </Typography>
        </Box>
      </Fade>
    );
  };

  const renderSuperAdminInfo = () => {
    if (!showSuperAdminInfo || !isSuperAdmin) return null;

    return (
      <Fade in timeout={600}>
        <Alert 
          severity="info" 
          icon={<AdminPanelSettings />}
          sx={{ 
            mt: 2,
            maxWidth: 400,
            '& .MuiAlert-message': { fontSize: '0.875rem' }
          }}
        >
          <Typography variant="body2">
            <strong>Super Admin View:</strong> Loading data across all organizations...
          </Typography>
        </Alert>
      </Fade>
    );
  };

  const renderLoadingSteps = () => {
    if (!loadingSteps || loadingSteps.length === 0) return null;

    return (
      <Box sx={{ mt: 3, width: '100%', maxWidth: 400 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {loadingSteps[currentStep]?.title || 'Processing...'}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={currentStepProgress} 
            sx={{ flexGrow: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {currentStepProgress}%
          </Typography>
        </Box>
        
        {estimatedTime && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Estimated time: {estimatedTime}
          </Typography>
        )}
        
        <Box sx={{ mt: 1 }}>
          {loadingSteps.map((step, index) => (
            <Box 
              key={index}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 0.5,
                opacity: index < currentStep ? 0.7 : index === currentStep ? 1 : 0.4,
              }}
            >
              {index < currentStep ? (
                <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
              ) : index === currentStep ? (
                <CircularProgress size={16} />
              ) : (
                <HourglassEmpty sx={{ fontSize: 16 }} />
              )}
              <Typography variant="caption">
                {step.title}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderErrorState = () => {
    if (!error) return null;

    return (
      <Fade in timeout={500}>
        <Alert 
          severity="error" 
          sx={{ 
            mt: 2,
            maxWidth: 400,
            '& .MuiAlert-message': { fontSize: '0.875rem' }
          }}
        >
          <Typography variant="body2" gutterBottom>
            {error.message || 'Failed to load data'}
          </Typography>
          {showRetry && onRetry && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Refresh />}
              onClick={onRetry}
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          )}
        </Alert>
      </Fade>
    );
  };

  const renderLoadingTip = () => {
    if (type !== 'data' && type !== 'assessment') return null;

    return (
      <Fade in key={currentTip} timeout={500}>
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ 
            mt: 2,
            maxWidth: 400,
            textAlign: 'center',
            fontStyle: 'italic',
            display: 'block',
          }}
        >
          💡 {loadingTips[currentTip]}
        </Typography>
      </Fade>
    );
  };

  if (!show && delay > 0) {
    return null;
  }

  return (
    <Fade in={show} timeout={300}>
      <Box
        className={`loading-screen ${className || ''}`}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: fullScreen ? '100vh' : '200px',
          width: '100%',
          position: fullScreen || overlay ? 'fixed' : 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: overlay 
            ? (fullScreen 
                ? theme.palette.background.default 
                : alpha(theme.palette.background.paper, 0.9))
            : 'transparent',
          backdropFilter: overlay ? 'blur(8px)' : 'none',
          zIndex: fullScreen || overlay ? theme.zIndex.modal - 1 : 'auto',
          ...sx
        }}
        role="status"
        aria-live="polite"
        aria-label={message || getDefaultMessage()}
      >
        {/* Animated background for full-screen loads */}
        {fullScreen && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(90deg, 
                ${alpha(theme.palette.primary.light, 0.05)} 0%, 
                ${alpha(theme.palette.secondary.light, 0.05)} 50%, 
                ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite linear',
              opacity: 0.5,
            }}
          />
        )}

        <Box sx={{ 
          position: 'relative', 
          display: 'inline-flex', 
          mb: isMobile ? 1.5 : currentSize.spacing,
          zIndex: 1,
        }}>
          {/* Outer progress circle */}
          <CircularProgress 
            size={currentSize.progress}
            variant={progressVariant}
            value={progressValue || currentStepProgress}
            sx={{
              color: `${currentColor}.main`,
              ...(progressVariant === 'determinate' && { 
                color: alpha(theme.palette[currentColor].main, 0.2),
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }),
              animation: progressVariant === 'indeterminate' ? 'float 2s ease-in-out infinite' : 'none',
            }}
          />
          
          {/* Icon in center */}
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${currentColor}.main`,
            }}
          >
            {React.cloneElement(currentIcon, { fontSize: currentSize.progress * 0.4 })}
          </Box>

          {/* Percentage for determinate */}
          {progressVariant === 'determinate' && (
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography 
                variant="caption" 
                component="div" 
                color="text.secondary" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: currentSize.progress * 0.2,
                }}
              >
                {`${Math.round(progressValue || currentStepProgress)}%`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Main message */}
        <Typography 
          variant={currentSize.typography}
          component="p"
          sx={{ 
            color: 'text.primary',
            textAlign: 'center',
            maxWidth: '400px',
            lineHeight: 1.4,
            fontWeight: 500,
            mb: error ? 2 : 0,
            zIndex: 1,
          }}
        >
          {message || getDefaultMessage()}
        </Typography>

        {/* Loading tip rotation */}
        {renderLoadingTip()}

        {/* Organization context */}
        {renderOrganizationContext()}

        {/* Super admin info */}
        {renderSuperAdminInfo()}

        {/* Loading steps */}
        {renderLoadingSteps()}

        {/* Error state */}
        {renderErrorState()}

        {/* Loading dots for indeterminate */}
        {progressVariant === 'indeterminate' && !error && (
          <Box sx={{ 
            display: 'flex', 
            gap: 0.5, 
            mt: 1, 
            opacity: 0.7,
            zIndex: 1,
          }}>
            {[0, 1, 2].map((dot) => (
              <Box
                key={dot}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: `${currentColor}.main`,
                  animation: 'pulse 1.4s ease-in-out infinite both',
                  animationDelay: `${dot * 0.16}s`
                }}
              />
            ))}
          </Box>
        )}

        {/* Platform identifier for full-screen loads */}
        {fullScreen && (
          <Fade in timeout={1000}>
            <Box sx={{ 
              position: 'absolute', 
              bottom: theme.spacing(4),
              textAlign: 'center',
            }}>
              <Typography variant="caption" color="text.secondary">
                Assessly Platform • Enterprise Assessment Solution
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                v{process.env.REACT_APP_VERSION || '1.0.0'}
              </Typography>
            </Box>
          </Fade>
        )}
      </Box>
    </Fade>
  );
});

LoadingScreen.propTypes = {
  fullScreen: PropTypes.bool,
  message: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  overlay: PropTypes.bool,
  delay: PropTypes.number,
  progressVariant: PropTypes.oneOf(['indeterminate', 'determinate']),
  progressValue: PropTypes.number,
  className: PropTypes.string,
  sx: PropTypes.object,
  type: PropTypes.oneOf(['default', 'organization', 'assessment', 'data', 'error']),
  showRetry: PropTypes.bool,
  onRetry: PropTypes.func,
  error: PropTypes.shape({
    message: PropTypes.string,
  }),
  showSuperAdminInfo: PropTypes.bool,
  showOrganizationContext: PropTypes.bool,
  loadingSteps: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
  })),
  currentStep: PropTypes.number,
  estimatedTime: PropTypes.string,
};

LoadingScreen.defaultProps = {
  fullScreen: false,
  message: '',
  size: 'medium',
  overlay: false,
  delay: 0,
  progressVariant: 'indeterminate',
  showRetry: false,
  type: 'default',
  showSuperAdminInfo: false,
  showOrganizationContext: false,
  currentStep: 0,
};

LoadingScreen.displayName = 'LoadingScreen';

export default LoadingScreen;
