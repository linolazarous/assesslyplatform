import { createTheme, responsiveFontSizes } from '@mui/material/styles';

/**
 * 🎨 Production Theme Configuration
 * Optimized for performance, accessibility, and consistency
 */

// Base typography settings
const typographySettings = {
  fontFamily: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontWeight: 800,
    fontSize: '2.5rem',
    lineHeight: 1.2,
    letterSpacing: '-0.5px',
  },
  h2: {
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.3,
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.75rem',
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.25rem',
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem',
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
  },
  button: {
    textTransform: 'none',
    fontWeight: 600,
  },
  subtitle1: {
    fontWeight: 500,
  },
  subtitle2: {
    fontWeight: 500,
    fontSize: '0.875rem',
  },
};

// Shape settings
const shapeSettings = {
  borderRadius: 8,
};

/**
 * Theme factory function
 * @param {string} mode - 'light' or 'dark'
 * @returns {Object} Material-UI theme
 */
export const getAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';

  // Color palette optimized for accessibility and performance
  const palette = {
    mode,
    primary: {
      main: '#3f51b5', // Indigo - WCAG AA compliant
      light: '#7986cb',
      dark: '#303f9f',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4caf50', // Green - WCAG AA compliant
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
      contrastText: '#ffffff',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#ffffff',
    },
    background: {
      default: isDark ? '#121212' : '#f8fafc',
      paper: isDark ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: isDark ? '#ffffff' : '#1a202c',
      secondary: isDark ? '#a0aec0' : '#4a5568',
      disabled: isDark ? '#718096' : '#a0aec0',
    },
    divider: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    action: {
      hover: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(63, 81, 181, 0.04)',
      selected: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(63, 81, 181, 0.08)',
    },
  };

  // Create base theme
  const baseTheme = createTheme({
    palette,
    typography: typographySettings,
    shape: shapeSettings,
    
    // Performance optimizations
    components: {
      // Button optimizations
      MuiButton: {
        defaultProps: {
          disableElevation: true,
          disableRipple: false, // Keep for accessibility
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 600,
            textTransform: 'none',
            transition: 'all 0.2s ease-in-out',
            '&:focus-visible': {
              outline: '2px solid ' + palette.primary.main,
              outlineOffset: '2px',
            },
          },
          sizeLarge: {
            padding: '10px 22px',
            fontSize: '1rem',
          },
          sizeSmall: {
            padding: '6px 12px',
            fontSize: '0.875rem',
          },
          contained: {
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
            },
          },
        },
      },
      
      // Paper optimizations
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none', // Remove gradients for performance
            boxShadow: isDark 
              ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
              : '0 2px 4px rgba(0, 0, 0, 0.05)',
            transition: 'box-shadow 0.2s ease-in-out',
          },
        },
      },
      
      // Card optimizations
      MuiCard: {
        styleOverrides: {
          root: {
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: isDark 
                ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
                : '0 8px 24px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
      
      // TextField optimizations
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          fullWidth: true,
          InputLabelProps: {
            shrink: true,
          },
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: palette.primary.main,
              },
            },
          },
        },
      },
      
      // AppBar optimizations
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? palette.background.paper : palette.primary.main,
            color: isDark ? palette.text.primary : '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      
      // Link optimizations
      MuiLink: {
        defaultProps: {
          underline: 'hover',
        },
        styleOverrides: {
          root: {
            fontWeight: 500,
            color: palette.primary.main,
            textDecoration: 'none',
            '&:hover': {
              color: palette.primary.dark,
            },
            '&:focus-visible': {
              outline: '2px solid ' + palette.primary.main,
              outlineOffset: '1px',
              borderRadius: '2px',
            },
          },
        },
      },
      
      // Dialog optimizations
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            backgroundImage: 'none',
          },
        },
      },
      
      // MenuItem optimizations
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 8px',
            padding: '8px 12px',
            '&:hover': {
              backgroundColor: palette.action.hover,
            },
            '&.Mui-selected': {
              backgroundColor: palette.action.selected,
              '&:hover': {
                backgroundColor: palette.action.selected,
              },
            },
          },
        },
      },
      
      // Tooltip optimizations
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.75rem',
            padding: '6px 10px',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
            color: isDark ? '#000000' : '#ffffff',
            borderRadius: 6,
          },
        },
      },
      
      // CssBaseline enhancements
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            scrollBehavior: 'smooth',
          },
          body: {
            fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1',
            textRendering: 'optimizeLegibility',
          },
        },
      },
    },
    
    // Consistent transitions
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
    
    // Custom theme extensions
    custom: {
      shadows: {
        subtle: isDark ? '0 1px 3px rgba(255, 255, 255, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
        medium: isDark ? '0 4px 12px rgba(255, 255, 255, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
        large: isDark ? '0 8px 24px rgba(255, 255, 255, 0.2)' : '0 8px 24px rgba(0, 0, 0, 0.15)',
      },
    },
  });

  // Apply responsive font sizes for production
  return responsiveFontSizes(baseTheme, {
    factor: 2, // More aggressive responsive scaling
    breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'],
    variants: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  });
};

// Pre-built themes for immediate use
export const lightTheme = getAppTheme('light');
export const darkTheme = getAppTheme('dark');
