// src/theme/brand.jsx
/**
 * Enterprise-grade brand system for Assessly Platform
 * Centralized design tokens, assets, and brand guidelines
 */

import React from 'react';

// Brand identity
export const BRAND_IDENTITY = {
  name: 'Assessly',
  tagline: 'Measure Smarter, Not Harder',
  description: 'From Questions to Insights, Anywhere',
  mission: 'To empower organizations with intelligent assessment tools that drive better decisions',
  version: '2.0.0',
  established: '2023'
};

// Design Tokens - Following modern design system principles
export const DESIGN_TOKENS = {
  // Color System (Material Design 3 inspired)
  colors: {
    primary: {
      50: '#e8eaf6',
      100: '#c5cae9',
      200: '#9fa8da',
      300: '#7986cb',
      400: '#5c6bc0',
      500: '#3f51b5', // Brand primary
      600: '#3949ab',
      700: '#303f9f',
      800: '#283593',
      900: '#1a237e'
    },
    
    secondary: {
      50: '#e8f5e9',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#4caf50', // Brand secondary
      600: '#43a047',
      700: '#388e3c',
      800: '#2e7d32',
      900: '#1b5e20'
    },
    
    // Semantic Colors
    semantic: {
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3'
    },
    
    // Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #3f51b5 0%, #4caf50 100%)',
      secondary: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)'
    }
  },
  
  // Typography System
  typography: {
    fontFamily: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      secondary: "'Roboto', 'Helvetica Neue', Arial, sans-serif"
    },
    
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px'
    }
  },
  
  // Spacing System (8px base unit)
  spacing: {
    unit: 8,
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px'
  },
  
  // Border Radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px'
  }
};

// Brand Assets
export const BRAND_ASSETS = {
  logos: {
    primary: {
      light: '/brand/logo-primary-light.svg',
      dark: '/brand/logo-primary-dark.svg',
      icon: '/brand/logo-icon.svg'
    }
  }
};

// Logo Component
export const Logo = ({ 
  variant = 'primary', 
  theme = 'light', 
  size = 48,
  className = '',
  style = {},
  ...props 
}) => {
  const logoUrl = BRAND_ASSETS.logos[variant]?.[theme] || BRAND_ASSETS.logos.primary.light;
  
  return (
    <img
      src={logoUrl}
      alt={`${BRAND_IDENTITY.name} Logo`}
      style={{
        width: size,
        height: size,
        ...style
      }}
      className={className}
      {...props}
    />
  );
};

// Brand Mark Component (Logo + Text)
export const BrandMark = ({
  variant = 'horizontal',
  showTagline = false,
  size = 'md',
  theme = 'light',
  className = '',
  ...props
}) => {
  const sizes = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96
  };
  
  const logoSize = sizes[size] || sizes.md;
  
  return (
    <div
      className={`brand-mark ${variant} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
      {...props}
    >
      <Logo theme={theme} size={logoSize} />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <span style={{
          fontSize: variant === 'horizontal' ? '1.5rem' : '1.25rem',
          fontWeight: 700,
          color: theme === 'dark' ? '#ffffff' : DESIGN_TOKENS.colors.primary[500]
        }}>
          {BRAND_IDENTITY.name}
        </span>
        {showTagline && (
          <span style={{
            fontSize: '0.875rem',
            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
          }}>
            {BRAND_IDENTITY.tagline}
          </span>
        )}
      </div>
    </div>
  );
};

// Theme Hook for React Components
export const useBrandTheme = () => {
  return {
    colors: DESIGN_TOKENS.colors,
    typography: DESIGN_TOKENS.typography,
    spacing: DESIGN_TOKENS.spacing,
    borderRadius: DESIGN_TOKENS.borderRadius,
    brand: BRAND_IDENTITY
  };
};

// CSS Variables Generator
export const generateCSSVariables = (theme = 'light') => {
  const isDark = theme === 'dark';
  
  return `
    :root {
      --brand-primary: ${DESIGN_TOKENS.colors.primary[500]};
      --brand-secondary: ${DESIGN_TOKENS.colors.secondary[500]};
      --brand-success: ${DESIGN_TOKENS.colors.semantic.success};
      --brand-warning: ${DESIGN_TOKENS.colors.semantic.warning};
      --brand-error: ${DESIGN_TOKENS.colors.semantic.error};
      --brand-info: ${DESIGN_TOKENS.colors.semantic.info};
      
      --brand-text-primary: ${isDark ? '#ffffff' : 'rgba(0, 0, 0, 0.87)'};
      --brand-text-secondary: ${isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'};
      
      --brand-bg-default: ${isDark ? '#121212' : '#ffffff'};
      --brand-bg-paper: ${isDark ? '#1e1e1e' : '#ffffff'};
      
      --brand-font-family: ${DESIGN_TOKENS.typography.fontFamily.primary};
      --brand-font-size-base: ${DESIGN_TOKENS.typography.fontSize.base};
      
      --brand-spacing-unit: ${DESIGN_TOKENS.spacing.unit}px;
      --brand-border-radius: ${DESIGN_TOKENS.borderRadius.md};
    }
  `;
};

// Theme Provider Component
export const BrandThemeProvider = ({ children, theme = 'light' }) => {
  React.useEffect(() => {
    // Inject CSS variables
    const style = document.createElement('style');
    style.textContent = generateCSSVariables(theme);
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [theme]);
  
  return children;
};

// Default export
export default {
  BRAND_IDENTITY,
  DESIGN_TOKENS,
  BRAND_ASSETS,
  Logo,
  BrandMark,
  useBrandTheme,
  generateCSSVariables,
  BrandThemeProvider
};
