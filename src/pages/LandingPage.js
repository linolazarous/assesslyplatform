import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  Grid,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import { Logo } from '../components/brand';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const features = [
    {
      title: "Create Assessments",
      description: "Build customized tests with our intuitive question builder"
    },
    {
      title: "Real-time Analytics",
      description: "Get instant insights with our powerful reporting dashboard"
    },
    {
      title: "Secure & Scalable",
      description: "Enterprise-grade security with unlimited scalability"
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box 
        component="section"
        sx={{ 
          textAlign: 'center', 
          py: { xs: 8, md: 10 },
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(180deg, #121212 0%, #1E1E1E 100%)' 
            : 'linear-gradient(180deg, #f5f7fa 0%, #e4e8f0 100%)'
        }}
      >
        <Logo size={120} />
        <Typography 
          variant="h2" 
          component="h1" // Use H1 for main page title
          sx={{ 
            mt: 3,
            fontWeight: 700,
            [theme.breakpoints.down('md')]: {
              fontSize: '2.5rem'
            }
          }}
        >
          Measure Smarter, Not Harder
        </Typography>
        <Typography 
          variant="h5" 
          sx={{ 
            mt: 2,
            color: 'text.secondary',
            maxWidth: 600,
            mx: 'auto',
            px: 2
          }}
        >
          From Questions to Insights, Anywhere
        </Typography>
        
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/auth?tab=signup')}
          >
            Get Started Free
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => navigate('/demo')}
          >
            Live Demo
          </Button>
        </Box>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }} component="section">
        <Typography 
          variant="h3" 
          component="h2"
          align="center" 
          sx={{ mb: 6, fontWeight: 600 }}
        >
          Powerful Assessment Tools
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature) => (
            <Grid item xs={12} md={4} key={feature.title}> {/* FIX: Use title as stable key */}
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)'
                  }
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" gutterBottom component="h3">
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box sx={{ py: 8, bgcolor: 'background.paper' }} component="section">
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
            Ready to Transform Your Assessments?
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            sx={{ px: 6 }}
            onClick={() => navigate('/auth?tab=signup')}
          >
            Start Your Free Trial
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
