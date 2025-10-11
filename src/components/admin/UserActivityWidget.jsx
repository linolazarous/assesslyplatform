import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import { AccessTime, Person } from '@mui/icons-material';

const MOCK_ACTIVITIES = [
  { id: 1, user: 'John Doe', action: 'Created new template "Onboarding Survey"', time: '5m ago' },
  { id: 2, user: 'Jane Smith', action: 'Submitted assessment "Skill Test #1"', time: '15m ago' },
  { id: 3, user: 'Admin', action: 'Upgraded TestCorp subscription to Premium', time: '1h ago' },
  { id: 4, user: 'Candidate 102', action: 'Registered new account', time: '2h ago' },
];

export default function UserActivityWidget() {
  return (
    <Box>
      <List disablePadding>
        {MOCK_ACTIVITIES.map((activity, index) => (
          <React.Fragment key={activity.id}>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Person fontSize="small" color="primary" />
                    <Typography component="span" variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
                      {activity.user}
                    </Typography>
                    <Chip size="small" label={activity.time} icon={<AccessTime fontSize="small" />} />
                  </Box>
                }
                secondary={
                  <Typography component="span" variant="body2" color="text.primary">
                    {activity.action}
                  </Typography>
                }
              />
            </ListItem>
            {index < MOCK_ACTIVITIES.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Button size="small" variant="text">View All Activity</Button>
      </Box>
    </Box>
  );
}

