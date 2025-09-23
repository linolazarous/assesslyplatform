import React, { useState } from 'react';
import {
  Button,
  TextField,
  Paper,
  Typography,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material';
import { Add, Delete, Save } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const QUESTION_TYPES = [
  { value: 'text', label: 'Text Answer' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'rating', label: 'Rating Scale' },
  { value: 'file', label: 'File Upload' },
  { value: 'boolean', label: 'True/False' }
];

export default function CreateAssessment({ organizationId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([
    { text: '', type: 'text', options: [], required: true }
  ]);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const addQuestion = () => {
    setQuestions([...questions, { text: '', type: 'text', options: [], required: true }]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) {
      enqueueSnackbar('Assessment must have at least one question', { variant: 'warning' });
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    
    if (field === 'type' && value !== 'multiple_choice') {
      newQuestions[index].options = [];
    }
    
    setQuestions(newQuestions);
  };

  const addOption = (qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options = [...newQuestions[qIndex].options, ''];
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const removeOption = (qIndex, oIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.splice(oIndex, 1);
    setQuestions(newQuestions);
  };

  const validateAssessment = () => {
    if (!title.trim()) {
      enqueueSnackbar('Assessment title is required', { variant: 'error' });
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        enqueueSnackbar(`Question ${i + 1} text is required`, { variant: 'error' });
        return false;
      }
      if (q.type === 'multiple_choice' && q.options.length < 2) {
        enqueueSnackbar(`Question ${i + 1} needs at least 2 options`, { variant: 'error' });
        return false;
      }
      if (q.type === 'multiple_choice' && q.options.some(opt => !opt.trim())) {
        enqueueSnackbar(`Question ${i + 1} has empty options`, { variant: 'error' });
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateAssessment()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch('/api/assessments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          questions,
          organizationId
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save assessment');
      }
      
      enqueueSnackbar('Assessment created successfully!', { variant: 'success' });
      navigate('/assessments');
    } catch (err) {
      console.error('Error saving assessment:', err);
      enqueueSnackbar(`Failed to save assessment: ${err.message}`, { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Create New Assessment
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            label="Assessment Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Questions
      </Typography>

      <List>
        {questions.map((question, qIndex) => (
          <ListItem 
            key={`q-${qIndex}`} 
            divider 
            sx={{ 
              p: 2,
              mb: 2,
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              backgroundColor: 'background.paper'
            }}
          >
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" color="primary">
                  Question {qIndex + 1}
                </Typography>
                <IconButton 
                  color="error" 
                  onClick={() => removeQuestion(qIndex)}
                  disabled={questions.length <= 1}
                >
                  <Delete />
                </IconButton>
              </Box>

              <TextField
                label="Question Text"
                fullWidth
                value={question.text}
                onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                required
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Question Type</InputLabel>
                    <Select
                      value={question.type}
                      label="Question Type"
                      onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                    >
                      {QUESTION_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Required</InputLabel>
                    <Select
                      value={question.required}
                      label="Required"
                      onChange={(e) => updateQuestion(qIndex, 'required', e.target.value)}
                    >
                      <MenuItem value={true}>Required</MenuItem>
                      <MenuItem value={false}>Optional</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {question.type === 'multiple_choice' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Options
                  </Typography>
                  
                  {question.options.map((option, oIndex) => (
                    <Box key={`opt-${oIndex}`} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        fullWidth
                        size="small"
                        required
                      />
                      <IconButton
                        color="error"
                        onClick={() => removeOption(qIndex, oIndex)}
                        disabled={question.options.length <= 2}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => addOption(qIndex)}
                    startIcon={<Add />}
                    disabled={question.options.length >= 10}
                  >
                    Add Option
                  </Button>
                </Box>
              )}
            </Box>
          </ListItem>
        ))}
      </List>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="contained"
          onClick={addQuestion}
          startIcon={<Add />}
          disabled={questions.length >= 50}
        >
          Add Question
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Assessment'}
        </Button>
      </Box>
    </Paper>
  );
}

CreateAssessment.propTypes = {
  organizationId: PropTypes.string.isRequired
};
