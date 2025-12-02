// src/components/brand/BrandColors.jsx
import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Grid, Paper, useTheme } from "@mui/material";

/**
 * BrandColors Component
 * Displays the brand color palette for documentation/design system
 */
function BrandColors({ showNames = true, showValues = true, size = 80 }) {
  const theme = useTheme();

  const brandColors = [
    { name: "Primary", color: theme.palette.primary.main, value: theme.palette.primary.main },
    { name: "Secondary", color: theme.palette.secondary.main, value: theme.palette.secondary.main },
    { name: "Success", color: theme.palette.success.main, value: theme.palette.success.main },
    { name: "Warning", color: theme.palette.warning.main, value: theme.palette.warning.main },
    { name: "Error", color: theme.palette.error.main, value: theme.palette.error.main },
    { name: "Info", color: theme.palette.info.main, value: theme.palette.info.main },
    { name: "Dark", color: theme.palette.grey[900], value: theme.palette.grey[900] },
    { name: "Light", color: theme.palette.grey[100], value: theme.palette.grey[100] },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Brand Colors
      </Typography>
      <Grid container spacing={2}>
        {brandColors.map((colorItem, index) => (
          <Grid item xs={6} sm={4} md={3} key={index}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box
                sx={{
                  width: size,
                  height: size,
                  bgcolor: colorItem.color,
                  borderRadius: 1,
                  mb: 1,
                  border: 1,
                  borderColor: 'divider',
                }}
              />
              {showNames && (
                <Typography variant="body2" fontWeight="medium">
                  {colorItem.name}
                </Typography>
              )}
              {showValues && (
                <Typography variant="caption" color="text.secondary">
                  {colorItem.value}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

BrandColors.propTypes = {
  showNames: PropTypes.bool,
  showValues: PropTypes.bool,
  size: PropTypes.number,
};

BrandColors.defaultProps = {
  showNames: true,
  showValues: true,
  size: 80,
};

export default BrandColors;
