
import { supabase } from "@/integrations/supabase/client";
import { BreathingRecording } from "./recordingTypes";

// Define the database table types to match Supabase schema
interface BreathingRecordingRow {
  id: string;
  user_id: string;
  recording_date: string;
  recording_file_path: string;
  duration: number;
  analysis_complete: boolean;
  recording_source?: string;
}

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
    
    if (!data) return [];
    
    // Transform data to match BreathingRecording interface
    return (data as BreathingRecordingRow[]).map(item => ({
      id: item.id,
      user_id: item.user_id,
      recording_date: item.recording_date,
      recording_file_path: item.recording_file_path,
      duration: item.duration,
      analysis_complete: item.analysis_complete,
      recording_source: item.recording_source,
      // Add default values for new fields to maintain compatibility
      file_name: item.recording_file_path.split('/').pop() || '',
      file_type: 'audio/webm',
      file_size: 0,
      created_at: item.recording_date,
      url: '', // Will be populated by getRecordingDownloadUrl when needed
      recording_type: item.recording_source === 'live' ? 'live' : 'breathing'
    }));
  } catch (error) {
    console.error('Error in getUserRecordings:', error);
    return [];
  }
};

export const getRecordingDownloadUrl = async (filePath: string): Promise<string | null> => {
  try {
    const bucketName = filePath.includes('live-recording') ? 'live_recordings' : 'breathing_recordings';
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600);
      
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error in getRecordingDownloadUrl:', error);
    return null;
  }
};
