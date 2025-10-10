// src/theme/brand.js (Recommended file name)

/**
 * Centralized brand assets and design tokens for use across the application 
 * and theme configuration.
 */
export const brandAssets = {
  logo: '/assets/logo.png',
  colors: {
    primary: '#3f51b5',
    secondary: '#4caf50',
    // Define gradient CSS string
    gradient: 'linear-gradient(135deg, #3f51b5 0%, #4caf50 100%)', 
    // Define a dark mode equivalent for backgrounds, if needed
    darkBackground: '#121212',
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    logo: {
      desktop: '2rem',
      mobile: '1.5rem'
    }
  }
};
