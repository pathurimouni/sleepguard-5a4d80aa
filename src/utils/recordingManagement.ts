
import { supabase } from "@/integrations/supabase/client";

export const deleteRecording = async (recordingId: string, filePath: string): Promise<boolean> => {
  try {
    const bucketName = filePath.includes('live-recording') ? 'live_recordings' : 'breathing_recordings';
    
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
      
    if (storageError) {
      console.error('Error deleting storage file:', storageError);
    }
    
    const { error: analysisError } = await supabase
      .from('apnea_analysis')
      .delete()
      .eq('recording_id', recordingId);
      
    if (analysisError) {
      console.error('Error deleting analysis record:', analysisError);
    }
    
    const { error: recordingError } = await supabase
      .from('breathing_recordings')
      .delete()
      .eq('id', recordingId);
      
    if (recordingError) {
      console.error('Error deleting recording record:', recordingError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteRecording:', error);
    return false;
  }
};
