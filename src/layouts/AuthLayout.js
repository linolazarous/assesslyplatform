import React from 'react';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
// Ensure this import uses the correct path (assuming brand/index.jsx)
import { Logo } from '../components/brand'; 

export default function AuthLayout({ children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
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
          {/* Always show the logo for branding, using a fixed light mode for contrast */}
          <Logo size={80} darkMode={false} /> 
        </Box>
        <Box
          sx={{
            width: '100%',
            maxWidth: 450,
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
            boxShadow: 3,
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
