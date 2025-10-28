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
      
      // ✅ Fixed: Use environment variable for logo URL
      const logoPath = import.meta.env.VITE_APP_LOGO_URL || '/logo.png';
      
      // --- 1. Logo Handling ---
      try { 
        const logoResponse = await fetch(logoPath); 
        if (logoResponse.ok) { 
          const logoBlob = await logoResponse.blob(); 
          logoUrl = URL.createObjectURL(logoBlob); 
          doc.addImage(logoUrl, 'PNG', 15, 10, 30, 10); 
        } else { 
          console.warn('Could not load logo: Response not OK'); 
        } 
      } catch (e) { 
        console.warn('Could not load logo (fetch error):', e.message); 
      } finally { 
        if (logoUrl) { 
          URL.revokeObjectURL(logoUrl); 
          logoUrl = null; 
        } 
      } 

      // --- 2. Title Section ---
      doc.setFontSize(18); 
      doc.setTextColor(40, 53, 147);
      doc.text(assessment.title || 'Assessment Report', 105, 20, { align: 'center' }); 

      // --- 3. Metadata & Description ---
      doc.setFontSize(10); 
      doc.setTextColor(100); 
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 30); 
      
      let currentY = 35;
      
      if (assessment.description) { 
        doc.setFontSize(12); 
        doc.setTextColor(60); 
        const splitDesc = doc.splitTextToSize(assessment.description, 180); 
        doc.text(splitDesc, 15, currentY); 
        currentY += splitDesc.length * 5 + 10;
      } 

      // --- 4. Questions Table ---
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

      if (tableData.length > 0) {
        doc.autoTable({ 
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
              `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, 
              105, 
              doc.internal.pageSize.height - 10, 
              { align: 'center' } 
            ); 
          } 
        }); 
      }
      
      const fileName = `${(assessment.title || 'report').replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
      doc.save(fileName); 
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
  assessment: { title: '', description: '', questions: [] },
  answers: {},
  responses: []
};
