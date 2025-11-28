// src/components/ui/LoadingScreen.jsx
import React from 'react';
import { 
  Box, 
  CircularProgress, 
  Typography, // ✅ ADDED: Missing import
  Fade,
  useTheme,
  useMediaQuery
} from '@mui/material';
import PropTypes from 'prop-types';

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
`;

// Inject global styles once
if (typeof document !== 'undefined' && !document.querySelector('#loading-screen-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'loading-screen-styles';
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

/**
 * Optimized loading screen component
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
  sx = {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [show, setShow] = React.useState(delay === 0);

  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  const sizeMap = {
    small: { progress: 24, typography: 'body2' },
    medium: { progress: 40, typography: 'body1' },
    large: { progress: 56, typography: 'h6' }
  };

  const currentSize = sizeMap[size] || sizeMap.medium;

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
            ? (fullScreen ? 'background.default' : 'rgba(255, 255, 255, 0.8)')
            : 'transparent',
          backdropFilter: overlay && !fullScreen ? 'blur(4px)' : 'none',
          zIndex: fullScreen || overlay ? theme.zIndex.modal - 1 : 'auto',
          ...sx
        }}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <Box sx={{ position: 'relative', display: 'inline-flex', mb: isMobile ? 1.5 : 2 }}>
          <CircularProgress 
            size={currentSize.progress}
            variant={progressVariant}
            value={progressValue}
            sx={{
              color: 'primary.main',
              ...(progressVariant === 'determinate' && { color: 'grey.300' })
            }}
          />
          
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
              <Typography variant="caption" component="div" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                {`${Math.round(progressValue || 0)}%`}
              </Typography>
            </Box>
          )}
        </Box>

        <Typography 
          variant={currentSize.typography}
          component="p"
          sx={{ 
            color: 'text.secondary',
            textAlign: 'center',
            maxWidth: '200px',
            lineHeight: 1.4
          }}
        >
          {message}
        </Typography>

        {progressVariant === 'indeterminate' && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, opacity: 0.7 }}>
            {[0, 1, 2].map((dot) => (
              <Box
                key={dot}
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  animation: 'pulse 1.4s ease-in-out infinite both',
                  animationDelay: `${dot * 0.16}s`
                }}
              />
            ))}
          </Box>
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
  sx: PropTypes.object
};

LoadingScreen.displayName = 'LoadingScreen';

export default LoadingScreen;
