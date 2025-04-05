import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { BreathingRecording } from "./recordingTypes";
import { analyzeRecording } from "./recordingAnalysis";

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
    
    // Transform return data to match BreathingRecording interface
    const result: BreathingRecording = {
      id: recordingData.id,
      user_id: recordingData.user_id,
      recording_date: recordingData.recording_date,
      recording_file_path: recordingData.recording_file_path,
      duration: recordingData.duration,
      analysis_complete: recordingData.analysis_complete || false,
      recording_source: recordingData.recording_source || undefined,
      // Add default values for new fields
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      created_at: new Date().toISOString(),
      url: '', // Will be populated by getRecordingDownloadUrl when needed
      recording_type: 'breathing'
    };
    
    return result;
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
    
    // Transform return data to match BreathingRecording interface
    const result: BreathingRecording = {
      id: recordingData.id,
      user_id: recordingData.user_id,
      recording_date: recordingData.recording_date,
      recording_file_path: recordingData.recording_file_path,
      duration: recordingData.duration,
      analysis_complete: recordingData.analysis_complete || false,
      recording_source: recordingData.recording_source || 'live',
      // Add default values for new fields
      file_name: filename,
      file_type: 'audio/webm',
      file_size: audioBlob.size,
      created_at: timestamp,
      url: '', // Will be populated by getRecordingDownloadUrl when needed
      recording_type: 'live'
    };
    
    return result;
  } catch (error) {
    console.error('Error in uploadLiveRecording:', error);
    return null;
  }
};
