import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { SessionData } from './useSession';

interface Message {
  id: string;
  content: string;
  sender: string;
  created_at: string;
}

export function useExportTranscript() {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportAsText = useCallback((session: SessionData, messages: Message[]) => {
    const lines: string[] = [];
    
    // Header
    lines.push('═'.repeat(50));
    lines.push('CONVERSATION TRANSCRIPT');
    lines.push('═'.repeat(50));
    lines.push('');
    
    // Session Info
    lines.push(`Date: ${new Date(session.started_at).toLocaleDateString()}`);
    lines.push(`Duration: ${session.duration_seconds ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s` : 'N/A'}`);
    lines.push('');
    
    // Summary
    if (session.summary) {
      lines.push('─'.repeat(50));
      lines.push('SUMMARY');
      lines.push('─'.repeat(50));
      lines.push(session.summary);
      lines.push('');
    }
    
    // Goals
    if (session.main_goals && session.main_goals.length > 0) {
      lines.push('─'.repeat(50));
      lines.push('MAIN GOALS');
      lines.push('─'.repeat(50));
      session.main_goals.forEach((goal, i) => {
        lines.push(`${i + 1}. ${goal}`);
      });
      lines.push('');
    }
    
    // Topics
    if (session.topics_discussed && session.topics_discussed.length > 0) {
      lines.push('─'.repeat(50));
      lines.push('TOPICS DISCUSSED');
      lines.push('─'.repeat(50));
      lines.push(session.topics_discussed.join(', '));
      lines.push('');
    }
    
    // Transcript
    lines.push('─'.repeat(50));
    lines.push('TRANSCRIPT');
    lines.push('─'.repeat(50));
    lines.push('');
    
    messages.forEach((message) => {
      const sender = message.sender === 'user' ? 'You' : 'AI';
      const time = new Date(message.created_at).toLocaleTimeString();
      lines.push(`[${time}] ${sender}:`);
      lines.push(message.content);
      lines.push('');
    });
    
    lines.push('═'.repeat(50));
    lines.push('End of Transcript');
    lines.push('═'.repeat(50));
    
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${new Date(session.started_at).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const exportAsPDF = useCallback((session: SessionData, messages: Message[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPos = 20;

    const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      
      lines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 3;
    };

    const addSection = (title: string) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 5;
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
      addText(title, 12, true);
      yPos += 2;
    };

    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Conversation Transcript', margin, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(session.started_at).toLocaleDateString()}`, margin, 35);
    
    doc.setTextColor(0, 0, 0);
    yPos = 55;

    // Duration
    const duration = session.duration_seconds 
      ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s`
      : 'N/A';
    addText(`Duration: ${duration}`, 11);
    yPos += 5;

    // Summary
    if (session.summary) {
      addSection('Summary');
      addText(session.summary, 10);
    }

    // Goals
    if (session.main_goals && session.main_goals.length > 0) {
      addSection('Main Goals');
      session.main_goals.forEach((goal, i) => {
        addText(`${i + 1}. ${goal}`, 10);
      });
    }

    // Topics
    if (session.topics_discussed && session.topics_discussed.length > 0) {
      addSection('Topics Discussed');
      addText(session.topics_discussed.join('  •  '), 10);
    }

    // Transcript
    addSection('Transcript');
    
    messages.forEach((message) => {
      const sender = message.sender === 'user' ? 'You' : 'AI';
      const time = new Date(message.created_at).toLocaleTimeString();
      
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      // Sender badge
      if (message.sender === 'user') {
        doc.setFillColor(99, 102, 241);
      } else {
        doc.setFillColor(34, 197, 94);
      }
      doc.roundedRect(margin, yPos - 4, 25, 7, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(sender, margin + 2, yPos);
      
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(time, margin + 30, yPos);
      
      doc.setTextColor(0, 0, 0);
      yPos += 6;
      addText(message.content, 10);
      yPos += 3;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`transcript-${new Date(session.started_at).toISOString().split('T')[0]}.pdf`);
  }, []);

  return { exportAsText, exportAsPDF };
}
