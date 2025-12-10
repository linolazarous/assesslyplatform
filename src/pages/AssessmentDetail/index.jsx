// src/pages/AssessmentDetail/index.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Tab,
  Tabs,
  LinearProgress,
  useTheme,
  alpha,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Menu,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  ArrowBack,
  MoreVert,
  Edit,
  Share,
  Download,
  BarChart,
  People,
  Schedule,
  CheckCircle,
  Error as ErrorIcon,
  Visibility,
  Add,
  Delete,
  CopyAll,
  Timer,
  Psychology,
  QuestionAnswer,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';

const AssessmentDetail = () => {
  const theme = useTheme();
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);

  useEffect(() => {
    fetchAssessmentDetail();
  }, [id]);

  const fetchAssessmentDetail = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockAssessment = {
        id,
        title: `JavaScript Advanced Concepts`,
        description: 'Test knowledge of advanced JavaScript concepts including closures, prototypes, async/await, and design patterns.',
        status: 'published',
        questionCount: 35,
        candidateCount: 1250,
        averageScore: 78,
        duration: 60, // minutes
        passingScore: 70,
        createdDate: '2024-01-15T10:30:00Z',
        lastModified: '2024-03-10T14:20:00Z',
        createdBy: 'Jane Smith',
        tags: ['JavaScript', 'Advanced', 'Technical'],
        settings: {
          shuffleQuestions: true,
          showResults: true,
          allowRetake: false,
          timeLimit: true,
        },
        questions: Array.from({ length: 35 }, (_, i) => ({
          id: `q-${i + 1}`,
          type: ['multiple_choice', 'coding', 'essay'][i % 3],
          text: `Question ${i + 1}: ${['Closures', 'Prototypes', 'Promises', 'Async/Await', 'Design Patterns'][i % 5]}`,
          points: 2,
          difficulty: ['easy', 'medium', 'hard'][i % 3],
        })),
        candidates: Array.from({ length: 10 }, (_, i) => ({
          id: `candidate-${i + 1}`,
          name: `Candidate ${i + 1}`,
          email: `candidate${i + 1}@example.com`,
          status: ['completed', 'in_progress', 'not_started'][i % 3],
          score: Math.floor(Math.random() * 40) + 60,
          timeSpent: Math.floor(Math.random() * 50) + 10,
          submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        })),
        analytics: {
          completionRate: 85,
          averageTime: 42,
          difficultyBreakdown: {
            easy: 12,
            medium: 15,
            hard: 8,
          },
          scoreDistribution: [5, 15, 25, 35, 20], // 0-20, 21-40, 41-60, 61-80, 81-100
        },
      };

      setAssessment(mockAssessment);
      setTimeout(() => setLoading(false), 500);
    } catch (error) {
      showSnackbar({ message: 'Failed to load assessment details', severity: 'error' });
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            bgcolor: alpha(color, 0.1), 
            p: 1, 
            borderRadius: 1, 
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon sx={{ color, fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const QuestionItem = ({ question, index }) => (
    <ListItem
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        mb: 1,
        '&:hover': { bgcolor: alpha(theme.palette.primary.light, 0.05) },
      }}
    >
      <ListItemIcon>
        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
          {index + 1}
        </Avatar>
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1">{question.text}</Typography>
            <Chip
              label={question.type.replace('_', ' ')}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={question.difficulty}
              size="small"
              color={question.difficulty === 'easy' ? 'success' : question.difficulty === 'medium' ? 'warning' : 'error'}
            />
          </Box>
        }
        secondary={`${question.points} points`}
      />
    </ListItem>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LinearProgress sx={{ width: '100%' }} />
      </Box>
    );
  }

  if (!assessment) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          Assessment not found
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>{assessment.title} | Assessly Platform</title>
      </Helmet>

      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/assessments')}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {assessment.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                  color={assessment.status === 'published' ? 'primary' : '
