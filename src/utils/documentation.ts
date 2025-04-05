
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Add the missing types for jsPDF-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface DocumentationSection {
  title: string;
  content: string;
  subsections?: DocumentationSection[];
}

export const generateProjectDocumentation = () => {
  const doc = new jsPDF();
  
  // Title and basic info
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229); // Indigo color
  doc.text('SleepGuard Project Documentation', 20, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 30);
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Overview', 20, 40);
  
  doc.setFontSize(10);
  const overviewText = 
    'SleepGuard is a web application designed to help users monitor and detect sleep apnea patterns ' +
    'using microphone input. The application analyzes breathing sounds in real-time to identify ' +
    'potential breathing irregularities associated with sleep apnea.';
  
  doc.text(overviewText, 20, 50, { maxWidth: 170 });
  
  // Features
  doc.setFontSize(14);
  doc.text('Key Features', 20, 70);
  
  doc.setFontSize(10);
  const features = [
    'Real-time breathing pattern analysis using microphone input',
    'Sleep apnea event detection with visual alerts',
    'Recording and uploading capabilities for long-term monitoring',
    'Historical data viewing and analysis results',
    'Customizable detection sensitivity and automated scheduling',
    'Dark mode support and responsive design for all devices'
  ];
  
  let yPos = 80;
  features.forEach(feature => {
    doc.text(`• ${feature}`, 25, yPos);
    yPos += 8;
  });
  
  // Tech Stack
  doc.setFontSize(14);
  doc.text('Technology Stack', 20, yPos + 10);
  
  const techStack = [
    ['Frontend Framework', 'React with TypeScript'],
    ['State Management', 'React Hooks and Context API'],
    ['UI Components', 'Tailwind CSS, Shadcn UI, Framer Motion'],
    ['Audio Processing', 'Web Audio API, HuggingFace Transformers'],
    ['Data Visualization', 'Recharts'],
    ['Backend Storage', 'Supabase'],
    ['Authentication', 'Supabase Auth'],
    ['Deployment', 'Vercel/Netlify compatible']
  ];
  
  doc.autoTable({
    startY: yPos + 15,
    head: [['Component', 'Technology']],
    body: techStack,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 }
  });
  
  // System Architecture
  yPos = doc.autoTable.previous.finalY + 10;
  doc.setFontSize(14);
  doc.text('System Architecture', 20, yPos);
  
  doc.setFontSize(10);
  const architectureText = 
    'SleepGuard follows a client-centric architecture where most processing happens on the client side ' +
    'for privacy and performance reasons. Audio analysis is performed locally using the Web Audio API ' +
    'and optimized algorithms. Data is only sent to the server when users explicitly save recordings. ' +
    'The application is built with a component-based architecture following React best practices.';
  
  doc.text(architectureText, 20, yPos + 10, { maxWidth: 170 });
  
  // Add a new page
  doc.addPage();
  
  // Core Modules
  doc.setFontSize(14);
  doc.text('Core Modules', 20, 20);
  
  const modules = [
    ['Audio Capture', 'Handles microphone access and raw audio data acquisition'],
    ['Signal Processing', 'Filters and processes audio signals to extract breathing patterns'],
    ['Pattern Analysis', 'Detects irregularities in breathing patterns with ML algorithms'],
    ['Real-time Visualization', 'Displays breathing patterns and events in real-time charts'],
    ['Recording Management', 'Handles saving, uploading, and retrieving of recording data'],
    ['User Settings', 'Manages user preferences, sensitivity settings, and schedules']
  ];
  
  doc.autoTable({
    startY: 25,
    head: [['Module', 'Description']],
    body: modules,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 }
  });
  
  // Usage Instructions
  yPos = doc.autoTable.previous.finalY + 10;
  doc.setFontSize(14);
  doc.text('User Guide', 20, yPos);
  
  doc.setFontSize(12);
  yPos += 10;
  doc.text('Getting Started', 20, yPos);
  
  doc.setFontSize(10);
  yPos += 8;
  doc.text('1. Create an account or log in to access all features', 25, yPos);
  yPos += 8;
  doc.text('2. Grant microphone permissions when prompted', 25, yPos);
  yPos += 8;
  doc.text('3. Navigate to the Tracking page to begin monitoring', 25, yPos);
  yPos += 8;
  doc.text('4. Adjust sensitivity in Settings if needed', 25, yPos);
  
  yPos += 15;
  doc.setFontSize(12);
  doc.text('Sleep Tracking', 20, yPos);
  
  doc.setFontSize(10);
  yPos += 8;
  doc.text('1. Place device near your sleeping area', 25, yPos);
  yPos += 8;
  doc.text('2. Press "Start Tracking" before sleep', 25, yPos);
  yPos += 8;
  doc.text('3. The app will monitor breathing patterns throughout the night', 25, yPos);
  yPos += 8;
  doc.text('4. Press "Stop Tracking" upon waking to save session', 25, yPos);
  
  yPos += 15;
  doc.setFontSize(12);
  doc.text('Viewing Results', 20, yPos);
  
  doc.setFontSize(10);
  yPos += 8;
  doc.text('1. Navigate to the Dashboard to view history', 25, yPos);
  yPos += 8;
  doc.text('2. Select recordings to view detailed analysis', 25, yPos);
  yPos += 8;
  doc.text('3. Review detected events and breathing patterns', 25, yPos);
  
  // Recommendations
  yPos += 15;
  doc.setFontSize(14);
  doc.text('Recommendations', 20, yPos);
  
  doc.setFontSize(10);
  yPos += 10;
  const recommendationsText = 
    'For best results, place the device within 1-2 feet of your head during sleep. Ensure the microphone is ' +
    'not obstructed. If using automated scheduling, set the time to cover your entire sleep period with some ' +
    'buffer before and after. Start with a medium sensitivity setting (5-6) and adjust based on results.';
  
  doc.text(recommendationsText, 20, yPos, { maxWidth: 170 });
  
  // Privacy & Security
  yPos += 30;
  doc.setFontSize(14);
  doc.text('Privacy & Security', 20, yPos);
  
  doc.setFontSize(10);
  yPos += 10;
  const privacyText = 
    'SleepGuard processes all audio data locally on your device. Raw audio is never sent to our servers ' +
    'unless you explicitly choose to save recordings. Saved recordings are encrypted and stored securely. ' +
    'You can delete your recordings at any time from the Dashboard.';
  
  doc.text(privacyText, 20, yPos, { maxWidth: 170 });
  
  // Add a footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 10);
    doc.text('SleepGuard Documentation', 20, doc.internal.pageSize.getHeight() - 10);
  }
  
  return doc.save('SleepGuard_Documentation.pdf');
};

export default generateProjectDocumentation;
