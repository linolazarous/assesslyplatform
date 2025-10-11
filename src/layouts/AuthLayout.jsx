import React from 'react';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
// FIX: Using the correct relative path for components/brand 
import { Logo } from '../components/brand'; 

export default function AuthLayout({ children }) {
  return (
    <Box
      // Main container for full screen centering
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        // Using a fixed light gradient background for high contrast with the white paper box
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        p: 2
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          type: 'spring',
          damping: 20,
          stiffness: 100,
          duration: 0.5
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          {/* Logo is typically rendered in light mode on the Auth screen for visibility */}
          <Logo size={80} darkMode={false} withText={true} /> 
        </Box>
        <Box
          // Inner container for the actual login/signup form
          sx={{
            width: '100%',
            maxWidth: 450,
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
            boxShadow: 3, // Strong shadow to lift the card off the background
            backgroundColor: 'background.paper'
          }}
        >
          {children}
        </Box>
      </motion.div>
    </Box>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired
};
