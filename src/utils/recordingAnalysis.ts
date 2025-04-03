
import { supabase } from "@/integrations/supabase/client";

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
