import React from 'react';
import { jsPDF } from 'jspdf';
import { Download, FileText, CheckCircle2, ArrowLeft, Printer, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { testCases } from '../constants/testCases';

export default function TestCases() {
  const handlePrint = () => {
    window.print();
  };

  const downloadAsText = () => {
    let content = "VISUAL STEPS - USER TEST CASES\n";
    content += "==============================\n\n";
    
    testCases.forEach(tc => {
      content += `${tc.id}: ${tc.title}\n`;
      content += `Description: ${tc.description}\n`;
      content += "Steps:\n";
      tc.steps.forEach((step, i) => {
        content += `  ${i + 1}. ${step}\n`;
      });
      content += `Expected Result: ${tc.expected}\n`;
      content += "------------------------------\n\n";
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'VisualSteps_TestCases.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); // blue-800
    doc.text('Visual Steps - User Test Cases', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    let yPos = 45;
    
    testCases.forEach((tc, index) => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      // TC Header
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text(`${tc.id}: ${tc.title}`, 20, yPos);
      yPos += 8;
      
      // Description
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105); // slate-600
      const descLines = doc.splitTextToSize(`Description: ${tc.description}`, pageWidth - 40);
      doc.text(descLines, 20, yPos);
      yPos += (descLines.length * 6) + 4;
      
      // Steps
      doc.setFont('helvetica', 'bold');
      doc.text('Steps:', 20, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      tc.steps.forEach((step, i) => {
        const stepLines = doc.splitTextToSize(`${i + 1}. ${step}`, pageWidth - 50);
        doc.text(stepLines, 25, yPos);
        yPos += (stepLines.length * 6);
      });
      yPos += 4;
      
      // Expected
      doc.setFont('helvetica', 'bold');
      doc.text('Expected Result:', 20, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const expLines = doc.splitTextToSize(tc.expected, pageWidth - 40);
      doc.text(expLines, 20, yPos);
      yPos += (expLines.length * 6) + 15; // Space between test cases
    });
    
    try {
      // More robust download method for iframes
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'VisualSteps_TestCases.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      console.error('PDF generation failed', e);
      doc.save('VisualSteps_TestCases.pdf');
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8 no-print">
          <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={downloadAsText}
              className="flex items-center px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Download .txt
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-6 py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-all transform hover:scale-105 active:scale-95"
            >
              <Printer className="h-5 w-5 mr-2" />
              Print / Save as PDF
            </button>
            <button
              onClick={generatePDF}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
            >
              <Download className="h-5 w-5 mr-2" />
              Direct Download (PDF)
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-blue-600 px-8 py-10 text-white">
            <div className="flex items-center mb-4">
              <FileText className="h-10 w-10 mr-4" />
              <h1 className="text-3xl font-bold">User Test Cases</h1>
            </div>
            <p className="text-blue-100 text-lg">
              Comprehensive test suite for Visual Steps application. Use these cases to verify core functionality.
            </p>
          </div>

          <div className="p-8">
            <div className="space-y-10">
              {testCases.map((tc) => (
                <div key={tc.id} className="border-b border-slate-100 pb-10 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-2">
                        {tc.id}
                      </span>
                      <h2 className="text-2xl font-bold text-slate-900">{tc.title}</h2>
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mt-1" />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Description</h3>
                      <p className="text-slate-700">{tc.description}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Test Steps</h3>
                      <ul className="space-y-2">
                        {tc.steps.map((step, i) => (
                          <li key={i} className="flex items-start">
                            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-bold mr-3 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-slate-700">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                      <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-1">Expected Result</h3>
                      <p className="text-emerald-900 font-medium">{tc.expected}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
}
