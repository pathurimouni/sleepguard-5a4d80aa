
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
}

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  // Get profile data from our profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  
  return {
    id: user.id,
    email: user.email || '',
    username: profile?.username || user.email?.split('@')[0] || '',
    avatarUrl: profile?.avatar_url || '',
  };
};

export const signUp = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
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
      
      return { 
        user: {
          id: data.user.id,
          email: data.user.email || '',
          username: profile?.username || data.user.email?.split('@')[0] || '',
          avatarUrl: profile?.avatar_url || '',
        }, 
        error: null 
      };
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
    
    return { error: null };
  } catch (err: any) {
    console.error('Profile update error:', err);
    return { error: err.message || 'An error occurred updating your profile' };
  }
};
