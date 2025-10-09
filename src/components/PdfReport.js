import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Button, CircularProgress } from '@mui/material';
import { PictureAsPdf } from '@mui/icons-material';
import PropTypes from 'prop-types';

export default function PdfReport({ assessment, answers, responses }) {
  const [generating, setGenerating] = React.useState(false);

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      
      // Add logo with improved loading
      let logoUrl = null;
      try {
        const logoResponse = await fetch('/logo.png');
        if (!logoResponse.ok) {
          throw new Error('Logo not found');
        }
        const logoBlob = await logoResponse.blob();
        logoUrl = URL.createObjectURL(logoBlob);
        
        // Add logo to PDF
        doc.addImage(logoUrl, 'PNG', 15, 10, 30, 10);
        
        // Clean up the object URL after a short delay
        setTimeout(() => {
          if (logoUrl) URL.revokeObjectURL(logoUrl);
        }, 1000);
        
      } catch (e) {
        console.warn('Could not load logo:', e.message);
        // Continue without logo - don't break PDF generation
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
        doc.text(splitDesc, 15, 40);
      }
      
      // Questions table
      const tableData = assessment.questions.map((q, i) => {
        let answer = answers?.[i] || responses?.[i]?.answer || 'Not answered';
        if (Array.isArray(answer)) answer = answer.join(', ');
        return [
          `Q${i+1}`,
          q.text,
          String(answer).substring(0, 100) // Truncate long answers
        ];
      });

      doc.autoTable({
        startY: 50,
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
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={generatePdf}
      startIcon={generating ? <CircularProgress size={20} /> : <PictureAsPdf />}
      disabled={generating}
      size="small"
      sx={{ minWidth: 180 }}
    >
      {generating ? 'Generating...' : 'Download PDF Report'}
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
  answers: PropTypes.object,
  responses: PropTypes.arrayOf(PropTypes.shape({
    answer: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.array,
      PropTypes.number
    ])
  }))
};
