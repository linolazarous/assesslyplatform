import React from "react";
import { Box, Typography, Container, IconButton } from "@mui/material";
import { Facebook, Twitter, LinkedIn } from "@mui/icons-material";

function Footer() {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderTop: "1px solid rgba(0,0,0,0.1)",
        py: 3,
        mt: 4,
      }}
    >
      <Container maxWidth="xl" sx={{ textAlign: "center" }}>
        <Box sx={{ mb: 1 }}>
          <IconButton aria-label="Visit our Facebook page" href="https://facebook.com" target="_blank">
            <Facebook />
          </IconButton>
          <IconButton aria-label="Visit our Twitter page" href="https://twitter.com" target="_blank">
            <Twitter />
          </IconButton>
          <IconButton aria-label="Visit our LinkedIn page" href="https://linkedin.com" target="_blank">
            <LinkedIn />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          &copy; {new Date().getFullYear()} Assessly. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}

export default React.memo(Footer);
