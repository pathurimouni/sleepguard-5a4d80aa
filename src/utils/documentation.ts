
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export const generateProjectDocumentation = async (): Promise<boolean> => {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Add document title
    doc.setFontSize(24);
    doc.setTextColor(0, 51, 102);
    doc.text("SleepGuard", 105, 20, { align: "center" });
    doc.text("Project Documentation", 105, 30, { align: "center" });

    // Add date
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${format(new Date(), "PPP")}`, 105, 40, { align: "center" });

    // Add project overview section
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text("Project Overview", 20, 60);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(
      "SleepGuard is a comprehensive sleep apnea monitoring and analysis application that uses " +
      "advanced audio processing to detect and analyze breathing patterns during sleep. It can " +
      "record, analyze, and provide insights into potential sleep apnea episodes.",
      20, 70, { maxWidth: 170 }
    );

    // Add key features section
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Key Features", 20, 100);

    // Create a table for features
    autoTable(doc, {
      startY: 105,
      head: [["Feature", "Description"]],
      body: [
        ["Real-time Monitoring", "Monitors breathing patterns in real-time using microphone input"],
        ["Sleep Apnea Detection", "Detects potential sleep apnea events using audio analysis"],
        ["Recording Storage", "Securely stores and organizes sleep recordings for later review"],
        ["Detailed Analysis", "Provides detailed analysis of sleep quality and apnea events"],
        ["Scheduling", "Automatic scheduled recordings based on user-defined preferences"],
        ["User Dashboard", "Visual representation of sleep data and trends over time"]
      ],
      headStyles: { fillColor: [0, 51, 102] },
      styles: { font: "helvetica", fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 120 }
      }
    });

    // Add a new page
    doc.addPage();

    // Add technical architecture section
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text("Technical Architecture", 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(
      "SleepGuard is built using a modern React-based frontend with TypeScript for type safety. " +
      "It leverages Supabase for backend services including authentication, database, and storage. " +
      "The application uses advanced audio processing algorithms for apnea detection.",
      20, 30, { maxWidth: 170 }
    );

    // Create a table for architecture components
    autoTable(doc, {
      startY: 50,
      head: [["Component", "Technology", "Purpose"]],
      body: [
        ["Frontend", "React, TypeScript, Tailwind CSS", "User interface and client-side logic"],
        ["Backend", "Supabase", "API, Authentication, Database, Storage"],
        ["Audio Processing", "Web Audio API, Custom Algorithms", "Breathing pattern analysis"],
        ["State Management", "React Hooks, Context", "Application state and data flow"],
        ["Storage", "IndexedDB, Local Storage", "Client-side data persistence"],
        ["Deployment", "Vercel/Netlify", "Web hosting and distribution"]
      ],
      headStyles: { fillColor: [0, 51, 102] },
      styles: { font: "helvetica", fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 60 },
        2: { cellWidth: 70 }
      }
    });

    // Add implementation details section
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Implementation Details", 20, 110);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(
      "The apnea detection system works by capturing audio through the device microphone, " +
      "analyzing the frequency patterns, and identifying potential apnea events based on " +
      "machine learning insights. Data is securely stored and analyzed in real-time.",
      20, 120, { maxWidth: 170 }
    );

    // Add page for user guide
    doc.addPage();

    // Add user guide section
    doc.setFontSize(20);
    doc.setTextColor(0, 51, 102);
    doc.text("User Guide", 20, 20);

    // Create a table for user guide steps
    autoTable(doc, {
      startY: 30,
      head: [["Step", "Action", "Notes"]],
      body: [
        ["1", "Create an account", "Sign up with email and password"],
        ["2", "Set up your profile", "Enter sleep information and preferences"],
        ["3", "Start sleep tracking", "Place device near bed and start tracking"],
        ["4", "View results", "Check dashboard for sleep analysis"],
        ["5", "Configure settings", "Adjust sensitivity and alert preferences"],
        ["6", "Schedule recordings", "Set up automatic sleep tracking"]
      ],
      headStyles: { fillColor: [0, 51, 102] },
      styles: { font: "helvetica", fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 60 },
        2: { cellWidth: 90 }
      }
    });

    // Add recommendations section
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Recommendations", 20, 90);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(
      "For optimal results, please follow these recommendations:\n\n" +
      "• Place the device within 3-5 feet of your head during sleep\n" +
      "• Ensure the microphone is not obstructed\n" +
      "• Use in a quiet environment with minimal background noise\n" +
      "• Charge your device before overnight tracking\n" +
      "• Consult a healthcare professional for medical advice",
      20, 100, { maxWidth: 170 }
    );

    // Add disclaimer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Disclaimer: SleepGuard is not a medical device and should not be used to diagnose or treat any " +
      "medical condition. Always consult with a healthcare professional for medical advice.",
      20, 140, { maxWidth: 170 }
    );

    // Add page number to all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, 105, 287, { align: "center" });
    }

    // Save the PDF
    doc.save("SleepGuard_Documentation.pdf");
    return true;
  } catch (error) {
    console.error("Error generating documentation:", error);
    return false;
  }
};
