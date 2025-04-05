
// Recording Types
export interface BreathingRecording {
  id: string;
  user_id: string;
  recorded_at: string;
  duration: number;
  url: string;
  analysis_complete: boolean;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  recording_type: 'breathing' | 'live';
}

export interface ApneaAnalysis {
  id: string;
  recording_id: string;
  is_apnea: boolean;
  confidence: number;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  events_per_hour: number;
  analysis_date: string;
  metadata?: Record<string, any>;
}

// Live Recording Types
export interface LiveRecording {
  id: string;
  user_id: string;
  recorded_at: string;
  duration: number;
  url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

// Analysis Results Types
export interface AnalysisResult {
  id: string;
  recording_id: string;
  result_type: string;
  value: number;
  unit: string;
  created_at: string;
}

// Recording Stats Types
export interface RecordingStats {
  totalRecordings: number;
  totalApneaEvents: number;
  averageSeverity: number;
  longestRecording: number;
}
