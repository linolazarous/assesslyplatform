import React from "react";
import { Box, Typography, Container } from "@mui/material";

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
        {/* ✅ Social media icons removed */}
        <Typography variant="body2" color="text.secondary">
          &copy; {new Date().getFullYear()} Assessly. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}

export default React.memo(Footer);
