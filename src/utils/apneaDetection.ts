
import { pipeline } from "@huggingface/transformers";

// Types for audio detection
export interface AudioAnalysisResult {
  isApnea: boolean;
  confidence: number;
  duration: number;
  pattern: "normal" | "interrupted" | "missing";
}

// Model and detection settings
const MODEL_NAME = "onnx-community/whisper-tiny.en"; // Using whisper as a base for audio processing
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let audioProcessor: any = null;
let detectionInterval: number | null = null;
let isInitialized = false;
let isListening = false;

// Initialize the audio processing pipeline
export const initializeDetection = async (): Promise<boolean> => {
  try {
    if (isInitialized) return true;
    
    console.log("Initializing audio context and model...");
    
    // Initialize audio context
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Try to load the audio processing model
    try {
      audioProcessor = await pipeline(
        "automatic-speech-recognition",
        MODEL_NAME,
      );
      console.log("Audio processing model loaded");
    } catch (error) {
      console.error("Error loading audio model:", error);
      // Fallback to frequency analysis only if model fails to load
      console.log("Falling back to frequency analysis only");
    }
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Failed to initialize audio detection:", error);
    return false;
  }
};

// Start listening to the microphone
export const startListening = async (): Promise<boolean> => {
  if (!isInitialized) {
    const initialized = await initializeDetection();
    if (!initialized) return false;
  }
  
  if (isListening) return true;
  
  try {
    if (!audioContext) return false;
    
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create analyzer for frequency data
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    isListening = true;
    console.log("Started listening to microphone");
    return true;
  } catch (error) {
    console.error("Error accessing microphone:", error);
    return false;
  }
};

// Stop listening
export const stopListening = (): void => {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    // Only close if actively listening
    if (isListening) {
      // Don't actually close the context, just disconnect
      if (analyser) {
        analyser.disconnect();
      }
    }
  }
  
  isListening = false;
  console.log("Stopped listening to microphone");
};

// Get current breathing data for visualization
export const getCurrentBreathingData = (): number[] => {
  if (!analyser || !dataArray || !isListening) return [];
  
  analyser.getByteFrequencyData(dataArray);
  
  // Process the raw frequency data to extract breathing pattern
  // Focus on lower frequencies (0-500Hz) where breathing sounds are most present
  const relevantData = Array.from(dataArray.slice(0, 20));
  
  // Normalize the values between 0 and 1
  const maxValue = Math.max(...relevantData, 1); // Avoid division by zero
  const normalizedData = relevantData.map(value => value / maxValue);
  
  return normalizedData;
};

// Analyze the current audio for apnea patterns
export const analyzeCurrentAudio = (): AudioAnalysisResult => {
  if (!analyser || !dataArray || !isListening) {
    return {
      isApnea: false,
      confidence: 0,
      duration: 0,
      pattern: "normal"
    };
  }
  
  analyser.getByteFrequencyData(dataArray);
  
  // Simple detection based on amplitude in lower frequencies
  // Real implementation would use the audio model for more advanced detection
  
  // Get average amplitude in the relevant frequency range
  const relevantData = Array.from(dataArray.slice(0, 20));
  const avgAmplitude = relevantData.reduce((sum, val) => sum + val, 0) / relevantData.length;
  
  // Detect silence (potential apnea) if amplitude is very low
  const isSilent = avgAmplitude < 10; // Threshold can be adjusted based on testing
  
  // Check for breathing pattern irregularity
  const pattern = isSilent ? "missing" : "normal";
  
  // Calculate confidence based on how far below threshold
  const confidence = isSilent ? Math.min(1, (10 - avgAmplitude) / 10) : 0;
  
  return {
    isApnea: isSilent && confidence > 0.7, // Only flag as apnea if high confidence
    confidence: confidence,
    duration: 0, // Would be tracked over time in a real implementation
    pattern: pattern as "normal" | "interrupted" | "missing"
  };
};

// Start continuous detection
export const startContinuousDetection = (
  callback: (result: AudioAnalysisResult) => void,
  intervalMs: number = 1000
): void => {
  if (detectionInterval) {
    clearInterval(detectionInterval);
  }
  
  detectionInterval = window.setInterval(() => {
    const result = analyzeCurrentAudio();
    callback(result);
  }, intervalMs);
  
  console.log(`Started continuous detection with interval ${intervalMs}ms`);
};

// For testing - generate a random apnea event
export const generateTestApneaEvent = (): AudioAnalysisResult => {
  const random = Math.random();
  
  if (random < 0.05) {
    return {
      isApnea: true,
      confidence: 0.8 + (random * 0.2), // 0.8-1.0 confidence
      duration: Math.floor(random * 10) + 5, // 5-15 seconds
      pattern: "missing"
    };
  } else if (random < 0.2) {
    return {
      isApnea: false,
      confidence: 0.5 + (random * 0.3), // 0.5-0.8 confidence
      duration: Math.floor(random * 5) + 2, // 2-7 seconds
      pattern: "interrupted"
    };
  } else {
    return {
      isApnea: false,
      confidence: random * 0.3, // 0-0.3 confidence
      duration: 0,
      pattern: "normal"
    };
  }
};
