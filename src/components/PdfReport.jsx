// src/components/PdfReport.jsx (Advanced version)
import React, { useState, useCallback } from 'react';
import { Button, CircularProgress, Box, Alert } from '@mui/material';
import { PictureAsPdf, ErrorOutline } from '@mui/icons-material';
import PropTypes from 'prop-types';

export default function PdfReport({ assessment, answers, responses }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generatePdf = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Validate assessment data
      if (!assessment) {
        throw new Error('No assessment data provided');
      }

      // Dynamic imports to reduce initial bundle size
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      // Initialize PDF document
      const doc = new jsPDF();
      
      // Title Section
      doc.setFontSize(18);
      doc.setTextColor(40, 53, 147);
      doc.text(assessment.title || 'Assessment Report', 105, 20, { align: 'center' });

      // Metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 30);
      
      let currentY = 35;
      
      // Description (if available)
      if (assessment.description) {
        doc.setFontSize(12);
        doc.setTextColor(60);
        const splitDesc = doc.splitTextToSize(assessment.description, 180);
        doc.text(splitDesc, 15, currentY);
        currentY += splitDesc.length * 5 + 10;
      }

      // Prepare table data
      const tableData = (assessment.questions || []).map((q, i) => {
        let answer = 'Not answered';
        
        if (Array.isArray(answers) && answers[i] !== undefined) {
          answer = answers[i];
        } else if (Array.isArray(responses) && responses[i]?.answer !== undefined) {
          answer = responses[i].answer;
        } else if (answers?.[i] !== undefined) {
          answer = answers[i];
        }
        
        if (Array.isArray(answer)) answer = answer.join(', ');
        if (answer === null || answer === undefined || answer === '') answer = 'N/A';
        
        return [
          `Q${i+1}`,
          q.text || 'No question text',
          String(answer).substring(0, 200)
        ];
      });

      // Create table if there's data
      if (tableData.length > 0) {
        autoTable.default(doc, {
          startY: currentY,
          head: [['#', 'Question', 'Answer']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [40, 53, 147],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 80 },
            2: { cellWidth: 95 }
          },
          styles: {
            fontSize: 10,
            cellPadding: 3,
            overflow: 'linebreak'
          },
          didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
              `Page ${data.pageNumber}`,
              105,
              doc.internal.pageSize.height - 10,
              { align: 'center' }
            );
          }
        });
      } else {
        // No questions message
        doc.setFontSize(12);
        doc.setTextColor(150);
        doc.text('No questions available in this assessment', 15, currentY);
      }

      // Save the PDF
      const fileName = `${(assessment.title || 'report').replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
      doc.save(fileName);
      
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError(err.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [assessment, answers, responses, isGenerating]);

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
          No assessment data available
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

export const MemoizedPdfReport = React.memo(PdfReport);
