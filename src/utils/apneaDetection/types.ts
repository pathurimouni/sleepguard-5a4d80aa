
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

// Processed audio type for CNN model
export interface ProcessedAudio {
  spectrogramData: number[][];
  duration: number;
  sampleRate: number;
  frameSize?: number;
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

// Model prediction results
export interface ModelPrediction {
  isApnea: boolean;
  confidence: number;
  features?: {
    spectralEntropy?: number;
    energyVariance?: number;
    respiratoryRate?: number;
  }
}

// Model metadata
export interface ModelMetadata {
  name: string;
  version: string;
  accuracy: number;
  framework: string;
  inputShape: number[];
  outputClasses: string[];
}

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

// Helper function to prepare audio data for CNN model
export const prepareForCNN = (audioData: Float32Array, sampleRate: number): ProcessedAudio => {
  // Simple implementation - in a real app this would do more sophisticated processing
  const spectrogramData: number[][] = [];
  const frameSize = 1024;
  const hopSize = 512;
  
  // Create a basic spectrogram (simplified for illustration)
  for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
    const frame = audioData.slice(i, i + frameSize);
    const frameMagnitude = Array.from(frame).map(val => Math.abs(val));
    spectrogramData.push(frameMagnitude);
  }
  
  return {
    spectrogramData,
    duration: audioData.length / sampleRate,
    sampleRate,
    frameSize
  };
};
