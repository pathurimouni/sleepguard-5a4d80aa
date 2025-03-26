
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

// Initialize Supabase client
// Provide fallback values to prevent errors when environment variables are not set
const supabaseUrl = "https://nspeqndfwuwpfthesgdx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcGVxbmRmd3V3cGZ0aGVzZ2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2Mzk0MTUsImV4cCI6MjA1NzIxNTQxNX0.Fc9kZnMqAt5dMRTpnMLjC_TAuloJ3qApDRMuuHENVgI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

export interface User {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
}

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    // Clear any leftover user data in localStorage
    localStorage.removeItem("sleepguard-user");
    return null;
  }
  
  // Get profile data from our profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  
  // Update local storage with current user
  const userData = {
    id: user.id,
    email: user.email || '',
    username: profile?.username || user.email?.split('@')[0] || '',
    avatarUrl: profile?.avatar_url || '',
  };
  
  localStorage.setItem("sleepguard-user", JSON.stringify(userData));
  
  return userData;
};

export const signUp = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
      toast.success("Signup successful! Please check your email for confirmation.");
      return { 
        user: {
          id: data.user.id,
          email: data.user.email || '',
        }, 
        error: null 
      };
    }
    
    return { user: null, error: 'Signup successful. Please check your email for confirmation.' };
  } catch (err: any) {
    console.error('Signup error:', err);
    return { user: null, error: err.message || 'An error occurred during signup' };
  }
};

export const signIn = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle();
      
      const userData = {
        id: data.user.id,
        email: data.user.email || '',
        username: profile?.username || data.user.email?.split('@')[0] || '',
        avatarUrl: profile?.avatar_url || '',
      };
      
      // Update local storage
      localStorage.setItem("sleepguard-user", JSON.stringify(userData));
      
      return { user: userData, error: null };
    }
    
    return { user: null, error: 'Unknown error occurred' };
  } catch (err: any) {
    console.error('Login error:', err);
    return { user: null, error: err.message || 'An error occurred during login' };
  }
};

export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Remove user from localStorage
    localStorage.removeItem("sleepguard-user");
    
    // Force redirect to login page
    window.location.href = "/login";
    
    return { error: null };
  } catch (err: any) {
    console.error('Logout error:', err);
    return { error: err.message || 'An error occurred during logout' };
  }
};

export const updateProfile = async (profileData: { username?: string; avatarUrl?: string }): Promise<{ error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');
    
    const updates = {
      id: user.id,
      ...(profileData.username && { username: profileData.username }),
      ...(profileData.avatarUrl && { avatar_url: profileData.avatarUrl }),
      updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (error) throw error;
    
    // Update local storage if needed
    const currentUser = JSON.parse(localStorage.getItem("sleepguard-user") || "null");
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        ...(profileData.username && { username: profileData.username }),
        ...(profileData.avatarUrl && { avatarUrl: profileData.avatarUrl }),
      };
      localStorage.setItem("sleepguard-user", JSON.stringify(updatedUser));
    }
    
    return { error: null };
  } catch (err: any) {
    console.error('Profile update error:', err);
    return { error: err.message || 'An error occurred updating your profile' };
  }
};
