import React, { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Button, CircularProgress } from '@mui/material';
import { PictureAsPdf } from '@mui/icons-material';
import PropTypes from 'prop-types';

export default function PdfReport({ assessment, answers, responses }) {
  // FIX: Renamed state to follow convention
  const [isGenerating, setIsGenerating] = useState(false); 

  // FIX: Use useCallback to memoize the generation function
  const generatePdf = useCallback(async () => {
    setIsGenerating(true);
    let logoUrl = null;
    
    try {
      const doc = new jsPDF();
      
      // Logo handling: Load and clean up URL
      try {
        const logoResponse = await fetch('/logo.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          logoUrl = URL.createObjectURL(logoBlob);
          doc.addImage(logoUrl, 'PNG', 15, 10, 30, 10);
        } else {
          console.warn('Could not load logo: Response not OK');
        }
      } catch (e) {
        // Handle network errors for logo gracefully
        console.warn('Could not load logo (fetch error):', e.message);
      } finally {
        // FIX: Clean up the object URL immediately after doc.addImage is done, 
        // which is safer than relying on setTimeout. jsPDF makes a copy.
        if (logoUrl) {
          URL.revokeObjectURL(logoUrl);
          logoUrl = null; // Clear reference
        }
      }

      // Title section
      doc.setFontSize(18);
      doc.setTextColor(40, 53, 147);
      doc.text(assessment.title, 105, 20, { align: 'center' });
      
      // Metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 30);
      
      if (assessment.description) {
        doc.setFontSize(12);
        doc.setTextColor(60);
        const splitDesc = doc.splitTextToSize(assessment.description, 180);
        // FIX: Adjust starting Y position based on logo presence and description
        const startY = assessment.description ? 40 : 35;
        doc.text(splitDesc, 15, startY);
      }
      
      // Questions table
      const tableData = assessment.questions.map((q, i) => {
        // Robustly determine the answer
        let answer = 'Not answered';

        if (Array.isArray(answers) && answers[i] !== undefined) {
          answer = answers[i];
        } else if (Array.isArray(responses) && responses[i]?.answer !== undefined) {
          answer = responses[i].answer;
        } else if (answers?.[i] !== undefined) {
          // Fallback for object-style access
          answer = answers[i];
        }

        if (Array.isArray(answer)) answer = answer.join(', ');
        
        return [
          `Q${i+1}`,
          q.text,
          String(answer).substring(0, 100) // Truncate long answers
        ];
      });

      doc.autoTable({
        // Calculate startY after description
        startY: doc.lastAutoTable.finalY + 10 || (assessment.description ? 65 : 50),
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
          1: { cellWidth: 100 },
          2: { cellWidth: 75 }
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        didDrawPage: (data) => {
          // Footer on each page
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`,
            105,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        }
      });
      
      doc.save(`${assessment.title.replace(/[^a-z0-9]/gi, '_')}_report.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      // Optional: Add a snackbar notification here
    } finally {
      setIsGenerating(false);
    }
  }, [assessment, answers, responses]); // Dependencies added

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={generatePdf}
      startIcon={isGenerating ? <CircularProgress size={20} /> : <PictureAsPdf />}
      disabled={isGenerating}
      size="small"
      sx={{ minWidth: 180 }}
    >
      {isGenerating ? 'Generating...' : 'Download PDF Report'}
    </Button>
  );
}

PdfReport.propTypes = {
  assessment: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    questions: PropTypes.arrayOf(PropTypes.shape({
      text: PropTypes.string.isRequired,
      type: PropTypes.string
    })).isRequired
  }).isRequired,
  // FIX: Changed answers to PropTypes.oneOfType to allow for arrays/objects
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
