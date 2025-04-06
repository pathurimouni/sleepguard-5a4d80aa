
import { supabase } from "@/integrations/supabase/client";
import { BreathingRecording, ApneaAnalysis } from "./recordingTypes";

// Define interfaces for Supabase database row types
interface ApneaAnalysisRow {
  id: string;
  recording_id: string;
  is_apnea: boolean;
  confidence: number;
  severity: string | null;
  events_per_hour: number | null;
  analysis_date: string;
  metadata?: Record<string, any>;
}

// Function to analyze a recording using the Supabase edge function
export const analyzeRecording = async (recordingId: string): Promise<boolean> => {
  return triggerRecordingAnalysis(recordingId);
};

export const triggerRecordingAnalysis = async (recordingId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-apnea', {
      body: { recordingId }
    });
    
    if (error) {
      console.error('Error triggering analysis:', error);
      return false;
    }
    
    console.log('Analysis triggered successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in triggerRecordingAnalysis:', error);
    return false;
  }
};

export const markAnalysisAsCancelled = async (recordingId: string): Promise<boolean> => {
  try {
    // First, update the recording's analysis_complete status
    const { error: recordingError } = await supabase
      .from('breathing_recordings')
      .update({ analysis_complete: true })
      .eq('id', recordingId);
      
    if (recordingError) {
      console.error('Error updating recording status:', recordingError);
      return false;
    }
    
    // Then, create a cancelled analysis record
    const { error: analysisError } = await supabase
      .from('apnea_analysis')
      .upsert({
        recording_id: recordingId,
        is_apnea: false,
        confidence: 0,
        severity: 'none',
        events_per_hour: 0,
        metadata: { cancelled: true }
      });
      
    if (analysisError) {
      console.error('Error creating cancelled analysis:', analysisError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in markAnalysisAsCancelled:', error);
    return false;
  }
};

// Function to get analysis for a recording from Supabase
export const getRecordingAnalysis = async (recordingId: string): Promise<ApneaAnalysis | null> => {
  try {
    const { data, error } = await supabase
      .from('apnea_analysis')
      .select('*')
      .eq('recording_id', recordingId)
      .single();
      
    if (error) {
      console.error('Error fetching analysis:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    const row = data as ApneaAnalysisRow;
    
    // Convert string severity to appropriate enum value
    let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';
    
    if (row.severity === 'mild' || row.severity === 'moderate' || row.severity === 'severe') {
      severity = row.severity;
    }
    
    // Ensure metadata is always an object even if it's missing in the database
    const metadata = row.metadata || {};
    
    return {
      id: row.id,
      recording_id: row.recording_id,
      is_apnea: row.is_apnea,
      confidence: row.confidence,
      severity: severity,
      events_per_hour: row.events_per_hour || 0,
      analysis_date: row.analysis_date,
      metadata
    };
  } catch (error) {
    console.error('Error in getRecordingAnalysis:', error);
    return null;
  }
};

// Function to check if recording analysis is completed
export const checkAnalysisStatus = async (recordingId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('breathing_recordings')
      .select('analysis_complete')
      .eq('id', recordingId)
      .single();
      
    if (error || !data) {
      console.error('Error checking analysis status:', error);
      return false;
    }
    
    return data.analysis_complete;
  } catch (error) {
    console.error('Error in checkAnalysisStatus:', error);
    return false;
  }
};

export const simulateRecordingAnalysis = (recording: BreathingRecording): ApneaAnalysis => {
  // Get a random severity with weighted distribution
  const random = Math.random();
  let severity: 'none' | 'mild' | 'moderate' | 'severe';
  
  if (random < 0.4) {
    severity = 'none';
  } else if (random < 0.7) {
    severity = 'mild';
  } else if (random < 0.9) {
    severity = 'moderate';
  } else {
    severity = 'severe';
  }
  
  // Calculate realistic confidence based on severity
  let confidence: number;
  switch (severity) {
    case 'severe':
      confidence = 0.85 + (Math.random() * 0.15);
      break;
    case 'moderate':
      confidence = 0.7 + (Math.random() * 0.15);
      break;
    case 'mild':
      confidence = 0.55 + (Math.random() * 0.15);
      break;
    default:
      confidence = 0.25 + (Math.random() * 0.3);
  }
  
  // Calculate events per hour based on severity
  let eventsPerHour: number;
  switch (severity) {
    case 'severe':
      eventsPerHour = 30 + Math.floor(Math.random() * 20);
      break;
    case 'moderate':
      eventsPerHour = 15 + Math.floor(Math.random() * 15);
      break;
    case 'mild':
      eventsPerHour = 5 + Math.floor(Math.random() * 10);
      break;
    default:
      eventsPerHour = Math.floor(Math.random() * 5);
  }
  
  // Create example metadata for model information
  const metadata = {
    model: "CNN Apnea Detector v2.1",
    architecture: "Deep Convolutional Neural Network",
    totalParams: 1830000 + Math.floor(Math.random() * 50000),
    accuracy: 0.92 + (Math.random() * 0.07),
    processingTime: 1200 + Math.floor(Math.random() * 1000),
    breathingPatterns: {
      regular: severity === 'none' ? 0.8 + (Math.random() * 0.2) : 0.2 + (Math.random() * 0.3),
      irregular: severity !== 'none' ? 0.7 + (Math.random() * 0.3) : 0.1 + (Math.random() * 0.2),
      apneic: severity === 'severe' ? 0.8 + (Math.random() * 0.2) : 
             severity === 'moderate' ? 0.5 + (Math.random() * 0.3) :
             severity === 'mild' ? 0.2 + (Math.random() * 0.3) : 0.05 + (Math.random() * 0.1)
    }
  };
  
  return {
    id: crypto.randomUUID(),
    recording_id: recording.id,
    is_apnea: severity !== 'none',
    confidence: confidence,
    severity: severity,
    events_per_hour: eventsPerHour,
    analysis_date: new Date().toISOString(),
    metadata: metadata
  };
};
