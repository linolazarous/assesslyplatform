// src/components/PdfReport.jsx
import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Button, CircularProgress, Box, Alert } from '@mui/material';
import { PictureAsPdf, ErrorOutline } from '@mui/icons-material';
import PropTypes from 'prop-types';

// Lazy load heavy PDF dependencies
const PdfGenerator = lazy(() => import('./PdfGenerator'));

/**
 * Production-ready PDF report component with error boundaries and optimizations
 */
export default function PdfReport({ assessment, answers, responses }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generatePdf = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      // Validate inputs
      if (!assessment) {
        throw new Error('No assessment data provided');
      }

      // Dynamic import for PDF generation
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      // Generate PDF
      const pdfDoc = new jsPDF();
      
      // Simple PDF generation without heavy dependencies
      pdfDoc.setFontSize(16);
      pdfDoc.setTextColor(40, 53, 147);
      pdfDoc.text(assessment.title || 'Assessment Report', 105, 20, { align: 'center' });

      // Add basic info
      pdfDoc.setFontSize(10);
      pdfDoc.setTextColor(100);
      pdfDoc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 35);

      // Add questions and answers
      let yPosition = 50;
      const questions = assessment.questions || [];
      
      questions.forEach((question, index) => {
        if (yPosition > 250) {
          pdfDoc.addPage();
          yPosition = 20;
        }

        const answer = getAnswer(index, answers, responses);
        
        pdfDoc.setFontSize(12);
        pdfDoc.setTextColor(0, 0, 0);
        pdfDoc.text(`Q${index + 1}: ${question.text || 'No question text'}`, 15, yPosition);
        
        pdfDoc.setFontSize(10);
        pdfDoc.setTextColor(100);
        pdfDoc.text(`Answer: ${answer}`, 20, yPosition + 7);
        
        yPosition += 20;
      });

      // Save PDF
      const fileName = `${(assessment.title || 'report').replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
      pdfDoc.save(fileName);

    } catch (err) {
      console.error('PDF generation failed:', err);
      setError(err.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [assessment, answers, responses, isGenerating]);

  // Helper function to get answer
  const getAnswer = (index, answers, responses) => {
    let answer = 'Not answered';
    
    if (Array.isArray(answers) && answers[index] !== undefined) {
      answer = answers[index];
    } else if (Array.isArray(responses) && responses[index]?.answer !== undefined) {
      answer = responses[index].answer;
    } else if (answers?.[index] !== undefined) {
      answer = answers[index];
    }
    
    if (Array.isArray(answer)) answer = answer.join(', ');
    if (answer === null || answer === undefined || answer === '') answer = 'N/A';
    
    return String(answer).substring(0, 100); // Limit length
  };

  // Check if component should be disabled
  const isDisabled = isGenerating || !assessment;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Button
        variant="contained"
        color="secondary"
        onClick={generatePdf}
        startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />}
        disabled={isDisabled}
        size="small"
        sx={{ minWidth: 180 }}
        aria-label={isGenerating ? 'Generating PDF report' : 'Download PDF report'}
      >
        {isGenerating ? 'Generating...' : 'Download PDF Report'}
      </Button>

      {error && (
        <Alert 
          severity="error" 
          icon={<ErrorOutline />}
          onClose={() => setError(null)}
          sx={{ maxWidth: 300 }}
        >
          {error}
        </Alert>
      )}

      {!assessment && (
        <Alert severity="warning" sx={{ maxWidth: 300 }}>
          No assessment data available for PDF generation.
        </Alert>
      )}
    </Box>
  );
}

PdfReport.propTypes = {
  assessment: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    questions: PropTypes.arrayOf(PropTypes.shape({
      text: PropTypes.string,
      type: PropTypes.string
    }))
  }),
  answers: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array
  ]),
  responses: PropTypes.arrayOf(PropTypes.shape({
    answer: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.array,
      PropTypes.number
    ])
  }))
};

PdfReport.defaultProps = {
  assessment: null,
  answers: {},
  responses: []
};

// Export memoized version for performance
export const MemoizedPdfReport = React.memo(PdfReport);
