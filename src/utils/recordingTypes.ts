
import { User } from "@/utils/auth";

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
