import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Rating,
  Alert,
  LinearProgress
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';

export default function TakeAssessment() {
  const { assessmentId } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const fetchAssessment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Assessment not found');
      }

      setAssessment(data);
      if (data.timeLimitMinutes) {
        const startedAt = new Date(data.startedAt);
        const endTime = new Date(startedAt.getTime() + data.timeLimitMinutes * 60000);
        setTimeRemaining(Math.max(0, Math.floor((endTime - new Date()) / 1000)));
      }
    } catch (err) {
      console.error('Error loading assessment:', err);
      enqueueSnackbar('Failed to load assessment', { variant: 'error' });
      navigate('/assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId, enqueueSnackbar, navigate]);

  useEffect(() => {
    if (timeRemaining === null) return;

    timerRef.current = timeRemaining > 0 && setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeRemaining]);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const requiredQuestions = assessment.questions
      .map((q, i) => (q.required ? i : null))
      .filter(i => i !== null);
    
    const missingAnswers = requiredQuestions.filter(i => 
      answers[i] === undefined || 
      answers[i] === '' || 
      (Array.isArray(answers[i]) && answers[i].length === 0)
    );
    
    if (missingAnswers.length > 0) {
      enqueueSnackbar(
        `Please answer all required questions (${missingAnswers.map(i => i + 1).join(', ')})`, 
        { variant: 'error' }
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers,
          durationMinutes: assessment.timeLimitMinutes 
            ? assessment.timeLimitMinutes - (timeRemaining / 60)
            : null
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit');
      }
      
      enqueueSnackbar('Assessment submitted successfully!', { variant: 'success' });
      navigate(`/assessments/${assessmentId}/results`);
    } catch (err) {
      console.error('Submission error:', err);
      enqueueSnackbar(`Failed to submit: ${err.message}`, { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!assessment) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Assessment not found
      </Alert>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {assessment.title}
        </Typography>
        
        {timeRemaining !== null && (
          <Typography variant="h6" color="error">
            Time Remaining: {formatTime(timeRemaining)}
          </Typography>
        )}
      </Box>

      <Typography variant="body1" paragraph>
        {assessment.description}
      </Typography>

      {timeRemaining !== null && (
        <LinearProgress 
          variant="determinate" 
          value={100 - (timeRemaining / (assessment.timeLimitMinutes * 60) * 100)} 
          sx={{ mb: 3, height: 8 }}
        />
      )}

      <Divider sx={{ my: 3 }} />

      {assessment.questions.map((question, qIndex) => (
        <Box key={`q-${qIndex}`} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            {qIndex + 1}. {question.text}
            {question.required && (
              <Typography component="span" color="error" sx={{ ml: 1 }}>
                *
              </Typography>
            )}
          </Typography>

          {question.type === 'text' && (
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={answers[qIndex] || ''}
              onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
              placeholder="Type your answer here..."
            />
          )}

          {question.type === 'multiple_choice' && (
            <RadioGroup
              value={answers[qIndex] || ''}
              onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
            >
              {question.options.map((option, oIndex) => (
                <FormControlLabel
                  key={`opt-${oIndex}`}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          )}

          {/* Add handling for other question types if needed, such as 'checkbox' and 'rating' */}
          
        </Box>
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ minWidth: 180 }}
        >
          {submitting ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              Submitting...
            </>
          ) : (
            'Submit Assessment'
          )}
        </Button>
      </Box>
    </Paper>
  );
}

TakeAssessment.propTypes = {
  // Add prop types if needed
};

