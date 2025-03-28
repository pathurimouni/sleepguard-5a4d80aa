
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface BreathingRecording {
  id: string;
  user_id: string;
  recording_file_path: string;
  recording_date: string | Date; // Modified to accept both string and Date
  duration: number;
  analysis_complete: boolean;
}

export interface ApneaAnalysis {
  id: string;
  recording_id: string;
  is_apnea: boolean;
  confidence: number;
  severity: 'none' | 'mild' | 'moderate' | 'severe' | string; // Modified to accept any string
  events_per_hour: number;
  analysis_date: string | Date; // Modified to accept both string and Date
}

// Upload a breathing recording file
export const uploadBreathingRecording = async (
  userId: string,
  file: File,
  duration: number
): Promise<BreathingRecording | null> => {
  try {
    // Create a unique path for the file
    const filePath = `${userId}/${uuidv4()}-${file.name}`;
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('breathing_recordings')
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }
    
    // Create a record in the database
    const { data: recordingData, error: recordingError } = await supabase
      .from('breathing_recordings')
      .insert({
        user_id: userId,
        recording_file_path: filePath,
        duration: duration
      })
      .select()
      .single();
      
    if (recordingError) {
      console.error('Error creating recording record:', recordingError);
      return null;
    }
    
    // Trigger analysis (this would be handled by the analyzeRecording function)
    analyzeRecording(recordingData.id);
    
    return recordingData;
  } catch (error) {
    console.error('Error in uploadBreathingRecording:', error);
    return null;
  }
};

// Get all recordings for a user
export const getUserRecordings = async (userId: string): Promise<BreathingRecording[]> => {
  try {
    const { data, error } = await supabase
      .from('breathing_recordings')
      .select('*')
      .eq('user_id', userId)
      .order('recording_date', { ascending: false });
      
    if (error) {
      console.error('Error fetching recordings:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUserRecordings:', error);
    return [];
  }
};

// Get analysis results for a recording
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
    
    return data;
  } catch (error) {
    console.error('Error in getRecordingAnalysis:', error);
    return null;
  }
};

// Analyze a recording using our edge function
export const analyzeRecording = async (recordingId: string): Promise<void> => {
  try {
    // Call the Supabase Edge Function to analyze the recording
    const { error } = await supabase.functions.invoke('analyze-apnea', {
      body: { recordingId }
    });
    
    if (error) {
      console.error('Error invoking analysis function:', error);
    }
  } catch (error) {
    console.error('Error in analyzeRecording:', error);
  }
};
