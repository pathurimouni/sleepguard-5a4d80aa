
// Define common types used across the apnea detection system

// Define type for audio analysis result
export interface AudioAnalysisResult {
  isApnea: boolean;
  confidence: number;
  duration: number;
  pattern: "normal" | "interrupted" | "missing";
  detectedSounds?: {
    snoring: boolean;
    coughing: boolean;
    gasping: boolean;
    pausedBreathing: boolean;
  };
  timestamp?: number;
  frequencyData?: number[];
  nonBreathingNoise?: boolean;
  message?: string;
  patternType?: string;
  referenceMatch?: {
    patternName: string;
    similarity: number;
    description: string;
  };
}

// Pre-defined pattern types to avoid complex union types
export type PatternType = 
  | "regular-quiet"
  | "deeper-sleep"
  | "continued-effort"
  | "moderate-reduction"
  | "complete-cessation"
  | "gradual-central";

// Predefined sound detection types
export type SoundType = "snoring" | "coughing" | "gasping" | "pausedBreathing" | "normal";

// Storage for detection events
export const detectionEvents: AudioAnalysisResult[] = [];

// Get recent detection events
export const getRecentDetectionEvents = (): AudioAnalysisResult[] => {
  return [...detectionEvents];
};

// Add detection event
export const addDetectionEvent = (event: AudioAnalysisResult) => {
  if (detectionEvents.length >= 10) detectionEvents.shift();
  detectionEvents.push(event);
};
