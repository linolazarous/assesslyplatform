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
  Divider,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import { Add, Delete, Save } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const QUESTION_TYPES = [
  { value: 'text', label: 'Text Answer' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'rating', label: 'Rating Scale' },
  { value: 'file', label: 'File Upload' }
];

export default function QuestionnaireBuilder({ organizationId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [questions, setQuestions] = useState([
    { id: Date.now(), text: '', type: 'text', options: [], required: true }
  ]);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  // ✅ Fixed: Add API base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com';

  const addQuestion = () => {
    if (questions.length >= 50) {
      enqueueSnackbar('Maximum 50 questions allowed.', { variant: 'warning' });
      return;
    }
    setQuestions([...questions, {
      id: Date.now(),
      text: '',
      type: 'text',
      options: [],
      required: true
    }]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) {
      enqueueSnackbar('Questionnaire must have at least one question.', { variant: 'warning' });
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions(prevQuestions => {
      const newQuestions = [...prevQuestions];
      newQuestions[index][field] = value;
      
      if (field === 'type') {
        if (value !== 'multiple_choice') { 
          newQuestions[index].options = []; 
        } else if (value === 'multiple_choice' && newQuestions[index].options.length === 0) { 
          newQuestions[index].options = [ 
            { id: Date.now(), text: '' }, 
            { id: Date.now() + 1, text: '' } 
          ]; 
        }
      }
      return newQuestions; 
    }); 
  };

  const addOption = (qIndex) => {
    setQuestions(prevQuestions => {
      const newQuestions = [...prevQuestions];
      if (newQuestions[qIndex].options.length >= 10) {
        enqueueSnackbar('Maximum 10 options per question.', { variant: 'warning' });
        return prevQuestions;
      }
      newQuestions[qIndex].options = [...newQuestions[qIndex].options, { id: Date.now(), text: '' }];
      return newQuestions;
    });
  };

  const updateOption = (qIndex, oIndex, value) => {
    setQuestions(prevQuestions => {
      const newQuestions = [...prevQuestions];
      newQuestions[qIndex].options[oIndex].text = value;
      return newQuestions;
    });
  };

  const removeOption = (qIndex, oIndex) => {
    setQuestions(prevQuestions => {
      const newQuestions = [...prevQuestions];
      if (newQuestions[qIndex].type === 'multiple_choice' && newQuestions[qIndex].options.length <= 2) {
        enqueueSnackbar('Multiple choice questions require at least two options.', { variant: 'warning' });
        return prevQuestions;
      }
      newQuestions[qIndex].options.splice(oIndex, 1);
      return newQuestions;
    });
  };

  const validateQuestionnaire = () => {
    if (!title.trim()) {
      enqueueSnackbar('Assessment Title is required.', { variant: 'error' });
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        enqueueSnackbar(`Question ${i + 1} text is required.`, { variant: 'error' });
        return false;
      }
      if (q.type === 'multiple_choice') {
        if (q.options.length < 2) {
          enqueueSnackbar(`Question ${i + 1} needs at least 2 options.`, { variant: 'error' });
          return false;
        }
        if (q.options.some(opt => !opt.text.trim())) {
          enqueueSnackbar(`Question ${i + 1} has empty options.`, { variant: 'error' });
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateQuestionnaire()) return;
    setLoading(true); 
    
    try { 
      const token = localStorage.getItem('token'); 
      if (!token) throw new Error('Authentication token not found'); 
      
      // ✅ Fixed: Use correct API URLs
      const endpoint = isTemplate ? `${API_BASE_URL}/templates/create` : `${API_BASE_URL}/assessments/create`; 
      
      const questionsPayload = questions.map(q => ({ 
        text: q.text, 
        type: q.type, 
        required: q.required, 
        options: q.type === 'multiple_choice' ? q.options.map(opt => opt.text) : [] 
      })); 
      
      const response = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        }, 
        body: JSON.stringify({ 
          title, 
          description, 
          questions: questionsPayload, 
          organizationId, 
          isTemplate 
        }), 
      }); 
      
      const data = await response.json(); 
      
      if (!response.ok) { 
        throw new Error(data.message || 'Failed to save the questionnaire/template.'); 
      } 
      
      enqueueSnackbar( 
        `${isTemplate ? 'Template' : 'Questionnaire'} saved successfully!`, 
        { variant: 'success' } 
      ); 
      
      navigate(isTemplate ? '/templates' : '/dashboard'); // ✅ Fixed: Navigate to dashboard
    } catch (err) { 
      console.error('Save error:', err); 
      enqueueSnackbar(`Failed to save: ${err.message}`, { variant: 'error', autoHideDuration: 5000 }); 
    } finally { 
      setLoading(false); 
    } 
  };

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary">
        {isTemplate ? 'Create Questionnaire Template' : 'Create New Questionnaire'}
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <TextField 
            label="Title" 
            fullWidth 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
            helperText="Enter a descriptive title for your assessment or template." 
          />
        </Grid>
        <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <FormControlLabel
            control={
              <Switch 
                checked={isTemplate} 
                onChange={(e) => setIsTemplate(e.target.checked)} 
                color="primary" 
              />
            }
            label="Save as Template"
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
            helperText="Provide detailed instructions or context for the assessment." 
          />
        </Grid>
      </Grid>
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" gutterBottom> 
        Questions ({questions.length}) 
      </Typography>
      <List>
        {questions.map((question, qIndex) => (
          <ListItem 
            key={question.id} 
            divider 
            sx={{ 
              p: 3, 
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
                  <FormControl fullWidth required>
                    <InputLabel id={`q-type-label-${qIndex}`}>Question Type</InputLabel>
                    <Select 
                      labelId={`q-type-label-${qIndex}`} 
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
                <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={question.required} 
                        onChange={(e) => updateQuestion(qIndex, 'required', e.target.checked)} 
                        color="primary" 
                      />
                    }
                    label="Required"
                  />
                </Grid>
              </Grid>
              {question.type === 'multiple_choice' && (
                <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom> 
                    Options (Min: 2, Max: 10) 
                  </Typography>
                  {question.options.map((option, oIndex) => (
                    <Box key={option.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField 
                        value={option.text} 
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} 
                        fullWidth 
                        size="small" 
                        required 
                        label={`Option ${oIndex + 1}`} 
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
                    sx={{ mt: 1 }}
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
          disabled={loading} 
          sx={{ minWidth: 150 }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" /> 
              Saving... 
            </Box>
          ) : (
            <> 
              <Save sx={{ mr: 1 }} /> Save 
            </>
          )}
        </Button>
      </Box>
    </Paper> 
  );
}

QuestionnaireBuilder.propTypes = {
  organizationId: PropTypes.string
};

QuestionnaireBuilder.defaultProps = {
  organizationId: ''
};

