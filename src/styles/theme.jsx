import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// --- Base Settings ---
// Define common typography and shape settings that apply to both modes
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
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  button: {
    textTransform: 'none',
    fontWeight: 600,
  },
  h1: { fontWeight: 800, fontSize: '2.5rem', lineHeight: 1.2, letterSpacing: '-0.5px' },
  h2: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.3 },
  h3: { fontWeight: 600, fontSize: '1.75rem' },
  h4: { fontWeight: 600, fontSize: '1.5rem' },
  h5: { fontWeight: 600, fontSize: '1.25rem' },
  h6: { fontWeight: 600, fontSize: '1rem' },
  body1: { fontSize: '1rem', lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', lineHeight: 1.6 },
  subtitle1: { fontWeight: 500, fontSize: '1rem' },
  subtitle2: { fontWeight: 500, fontSize: '0.875rem' },
};

const shapeSettings = {
  borderRadius: 8,
};

// --- Theme Factory Function ---
export const getAppTheme = (mode) => {
  const isDark = mode === 'dark';

  const palette = {
    mode,
    primary: {
      main: '#3f51b5', // Indigo
      light: isDark ? '#7986cb' : '#7986cb',
      dark: isDark ? '#303f9f' : '#303f9f',
      contrastText: '#fff',
    },
    secondary: {
      main: '#4caf50', // Green
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#fff',
    },
    error: { main: '#e53935', light: '#ef5350', dark: '#c62828', contrastText: '#fff' },
    warning: { main: '#ffa726', light: '#ffb74d', dark: '#f57c00', contrastText: isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)' },
    info: { main: '#29b6f6', light: '#4fc3f7', dark: '#0288d1', contrastText: '#fff' },
    success: { main: '#66bb6a', light: '#81c784', dark: '#388e3c', contrastText: isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)' },
    
    background: {
      default: isDark ? '#121212' : '#f5f7fa',
      paper: isDark ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: isDark ? '#ffffff' : '#2d3748',
      secondary: isDark ? '#a0aec0' : '#718096',
      disabled: isDark ? '#616161' : '#a0aec0',
    },
    divider: isDark ? '#363636' : '#e2e8f0',
  };

  const baseTheme = createTheme({
    palette: palette,
    typography: typographySettings,
    shape: shapeSettings,
    
    // Custom non-MUI properties
    logo: {
      primary: palette.primary.main,
      secondary: palette.secondary.main,
      gradient: isDark 
        ? 'linear-gradient(45deg, #ffffff 30%, #c3cfe2 90%)'
        : 'linear-gradient(45deg, #3f51b5 30%, #4caf50 90%)'
    },
    
    // --- Component Overrides ---
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, padding: '8px 16px', boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
          sizeLarge: { padding: '10px 22px', fontSize: '1rem' },
          sizeSmall: { padding: '6px 12px', fontSize: '0.875rem' },
        },
        defaultProps: { disableElevation: true, disableRipple: true },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            // Adjust box shadow for dark mode visibility
            boxShadow: isDark ? '0px 2px 8px rgba(0, 0, 0, 0.5)' : '0px 2px 4px rgba(0, 0, 0, 0.05)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: isDark ? '0px 4px 12px rgba(255, 255, 255, 0.1)' : '0px 4px 12px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', fullWidth: true, InputLabelProps: { shrink: true } },
        styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } } },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            // FIX: Use palette color for dynamic background
            backgroundColor: isDark ? palette.background.paper : palette.primary.main, 
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(8px)',
          },
        },
      },
      MuiLink: {
        defaultProps: { underline: 'hover' },
        styleOverrides: {
          root: {
            fontWeight: 500,
            // FIX: Use palette colors
            color: palette.primary.main,
            '&:hover': {
              color: palette.primary.dark,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.8rem',
            padding: '8px 12px',
            // FIX: Use dynamic background color
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(45, 55, 72, 0.95)',
          },
          arrow: {
            color: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(45, 55, 72, 0.95)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, minHeight: 48 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '0 8px',
            padding: '8px 12px',
            '&:hover': {
              // FIX: Use dynamic hover color
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(63, 81, 181, 0.08)',
            },
          },
        },
      },
    },
    transitions: {
      duration: {
        shortest: 150, shorter: 200, short: 250, standard: 300, complex: 375, enteringScreen: 225, leavingScreen: 195,
      },
    },
  });

  return responsiveFontSizes(baseTheme);
};

// --- Usage Example (removed export default to avoid conflict with function export) ---
// To use this, you'd call it in your App.js/ThemeWrapper: 
/*
  const [mode, setMode] = React.useState('light');
  const theme = getAppTheme(mode); 
  // ... <ThemeProvider theme={theme}> ...
*/
