import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface BreathingRecording {
  id: string;
  user_id: string;
  recording_file_path: string;
  recording_date: string | Date; 
  duration: number;
  analysis_complete: boolean;
  recording_source?: string;
}

export interface ApneaAnalysis {
  id: string;
  recording_id: string;
  is_apnea: boolean;
  confidence: number;
  severity: 'none' | 'mild' | 'moderate' | 'severe' | string;
  events_per_hour: number;
  analysis_date: string | Date;
  metadata?: Record<string, any>;
}

export const uploadBreathingRecording = async (
  userId: string,
  file: File,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<BreathingRecording | null> => {
  try {
    const filePath = `${userId}/${uuidv4()}-${file.name}`;
    
    const options: any = {
      cacheControl: '3600',
      upsert: false
    };
    
    if (onProgress) {
      options.onUploadProgress = (progress: { loaded: number; total: number }) => {
        const percent = (progress.loaded / progress.total) * 100;
        onProgress(percent);
      };
    }
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('breathing_recordings')
      .upload(filePath, file, options);
      
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }
    
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
    
    setTimeout(() => {
      analyzeRecording(recordingData.id);
    }, 500);
    
    return recordingData;
  } catch (error) {
    console.error('Error in uploadBreathingRecording:', error);
    return null;
  }
};

export const uploadLiveRecording = async (
  userId: string,
  audioBlob: Blob,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<BreathingRecording | null> => {
  try {
    const timestamp = new Date().toISOString();
    const filename = `live-recording-${timestamp}.webm`;
    const filePath = `${userId}/${filename}`;
    
    const file = new File([audioBlob], filename, { type: 'audio/webm' });
    
    const options: any = {
      cacheControl: '3600',
      upsert: false
    };
    
    if (onProgress) {
      options.onUploadProgress = (progress: { loaded: number; total: number }) => {
        const percent = (progress.loaded / progress.total) * 100;
        onProgress(percent);
      };
    }
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('live_recordings')
      .upload(filePath, file, options);
      
    if (uploadError) {
      console.error('Error uploading live recording:', uploadError);
      return null;
    }
    
    const { data: recordingData, error: recordingError } = await supabase
      .from('breathing_recordings')
      .insert({
        user_id: userId,
        recording_file_path: filePath,
        duration: duration,
        recording_source: 'live'
      })
      .select()
      .single();
      
    if (recordingError) {
      console.error('Error creating live recording record:', recordingError);
      return null;
    }
    
    setTimeout(() => {
      analyzeRecording(recordingData.id);
    }, 500);
    
    return recordingData;
  } catch (error) {
    console.error('Error in uploadLiveRecording:', error);
    return null;
  }
};

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

export const updateAnalysisMetadata = async (
  analysisId: string, 
  metadata: Record<string, any>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('apnea_analysis')
      .update({ 
        metadata: metadata 
      })
      .eq('id', analysisId);
      
    if (error) {
      console.error('Error updating analysis metadata:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateAnalysisMetadata:', error);
    return false;
  }
};

export const markAnalysisAsCancelled = async (recordingId: string): Promise<boolean> => {
  try {
    const { data: analysis, error: fetchError } = await supabase
      .from('apnea_analysis')
      .select('id')
      .eq('recording_id', recordingId)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching analysis record:', fetchError);
      
      const { error: insertError } = await supabase
        .from('apnea_analysis')
        .insert({
          recording_id: recordingId,
          is_apnea: false,
          confidence: 0,
          severity: 'none',
          events_per_hour: 0,
          metadata: { cancelled: true, cancelled_at: new Date().toISOString() }
        });
        
      if (insertError) {
        console.error('Error creating cancelled analysis record:', insertError);
        return false;
      }
      
      return true;
    }
    
    if (analysis) {
      const { error: updateError } = await supabase
        .from('apnea_analysis')
        .update({
          metadata: { cancelled: true, cancelled_at: new Date().toISOString() }
        })
        .eq('id', analysis.id);
        
      if (updateError) {
        console.error('Error updating analysis as cancelled:', updateError);
        return false;
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in markAnalysisAsCancelled:', error);
    return false;
  }
};

export const analyzeRecording = async (recordingId: string): Promise<void> => {
  try {
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
