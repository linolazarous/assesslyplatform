import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  Paper
} from '@mui/material';
import { useSnackbar } from 'notistack';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import { trackError } from '../utils/analytics';

export default class ErrorBoundary extends React.Component {
  state = { 
    hasError: false,
    error: null,
    errorInfo: null
  };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    trackError(error, {
      componentStack: errorInfo.componentStack,
      boundary: this.constructor.name
    });
    this.setState({ errorInfo });
  }
  
  handleRefresh = () => {
    window.location.reload();
  };
  
  handleReport = () => {
    const { error, errorInfo } = this.state;
    // In a real app, you would send this to an error tracking service
    console.error('User reported error:', error, errorInfo);
    this.props.enqueueSnackbar('Error report sent. Thank you!', { variant: 'success' });
    this.setState({ hasError: false });
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <SentimentVeryDissatisfiedIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Something Went Wrong
            </Typography>
            <Typography variant="body1" paragraph>
              We're sorry for the inconvenience. The error has been logged and our team has been notified.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {this.state.error?.toString()}
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={this.handleRefresh}
                size="large"
              >
                Refresh Page
              </Button>
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={this.handleReport}
                size="large"
              >
                Report Error
              </Button>
            </Box>
          </Paper>
        </Container>
      );
    }
    return this.props.children; 
  }
}
