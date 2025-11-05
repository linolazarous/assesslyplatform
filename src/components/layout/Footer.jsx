import React from "react";
import { Box, Typography, Container } from "@mui/material";

const Footer = React.memo(function Footer() {
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "background.paper",
        borderTop: "1px solid rgba(0,0,0,0.1)",
        py: 3,
        mt: 'auto', // Push footer to bottom
      }}
    >
      <Container maxWidth="xl" sx={{ textAlign: "center" }}>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            lineHeight: 1.5
          }}
        >
          &copy; {currentYear} Assessly. All rights reserved.
        </Typography>
        
        {/* Optional: Add legal links for production */}
        <Box sx={{ mt: 1 }}>
          <Typography 
            component="span" 
            variant="caption" 
            color="text.secondary"
            sx={{ mx: 1 }}
          >
            <a 
              href="/privacy" 
              style={{ 
                color: 'inherit', 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              Privacy Policy
            </a>
          </Typography>
          <Typography 
            component="span" 
            variant="caption" 
            color="text.secondary"
            sx={{ mx: 1 }}
          >
            <a 
              href="/terms" 
              style={{ 
                color: 'inherit', 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              Terms of Service
            </a>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
});

export default Footer;
