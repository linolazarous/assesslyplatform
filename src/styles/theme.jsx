import { createTheme, responsiveFontSizes } from '@mui/material/styles';

/**
 * 🎨 Assessly Theme Configuration
 * Optimized specifically for LandingPage and component alignment
 */

// Base typography settings optimized for landing pages
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
    fontSize: '3.5rem',
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontWeight: 700,
    fontSize: '2.5rem',
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontWeight: 600,
    fontSize: '2rem',
    lineHeight: 1.3,
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
    lineHeight: 1.4,
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.25rem',
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem',
  },
  subtitle1: {
    fontSize: '1.125rem',
    lineHeight: 1.6,
    fontWeight: 400,
  },
  subtitle2: {
    fontSize: '1rem',
    lineHeight: 1.5,
    fontWeight: 400,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  button: {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '1rem',
  },
  caption: {
    fontSize: '0.875rem',
    lineHeight: 1.4,
  },
};

/**
 * Main theme factory optimized for Assessly components
 */
export const getAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';

  const palette = {
    mode,
    primary: {
      main: '#3f51b5',
      light: '#7986cb',
      dark: '#303f9f',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    background: {
      default: isDark ? '#0f1419' : '#f8fafc',
      paper: isDark ? '#1a202c' : '#ffffff',
    },
    text: {
      primary: isDark ? '#e2e8f0' : '#1a202c',
      secondary: isDark ? '#a0aec0' : '#4a5568',
    },
    grey: {
      50: '#f7fafc',
      100: '#edf2f7',
      200: '#e2e8f0',
      300: '#cbd5e0',
      400: '#a0aec0',
      500: '#718096',
      600: '#4a5568',
      700: '#2d3748',
      800: '#1a202c',
      900: '#171923',
    },
  };

  const baseTheme = createTheme({
    palette,
    typography: typographySettings,
    shape: {
      borderRadius: 8,
    },
    
    // Component customizations for better landing page alignment
    components: {
      // Button styles optimized for landing pages
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 600,
            textTransform: 'none',
            padding: '10px 24px',
            fontSize: '1rem',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
          contained: {
            background: `linear-gradient(45deg, ${palette.primary.main}, ${palette.primary.light})`,
            '&:hover': {
              background: `linear-gradient(45deg, ${palette.primary.dark}, ${palette.primary.main})`,
              boxShadow: '0 8px 25px rgba(63, 81, 181, 0.3)',
            },
          },
          outlined: {
            borderWidth: '2px',
            '&:hover': {
              borderWidth: '2px',
              backgroundColor: palette.primary.main + '08',
            },
          },
          sizeLarge: {
            padding: '12px 32px',
            fontSize: '1.125rem',
          },
          sizeSmall: {
            padding: '8px 16px',
            fontSize: '0.875rem',
          },
        },
      },

      // Paper styles for cards and sections
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 12,
            boxShadow: isDark 
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: isDark
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
                : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },
          },
          elevation1: {
            boxShadow: isDark 
              ? '0 1px 3px rgba(0, 0, 0, 0.3)'
              : '0 1px 3px rgba(0, 0, 0, 0.1)',
          },
          elevation2: {
            boxShadow: isDark 
              ? '0 4px 6px rgba(0, 0, 0, 0.3)'
              : '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
        },
      },

      // Card styles for feature cards
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: isDark ? '1px solid #2d3748' : '1px solid #e2e8f0',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
            },
          },
        },
      },

      // AppBar for navigation
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(26, 32, 44, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            backgroundImage: 'none',
            boxShadow: isDark 
              ? '0 1px 3px rgba(0, 0, 0, 0.3)'
              : '0 1px 3px rgba(0, 0, 0, 0.1)',
            borderBottom: isDark ? '1px solid #2d3748' : '1px solid #e2e8f0',
          },
        },
      },

      // Container for proper section alignment
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: '1rem',
            paddingRight: '1rem',
          },
          maxWidthLg: {
            maxWidth: '1200px',
          },
        },
      },

      // Typography enhancements
      MuiTypography: {
        styleOverrides: {
          h1: {
            background: isDark 
              ? 'linear-gradient(45deg, #e2e8f0, #a0aec0)'
              : 'linear-gradient(45deg, #1a202c, #4a5568)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          },
        },
      },

      // Link styles
      MuiLink: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
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
          '#root': {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      },
    },

    // Custom theme extensions for Assessly
    assessly: {
      gradients: {
        hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        features: isDark 
          ? 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)'
          : 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
        testimonial: isDark
          ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)'
          : 'linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%)',
      },
      shadows: {
        card: isDark 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        cardHover: isDark
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
          : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
    },
  });

  return responsiveFontSizes(baseTheme, {
    factor: 2,
    breakpoints: ['xs', 'sm', 'md', 'lg', 'xl'],
  });
};

// Export pre-built themes
export const lightTheme = getAppTheme('light');
export const darkTheme = getAppTheme('dark');
export default lightTheme;
