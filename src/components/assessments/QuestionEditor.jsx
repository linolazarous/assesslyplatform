import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  DragIndicator,
} from '@mui/icons-material';

const QuestionEditor = ({ assessmentId, questions: initialQuestions, readOnly }) => {
  const [questions, setQuestions] = useState(initialQuestions || []);
  const [newQuestion, setNewQuestion] = useState('');
  const [questionType, setQuestionType] = useState('multiple-choice');

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    
    const question = {
      id: Date.now(),
      text: newQuestion,
      type: questionType,
      options: questionType === 'multiple-choice' ? ['Option 1', 'Option 2', 'Option 3', 'Option 4'] : [],
      correctAnswer: questionType === 'multiple-choice' ? 0 : '',
    };
    
    setQuestions([...questions, question]);
    setNewQuestion('');
  };

  const handleDeleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Questions ({questions.length})
        </Typography>
        {!readOnly && (
          <Button variant="contained" startIcon={<Add />}>
            Add Question
          </Button>
        )}
      </Box>

      {!readOnly && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Add New Question
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={questionType}
                label="Question Type"
                onChange={(e) => setQuestionType(e.target.value)}
              >
                <MenuItem value="multiple-choice">Multiple Choice</MenuItem>
                <MenuItem value="true-false">True/False</MenuItem>
                <MenuItem value="short-answer">Short Answer</MenuItem>
                <MenuItem value="essay">Essay</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Question Text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter your question here..."
            />
            
            <Button
              variant="contained"
              onClick={handleAddQuestion}
              disabled={!newQuestion.trim()}
            >
              Add
            </Button>
          </Box>
        </Paper>
      )}

      <Paper>
        <List>
          {questions.length > 0 ? (
            questions.map((question, index) => (
              <ListItem
                key={question.id}
                divider={index < questions.length - 1}
                sx={{ py: 2 }}
              >
                <DragIndicator sx={{ mr: 2, color: 'action.active', cursor: 'move' }} />
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">
                        Q{index + 1}: {question.text}
                      </Typography>
                      <Chip
                        label={question.type.replace('-', ' ')}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    question.type === 'multiple-choice' && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Options: {question.options.join(', ')}
                        </Typography>
                      </Box>
                    )
                  }
                />
                
                {!readOnly && (
                  <ListItemSecondaryAction>
                    <IconButton edge="end" sx={{ mr: 1 }}>
                      <Edit />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDeleteQuestion(question.id)}>
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText
                primary="No questions yet"
                secondary="Add your first question to get started"
              />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default QuestionEditor;
