// ... (imports and component setup are correct)

// ... (fetchAssessment and handleSubmit are correct and memoized)

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

// ... (useEffect for timer is correct)

// ... (loading and error screens are correct)

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      {/* ... (Header, timer, progress bar are correct) ... */}

      <Divider sx={{ my: 3 }} />

      {assessment.questions.map((question, qIndex) => (
        <Box key={`q-${qIndex}`} sx={{ mb: 4 }}>
          {/* ... (Question text, checkbox, text field are correct) ... */}
          
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

          {question.type === 'rating' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Rating
                value={Number(answers[qIndex]) || 0}
                // FIX: Cleaner onChange using event and newValue
                onChange={(event, newValue) => handleAnswerChange(qIndex, newValue)} 
                precision={1}
                max={5}
              />
              <Typography variant="body2" color="text.secondary">
                {answers[qIndex] ? `${answers[qIndex]} out of 5` : 'Rate here'}
              </Typography>
            </Box>
          )}
          
          {/* ... (file upload and submit buttons are correct) ... */}
        </Box>
      ))}
      
      {/* ... (Submit button is correct) ... */}
    </Paper>
  );
}
