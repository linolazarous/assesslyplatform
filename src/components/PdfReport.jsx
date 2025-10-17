import React, { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Button, CircularProgress } from '@mui/material';
import { PictureAsPdf } from '@mui/icons-material';
import PropTypes from 'prop-types';

export default function PdfReport({ assessment, answers, responses }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = useCallback(async () => {
    setIsGenerating(true);
    let logoUrl = null;
    
    try { 
      const doc = new jsPDF(); 
      
      // --- 1. Logo Handling ---
      try { 
        const logoResponse = await fetch('/logo.png'); 
        if (logoResponse.ok) { 
          const logoBlob = await logoResponse.blob(); 
          logoUrl = URL.createObjectURL(logoBlob); 
          // Assuming a standard A4 size (210mm wide), placing at x=15, y=10
          doc.addImage(logoUrl, 'PNG', 15, 10, 30, 10); 
        } else { 
          console.warn('Could not load logo: Response not OK'); 
        } 
      } catch (e) { 
        console.warn('Could not load logo (fetch error):', e.message); 
      } finally { 
        // IMPORTANT: Revoke the object URL to free up memory
        if (logoUrl) { 
          URL.revokeObjectURL(logoUrl); 
          logoUrl = null; 
        } 
      } 

      // --- 2. Title Section ---
      doc.setFontSize(18); 
      doc.setTextColor(40, 53, 147); // Deep indigo color
      doc.text(assessment.title, 105, 20, { align: 'center' }); 

      // --- 3. Metadata & Description ---
      doc.setFontSize(10); 
      doc.setTextColor(100); 
      // FIX: Template literal for date string
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 30); 
      
      let currentY = 35;
      
      if (assessment.description) { 
        doc.setFontSize(12); 
        doc.setTextColor(60); 
        const splitDesc = doc.splitTextToSize(assessment.description, 180); 
        doc.text(splitDesc, 15, currentY); 
        currentY += splitDesc.length * 5 + 10; // Calculate Y after description block
      } 

      // --- 4. Questions Table ---
      const tableData = assessment.questions.map((q, i) => { 
        let answer = 'Not answered'; 
        
        // Complex logic to find the answer from three possible sources
        if (Array.isArray(answers) && answers[i] !== undefined) { 
          answer = answers[i]; 
        } else if (Array.isArray(responses) && responses[i]?.answer !== undefined) { 
          answer = responses[i].answer; 
        } else if (answers?.[i] !== undefined) { 
          answer = answers[i]; 
        } 
        
        // Handle array answers (e.g., multiple selections)
        if (Array.isArray(answer)) answer = answer.join(', '); 
        
        // Fallback for null/undefined answers
        if (answer === null || answer === undefined || answer === '') answer = 'N/A';
        
        return [ 
          `Q${i+1}`, 
          q.text, 
          // Limit answer text length in the table
          String(answer).substring(0, 200) 
        ]; 
      }); 

      doc.autoTable({ 
        // Start table below description or metadata
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
          // Footer with page number
          doc.setFontSize(8); 
          doc.setTextColor(150); 
          // FIX: Template literal interpolation for page number
          doc.text( 
            `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, 
            105, 
            doc.internal.pageSize.height - 10, 
            { align: 'center' } 
          ); 
        } 
      }); 
      
      // FIX: Template literal interpolation for filename
      doc.save(`${assessment.title.replace(/[^a-z0-9]/gi, '_')}_report.pdf`); 
    } catch (error) { 
      console.error('PDF generation failed:', error); 
    } finally { 
      setIsGenerating(false); 
    } 
  }, [assessment, answers, responses]);

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={generatePdf}
      // FIX: Correctly render the icon or progress spinner in JSX
      startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />}
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

