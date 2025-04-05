
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

// Collection of recent detection events
export let detectionEvents: AudioAnalysisResult[] = [];

// Get recent detection events
export const getRecentDetectionEvents = (): AudioAnalysisResult[] => {
  return [...detectionEvents];
};

// Add detection event
export const addDetectionEvent = (event: AudioAnalysisResult) => {
  if (detectionEvents.length >= 10) detectionEvents.shift();
  detectionEvents.push(event);
};
