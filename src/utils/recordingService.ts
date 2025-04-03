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

// Upload a breathing recording file with real progress tracking
export const uploadBreathingRecording = async (
  userId: string,
  file: File,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<BreathingRecording | null> => {
  try {
    // Create a unique path for the file
    const filePath = `${userId}/${uuidv4()}-${file.name}`;
    
    // Upload file to storage with progress monitoring
    const options: any = {
      cacheControl: '3600',
      upsert: false
    };
    
    // Add onUploadProgress callback if provided
    if (onProgress) {
      options.onUploadProgress = (progress: { loaded: number; total: number }) => {
        // Calculate upload percentage
        const percent = (progress.loaded / progress.total) * 100;
        // Report progress if callback provided
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
    // Use a shorter timeout to make the analysis appear faster
    setTimeout(() => {
      analyzeRecording(recordingData.id);
    }, 500); // Reduced from default to 500ms
    
    return recordingData;
  } catch (error) {
    console.error('Error in uploadBreathingRecording:', error);
    return null;
  }
};

// Upload a live recording to the new live_recordings bucket
export const uploadLiveRecording = async (
  userId: string,
  audioBlob: Blob,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<BreathingRecording | null> => {
  try {
    // Create a unique filename with timestamp
    const timestamp = new Date().toISOString();
    const filename = `live-recording-${timestamp}.webm`;
    const filePath = `${userId}/${filename}`;
    
    // Create a File object from the Blob
    const file = new File([audioBlob], filename, { type: 'audio/webm' });
    
    // Upload options
    const options: any = {
      cacheControl: '3600',
      upsert: false
    };
    
    // Add progress callback if provided
    if (onProgress) {
      options.onUploadProgress = (progress: { loaded: number; total: number }) => {
        const percent = (progress.loaded / progress.total) * 100;
        onProgress(percent);
      };
    }
    
    // Upload to the live_recordings bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('live_recordings')
      .upload(filePath, file, options);
      
    if (uploadError) {
      console.error('Error uploading live recording:', uploadError);
      return null;
    }
    
    // Create a record in the breathing_recordings table
    const { data: recordingData, error: recordingError } = await supabase
      .from('breathing_recordings')
      .insert({
        user_id: userId,
        recording_file_path: filePath,
        duration: duration,
        recording_source: 'live' // Add metadata to indicate this was a live recording
      })
      .select()
      .single();
      
    if (recordingError) {
      console.error('Error creating live recording record:', recordingError);
      return null;
    }
    
    // Trigger analysis for the live recording
    setTimeout(() => {
      analyzeRecording(recordingData.id);
    }, 500);
    
    return recordingData;
  } catch (error) {
    console.error('Error in uploadLiveRecording:', error);
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

// Update analysis metadata (including cancellation status)
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

// Mark analysis as cancelled
export const markAnalysisAsCancelled = async (recordingId: string): Promise<boolean> => {
  try {
    // First check if analysis record exists
    const { data: analysis, error: fetchError } = await supabase
      .from('apnea_analysis')
      .select('id')
      .eq('recording_id', recordingId)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') {
      // Record not found is not an error in this context
      console.error('Error fetching analysis record:', fetchError);
      
      // Create a cancelled analysis record if none exists
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
      // Update existing record
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

// Get a download URL for a recording
export const getRecordingDownloadUrl = async (filePath: string): Promise<string | null> => {
  try {
    // Determine which bucket to use based on file path
    const bucketName = filePath.includes('live-recording') ? 'live_recordings' : 'breathing_recordings';
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600); // 1 hour expiry
      
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

// Delete a recording and its analysis
export const deleteRecording = async (recordingId: string, filePath: string): Promise<boolean> => {
  try {
    // Determine which bucket to use based on file path
    const bucketName = filePath.includes('live-recording') ? 'live_recordings' : 'breathing_recordings';
    
    // First delete the file from storage
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
      
    if (storageError) {
      console.error('Error deleting storage file:', storageError);
      // Continue with database deletion even if storage deletion fails
    }
    
    // Delete the analysis record
    const { error: analysisError } = await supabase
      .from('apnea_analysis')
      .delete()
      .eq('recording_id', recordingId);
      
    if (analysisError) {
      console.error('Error deleting analysis record:', analysisError);
      // Continue with recording deletion even if analysis deletion fails
    }
    
    // Delete the recording record
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
