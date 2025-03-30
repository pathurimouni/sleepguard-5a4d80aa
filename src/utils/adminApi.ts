
import { supabase } from "@/integrations/supabase/client";

// Function to fetch all users from the profiles table
export async function fetchAllUsers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

// Function to fetch all recordings with user information
export async function fetchAllRecordings() {
  try {
    const { data, error } = await supabase
      .from('breathing_recordings')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .order('recording_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching recordings:", error);
    throw error;
  }
}

// Function to fetch recordings for a specific user
export async function fetchUserRecordings(userId: string) {
  try {
    const { data, error } = await supabase
      .from('breathing_recordings')
      .select(`
        *,
        apnea_analysis(*)
      `)
      .eq('user_id', userId)
      .order('recording_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching user recordings:", error);
    throw error;
  }
}

// Function to fetch analytics data
export async function fetchAnalyticsData() {
  try {
    // User count
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    // Recording count
    const { count: recordingCount, error: recordingError } = await supabase
      .from('breathing_recordings')
      .select('*', { count: 'exact', head: true });
    
    // Apnea count
    const { count: apneaCount, error: apneaError } = await supabase
      .from('apnea_analysis')
      .select('*', { count: 'exact', head: true })
      .eq('is_apnea', true);
    
    if (userError || recordingError || apneaError) 
      throw userError || recordingError || apneaError;
    
    return {
      totalUsers: userCount || 0,
      totalRecordings: recordingCount || 0,
      totalApneaDetected: apneaCount || 0
    };
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    throw error;
  }
}
