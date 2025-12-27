// src/components/ui/AnimatedCounter.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Typography, 
  Box, 
  Tooltip, 
  useTheme,
  alpha,
  Fade,
  Zoom,
  Chip,
  Stack,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
  Info,
  Business,
  People,
  Assessment,
  Analytics,
  Timer,
  Speed,
} from '@mui/icons-material';
import PropTypes from 'prop-types';

const AnimatedCounter = ({ 
  value, 
  duration = 2000, 
  prefix = '', 
  suffix = '',
  variant = 'h4',
  color = 'primary',
  fontWeight = 800,
  showTrend = false,
  previousValue = null,
  label = '',
  description = '',
  icon = null,
  size = 'medium',
  precision = 0,
  animateOnMount = true,
  showRefresh = false,
  onRefresh,
  format = 'number', // 'number', 'percentage', 'currency', 'duration'
  currency = 'USD',
  locale = 'en-US',
  textAlign = 'center',
  sx = {},
  showTooltip = false,
  tooltipTitle = '',
  showOrganizationContext = false,
  organizationName = '',
}) => {
  const theme = useTheme();
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(!animateOnMount);
  const [isAnimating, setIsAnimating] = useState(false);
  const [previousCount, setPreviousCount] = useState(previousValue);
  const ref = useRef(null);
  
  // Parse numeric value from various formats
  const numericValue = useMemo(() => {
    if (typeof value === 'number') return value;
    
    const strValue = value.toString();
    
    switch (format) {
      case 'percentage':
        return parseFloat(strValue.replace('%', '')) || 0;
      case 'currency':
        return parseFloat(strValue.replace(/[^0-9.-]+/g, '')) || 0;
      case 'duration':
        // Convert duration strings to seconds (e.g., "2m" -> 120)
        const match = strValue.match(/(\d+)([smhd])/);
        if (match) {
          const [, num, unit] = match;
          const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
          return parseInt(num) * (multipliers[unit] || 1);
        }
        return parseInt(strValue) || 0;
      default:
        return parseInt(strValue.replace(/[^0-9]/g, '')) || 0;
    }
  }, [value, format]);
  
  // Calculate trend percentage
  const trendPercentage = useMemo(() => {
    if (!previousValue || previousValue === 0) return 0;
    return ((numericValue - previousValue) / previousValue) * 100;
  }, [numericValue, previousValue]);
  
  // Determine trend direction and color
  const trendInfo = useMemo(() => {
    if (trendPercentage > 0) {
      return {
        direction: 'up',
        color: 'success',
        icon: <TrendingUp />,
        text: `+${trendPercentage.toFixed(1)}%`,
      };
    } else if (trendPercentage < 0) {
      return {
        direction: 'down',
        color: 'error',
        icon: <TrendingDown />,
        text: `${trendPercentage.toFixed(1)}%`,
      };
    }
    return {
      direction: 'flat',
      color: 'warning',
      icon: <TrendingFlat />,
      text: '0%',
    };
  }, [trendPercentage]);
  
  // Get appropriate icon based on label or format
  const counterIcon = useMemo(() => {
    if (icon) return icon;
    
    if (label.toLowerCase().includes('organization')) return <Business />;
    if (label.toLowerCase().includes('user') || label.toLowerCase().includes('people')) return <People />;
    if (label.toLowerCase().includes('assessment')) return <Assessment />;
    if (label.toLowerCase().includes('analytics') || label.toLowerCase().includes('score')) return <Analytics />;
    if (label.toLowerCase().includes('time') || label.toLowerCase().includes('duration')) return <Timer />;
    if (label.toLowerCase().includes('speed') || label.toLowerCase().includes('performance')) return <Speed />;
    
    return null;
  }, [icon, label]);
  
  // Format the final displayed value
  const formatDisplayValue = useCallback((num) => {
    let formattedNum = num;
    
    // Apply precision
    if (precision > 0) {
      formattedNum = parseFloat(num.toFixed(precision));
    }
    
    switch (format) {
      case 'percentage':
        return `${prefix}${formattedNum.toLocaleString(locale)}${suffix || '%'}`;
        
      case 'currency':
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(formattedNum);
        
      case 'duration':
        // Format seconds into readable time
        if (formattedNum < 60) {
          return `${formattedNum}s`;
        } else if (formattedNum < 3600) {
          const minutes = Math.floor(formattedNum / 60);
          const seconds = formattedNum % 60;
          return `${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`;
        } else if (formattedNum < 86400) {
          const hours = Math.floor(formattedNum / 3600);
          const minutes = Math.floor((formattedNum % 3600) / 60);
          return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
        } else {
          const days = Math.floor(formattedNum / 86400);
          const hours = Math.floor((formattedNum % 86400) / 3600);
          return `${days}d${hours > 0 ? ` ${hours}h` : ''}`;
        }
        
      default:
        return `${prefix}${formattedNum.toLocaleString(locale)}${suffix}`;
    }
  }, [prefix, suffix, format, locale, currency, precision]);
  
  // Set up intersection observer for animation trigger
  useEffect(() => {
    if (!animateOnMount) {
      setCount(numericValue);
      setIsVisible(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px',
      }
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animateOnMount, numericValue]);
  
  // Animation logic
  useEffect(() => {
    if (!isVisible || !animateOnMount) return;
    
    setIsAnimating(true);
    let start = 0;
    const end = numericValue;
    const increment = end / (duration / 16); // 60fps
    let animationFrameId;
    
    const animate = () => {
      start += increment;
      if (start >= end) {
        setCount(end);
        setIsAnimating(false);
        setPreviousCount(previousValue);
        return;
      }
      setCount(Math.floor(start));
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVisible, numericValue, duration, animateOnMount, previousValue]);
  
  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      // Trigger re-animation
      setIsVisible(false);
      setCount(0);
      setTimeout(() => {
        setIsVisible(true);
      }, 100);
    }
  }, [onRefresh]);
  
  const sizeStyles = useMemo(() => {
    const sizes = {
      small: { 
        typography: 'h6', 
        iconSize: 20,
        spacing: 1,
        trendSize: 'small',
      },
      medium: { 
        typography: 'h4', 
        iconSize: 24,
        spacing: 1.5,
        trendSize: 'medium',
      },
      large: { 
        typography: 'h2', 
        iconSize: 32,
        spacing: 2,
        trendSize: 'medium',
      },
    };
    return sizes[size] || sizes.medium;
  }, [size]);
  
  const content = (
    <Box
      ref={ref}
      sx={{
        textAlign,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: textAlign === 'center' ? 'center' : 
                   textAlign === 'right' ? 'flex-end' : 'flex-start',
        ...sx,
      }}
    >
      {/* Label and Icon */}
      {(label || counterIcon) && (
        <Stack 
          direction="row" 
          alignItems="center" 
          spacing={1}
          sx={{ 
            mb: sizeStyles.spacing,
            justifyContent: textAlign === 'center' ? 'center' : 
                          textAlign === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          {counterIcon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: sizeStyles.iconSize + 8,
                height: sizeStyles.iconSize + 8,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette[color].main, 0.1),
                color: `${color}.main`,
              }}
            >
              {React.cloneElement(counterIcon, { 
                sx: { fontSize: sizeStyles.iconSize } 
              })}
            </Box>
          )}
          
          {label && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ 
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: size === 'small' ? '0.75rem' : '0.875rem',
              }}
            >
              {label}
            </Typography>
          )}
          
          {/* Refresh button */}
          {showRefresh && (
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{ 
                ml: 1,
                opacity: 0.6,
                '&:hover': { opacity: 1 },
              }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          )}
        </Stack>
      )}
      
      {/* Main Counter */}
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Typography
          variant={variant || sizeStyles.typography}
          fontWeight={fontWeight}
          color={`${color}.main`}
          sx={{
            fontFeatureSettings: '"tnum", "lnum"',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            transition: 'all 0.3s ease',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {formatDisplayValue(isVisible ? count : 0)}
        </Typography>
        
        {/* Animated underline effect */}
        {isAnimating && (
          <Box
            sx={{
              position: 'absolute',
              bottom: -4,
              left: 0,
              right: 0,
              height: 3,
              bgcolor: alpha(theme.palette[color].main, 0.3),
              borderRadius: 1.5,
              transform: 'scaleX(0)',
              transformOrigin: 'left',
              animation: 'underlineExpand 2s ease-out',
            }}
          />
        )}
      </Box>
      
      {/* Trend Indicator */}
      {showTrend && previousValue !== null && (
        <Fade in={!isAnimating} timeout={500}>
          <Chip
            icon={trendInfo.icon}
            label={trendInfo.text}
            size={sizeStyles.trendSize}
            color={trendInfo.color}
            variant="outlined"
            sx={{ 
              mt: sizeStyles.spacing,
              fontWeight: 600,
            }}
          />
        </Fade>
      )}
      
      {/* Description */}
      {description && (
        <Fade in={!isAnimating} timeout={800}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              mt: 1,
              maxWidth: 200,
              lineHeight: 1.4,
            }}
          >
            {description}
          </Typography>
        </Fade>
      )}
      
      {/* Organization Context */}
      {showOrganizationContext && organizationName && (
        <Fade in={!isAnimating} timeout={1000}>
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.info.light, 0.1),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Business sx={{ fontSize: 14, color: 'info.main' }} />
              <Typography variant="caption" color="text.secondary">
                {organizationName}
              </Typography>
            </Stack>
          </Box>
        </Fade>
      )}
      
      {/* Info Tooltip */}
      {showTooltip && tooltipTitle && (
        <Tooltip title={tooltipTitle} arrow>
          <IconButton
            size="small"
            sx={{ 
              position: 'absolute',
              top: 0,
              right: 0,
              opacity: 0.6,
              '&:hover': { opacity: 1 },
            }}
          >
            <Info fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
  
  // Add animation styles to document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const styleId = 'animated-counter-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = `
        @keyframes underlineExpand {
          0% {
            transform: scaleX(0);
            opacity: 1;
          }
          70% {
            transform: scaleX(1);
            opacity: 1;
          }
          100% {
            transform: scaleX(1);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);
  
  return content;
};

AnimatedCounter.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  duration: PropTypes.number,
  prefix: PropTypes.string,
  suffix: PropTypes.string,
  variant: PropTypes.string,
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'error', 'warning', 'info']),
  fontWeight: PropTypes.number,
  showTrend: PropTypes.bool,
  previousValue: PropTypes.number,
  label: PropTypes.string,
  description: PropTypes.string,
  icon: PropTypes.element,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  precision: PropTypes.number,
  animateOnMount: PropTypes.bool,
  showRefresh: PropTypes.bool,
  onRefresh: PropTypes.func,
  format: PropTypes.oneOf(['number', 'percentage', 'currency', 'duration']),
  currency: PropTypes.string,
  locale: PropTypes.string,
  textAlign: PropTypes.oneOf(['left', 'center', 'right']),
  sx: PropTypes.object,
  showTooltip: PropTypes.bool,
  tooltipTitle: PropTypes.string,
  showOrganizationContext: PropTypes.bool,
  organizationName: PropTypes.string,
};

AnimatedCounter.defaultProps = {
  duration: 2000,
  prefix: '',
  suffix: '',
  color: 'primary',
  fontWeight: 800,
  showTrend: false,
  size: 'medium',
  precision: 0,
  animateOnMount: true,
  showRefresh: false,
  format: 'number',
  currency: 'USD',
  locale: 'en-US',
  textAlign: 'center',
  showTooltip: false,
  showOrganizationContext: false,
};

export default React.memo(AnimatedCounter);
