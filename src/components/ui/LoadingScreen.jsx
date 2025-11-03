import React from 'react';
import { 
  Box, 
  CircularProgress, 
  Typography,
  Fade,
  useTheme,
  useMediaQuery
} from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Production-ready loading screen with accessibility, performance, and UX enhancements
 */
const LoadingScreen = ({ 
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

  // Delay showing loader to prevent flash for quick loads
  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  // Size mapping for consistent sizing
  const sizeMap = {
    small: { progress: 24, typography: 'body2' },
    medium: { progress: 40, typography: 'body1' },
    large: { progress: 56, typography: 'h6' }
  };

  const currentSize = sizeMap[size] || sizeMap.medium;

  // Don't render if delayed and not yet shown
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
        {/* Loading Spinner */}
        <Box
          sx={{
            position: 'relative',
            display: 'inline-flex',
            mb: isMobile ? 1.5 : 2
          }}
        >
          <CircularProgress 
            size={currentSize.progress}
            variant={progressVariant}
            value={progressValue}
            sx={{
              color: 'primary.main',
              ...(progressVariant === 'determinate' && {
                color: 'grey.300'
              })
            }}
          />
          
          {/* Determinate progress value display */}
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
                sx={{ fontWeight: 'medium' }}
              >
                {`${Math.round(progressValue || 0)}%`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Loading Message */}
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

        {/* Optional loading dots animation */}
        {progressVariant === 'indeterminate' && (
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 0.5, 
              mt: 1,
              opacity: 0.7
            }}
          >
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
};

LoadingScreen.propTypes = {
  /** Full screen mode - covers entire viewport */
  fullScreen: PropTypes.bool,
  
  /** Loading message to display */
  message: PropTypes.string,
  
  /** Size of the loading indicator */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  
  /** Show as overlay with backdrop */
  overlay: PropTypes.bool,
  
  /** Delay before showing loader (ms) - prevents flash for quick loads */
  delay: PropTypes.number,
  
  /** Progress variant - indeterminate or determinate */
  progressVariant: PropTypes.oneOf(['indeterminate', 'determinate']),
  
  /** Progress value for determinate variant (0-100) */
  progressValue: PropTypes.number,
  
  /** Additional CSS class */
  className: PropTypes.string,
  
  /** Additional styles */
  sx: PropTypes.object
};

LoadingScreen.defaultProps = {
  fullScreen: false,
  message: 'Loading...',
  size: 'medium',
  overlay: false,
  delay: 0,
  progressVariant: 'indeterminate'
};

// Add global styles for animations
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

// Inject global styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

export default React.memo(LoadingScreen);
