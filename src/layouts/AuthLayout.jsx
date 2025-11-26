import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress, Paper } from '@mui/material';
import PropTypes from 'prop-types';
import { Logo } from '../components/brand';

const MotionDiv = lazy(() =>
  import('framer-motion').then(module => ({ default: module.motion.div }))
);

export default function AuthLayout({ children, darkMode = false }) {
  const motionProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', damping: 20, stiffness: 100, duration: 0.5 },
  };

  return (
    <Box
      {...(false ? { inert: "" } : {})} // No drawer in auth layout, so always false
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        p: 2
      }}
    >
      <Suspense fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress size={50} />
        </Box>
      }>
        <MotionDiv {...motionProps}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Logo size={80} darkMode={darkMode} withText />
          </Box>
          <Box
            component={Paper}
            elevation={3}
            sx={{
              width: '100%',
              maxWidth: 450,
              p: { xs: 3, sm: 4 },
              borderRadius: 2,
              backgroundColor: 'background.paper',
            }}
          >
            {children}
          </Box>
        </MotionDiv>
      </Suspense>
    </Box>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  darkMode: PropTypes.bool,
};
