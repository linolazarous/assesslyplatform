import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Avatar, Rating, useTheme } from '@mui/material';

const TESTIMONIALS = [
  { id: 1, name: 'Alex T.', role: 'HR Director, TechCorp', rating: 5, feedback: 'Assessly revolutionized our hiring process. Multi-role system and analytics save us countless hours.', avatar: 'https://placehold.co/100x100/556cd6/ffffff?text=AT' },
  { id: 2, name: 'Sarah L.', role: 'Training Manager, GlobalOrg', rating: 4.5, feedback: 'Custom question types and smart scoring features are unparalleled for employee training.', avatar: 'https://placehold.co/100x100/4caf50/ffffff?text=SL' },
  { id: 3, name: 'Mark R.', role: 'Project Lead, FinServe', rating: 5, feedback: 'Enterprise-grade reliability and security meant zero downtime. Highly recommended for complex exams.', avatar: 'https://placehold.co/100x100/ffa726/000000?text=MR' },
];

export default function Testimonials() {
  const theme = useTheme();

  return (
    <Box component="section" sx={{ py: 8, bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f0f0f0' }}>
      <Typography variant="h3" align="center" sx={{ mb: 6, fontWeight: 700 }}>Trusted by Leading Organizations</Typography>

      <Grid container spacing={4}>
        {TESTIMONIALS.map(t => (
          <Grid item xs={12} md={4} key={t.id}>
            <Card elevation={4} sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Rating value={t.rating} precision={0.5} readOnly sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ flexGrow: 1, fontStyle: 'italic', mb: 3 }}>"{t.feedback}"</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                  <Avatar src={t.avatar} alt={t.name} sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">{t.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{t.role}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
