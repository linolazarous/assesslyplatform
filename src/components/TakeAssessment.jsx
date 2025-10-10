import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // FIX: Memoize handleSubmit using useCallback
  const handleSubmit = useCallback(async () => {
    // Check if submitting is already in progress to prevent double-click issues
    if (submitting) return;

    // Use current state values via component scope for the check
    const requiredQuestions = assessment.questions
      .map((q, i) => (q.required ? i : null))
      .filter(i => i !== null);
    
    const missingAnswers = requiredQuestions.filter(i => 
      answers[i] === undefined || 
      answers[i] === '' || 
      (Array.isArray(answers[i]) && answers[i].length === 0)
    );
    
    if (missingAnswers.length > 0 && timeRemaining > 1) { // Only show error if time hasn't run out
      enqueueSnackbar(
        `Please answer all required questions (${missingAnswers.map(i => i + 1).join(', ')})`, 
        { variant: 'error' }
      );
      return;
    }

    setSubmitting(true);
    // Clear timer immediately on submission attempt
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      // Calculate the duration based on the initial time limit and remaining time
      const durationSeconds = assessment.timeLimitMinutes * 60 - timeRemaining;
      
      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers,
          durationMinutes: assessment.timeLimitMinutes 
            ? Math.floor(durationSeconds / 60)
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
      // Optionally restart timer if submission failed unexpectedly (complex logic omitted for brevity)
    } finally {
      setSubmitting(false);
    }
  }, [submitting, assessment, answers, timeRemaining, assessmentId, enqueueSnackbar, navigate]); // Added necessary dependencies
  
  // Memoize fetchAssessment to make it stable
  const fetchAssessment = useCallback(async () => {
    setLoading(true);
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
        // Calculate the exact time remaining based on start time
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
  }, [assessmentId, enqueueSnackbar, navigate]); // Dependencies added

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]); // Dependency on the stable fetchAssessment

  useEffect(() => {
    if (timeRemaining === null || submitting) return; // Prevent timer running if submitting

    timerRef.current = timeRemaining > 0 && setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(); // FIX: Call the memoized handleSubmit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeRemaining, handleSubmit, submitting]); // FIX: Added handleSubmit and submitting as dependencies

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

  // Calculate percentage progress for LinearProgress
  const totalDuration = assessment.timeLimitMinutes * 60;
  const progressValue = totalDuration > 0 
    ? 100 - (timeRemaining / totalDuration * 100) 
    : 0;

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {assessment.title}
        </Typography>
        
        {timeRemaining !== null && (
          <Typography variant="h6" color={timeRemaining < 60 ? 'error' : 'textPrimary'}>
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
          value={progressValue}
          color={timeRemaining < 60 ? 'error' : 'primary'}
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
                  key={`opt-${oIndex}`} // Key is stable here since options list doesn't change
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          )}

          {/* Added rating scale for completeness */}
          {question.type === 'rating' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Rating
                value={Number(answers[qIndex]) || 0}
                onChange={(_, newValue) => handleAnswerChange(qIndex, newValue)}
                precision={1}
                max={5} // Assuming a default 5-star rating
              />
              <Typography variant="body2" color="text.secondary">
                {answers[qIndex] ? `${answers[qIndex]} out of 5` : 'Rate here'}
              </Typography>
            </Box>
          )}
          
          {/* Added file upload (placeholder logic) */}
          {question.type === 'file' && (
            <Alert severity="info" sx={{ mt: 1 }}>
              File upload logic needs a dedicated API endpoint (e.g., S3 or Vercel Blob)
            </Alert>
          )}
          
        </Box>
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSubmit}
          disabled={submitting || (timeRemaining !== null && timeRemaining <= 0)}
          sx={{ minWidth: 180 }}
        >
          {submitting ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
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
  // PropTypes for TakeAssessment are minimal since it uses useParams
};
