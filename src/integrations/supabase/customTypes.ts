
// This file contains custom type definitions for Supabase tables
// Use this file alongside the auto-generated types.ts

import { Database } from './types';

// Enhancement to include missing tables in types
export interface EnhancedDatabase extends Database {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      training_datasets: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          file_path: string;
          file_type: string;
          file_size: number;
          created_at: string;
          is_public: boolean;
          labels: { apnea: number; normal: number };
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          file_path: string;
          file_type: string;
          file_size: number;
          created_at?: string;
          is_public?: boolean;
          labels?: { apnea: number; normal: number };
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          file_path?: string;
          file_type?: string;
          file_size?: number;
          created_at?: string;
          is_public?: boolean;
          labels?: { apnea: number; normal: number };
          created_by?: string;
        };
      };
      ai_models: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          model_type: string;
          architecture: string;
          accuracy: number;
          parameters: number;
          file_path: string;
          file_size: number;
          created_at: string;
          status: string;
          is_active: boolean;
          trained_by: string;
          training_time: number | null;
          training_dataset_id: string | null;
          validation_results: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          model_type: string;
          architecture: string;
          accuracy: number;
          parameters: number;
          file_path: string;
          file_size: number;
          created_at?: string;
          status: string;
          is_active?: boolean;
          trained_by: string;
          training_time?: number | null;
          training_dataset_id?: string | null;
          validation_results?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          model_type?: string;
          architecture?: string;
          accuracy?: number;
          parameters?: number;
          file_path?: string;
          file_size?: number;
          created_at?: string;
          status?: string;
          is_active?: boolean;
          trained_by?: string;
          training_time?: number | null;
          training_dataset_id?: string | null;
          validation_results?: Record<string, any> | null;
        };
      };
      detection_sessions: {
        Row: {
          id: string;
          user_id: string;
          start_time: string;
          end_time: string | null;
          duration: number | null;
          apnea_count: number;
          normal_count: number;
          average_confidence: number;
          severity_score: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          start_time?: string;
          end_time?: string | null;
          duration?: number | null;
          apnea_count?: number;
          normal_count?: number;
          average_confidence?: number;
          severity_score?: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          start_time?: string;
          end_time?: string | null;
          duration?: number | null;
          apnea_count?: number;
          normal_count?: number;
          average_confidence?: number;
          severity_score?: number;
          notes?: string | null;
        };
      };
      detection_events: {
        Row: {
          id: string;
          session_id: string;
          timestamp: string;
          label: string;
          confidence: number;
          duration: number;
          feature_data: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          timestamp?: string;
          label: string;
          confidence: number;
          duration?: number;
          feature_data?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          timestamp?: string;
          label?: string;
          confidence?: number;
          duration?: number;
          feature_data?: Record<string, any> | null;
        };
      };
    };
  };
}

// Type for Dataset used in AdminDatasets.tsx
export interface Dataset {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  is_public: boolean;
  labels: { apnea: number; normal: number };
  created_by: string;
}

// Type for Model used in AdminModels.tsx
export interface Model {
  id: string;
  name: string;
  description: string | null;
  model_type: string;
  architecture: string;
  accuracy: number;
  parameters: number;
  file_path: string;
  file_size: number;
  created_at: string;
  status: 'training' | 'ready' | 'failed';
  is_active: boolean;
  trained_by: string;
  training_time: number | null;
  training_dataset_id: string | null;
  validation_results: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    confusion_matrix: number[][];
  } | null;
}

// Types for Analytics.tsx
export interface DetectionSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  apnea_count: number;
  normal_count: number;
  average_confidence: number;
  severity_score: number;
  notes: string | null;
}

export interface DetectionEvent {
  id: string;
  session_id: string;
  timestamp: string;
  label: string;
  confidence: number;
  duration: number;
  feature_data: Record<string, any> | null;
}
