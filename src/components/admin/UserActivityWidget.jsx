import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button, List, ListItem, ListItemText, Alert } from "@mui/material";

function UserActivityWidget({ activities = [] }) {
  if (!activities.length) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No user activity found.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Recent User Activity
      </Typography>

      <List dense>
        {activities.map((activity, idx) => (
          <ListItem key={idx} divider>
            <ListItemText
              primary={activity.title}
              secondary={new Date(activity.date).toLocaleString()}
            />
          </ListItem>
        ))}
      </List>

      <Box textAlign="center" mt={2}>
        <Button variant="outlined" color="primary" size="small">
          View All
        </Button>
      </Box>
    </Box>
  );
}

UserActivityWidget.propTypes = {
  activities: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
    })
  ),
};

export default React.memo(UserActivityWidget);
