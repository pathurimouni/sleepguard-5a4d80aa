
import { supabase } from "@/integrations/supabase/client";
import { BreathingRecording, ApneaAnalysis } from "./recordingTypes";

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
