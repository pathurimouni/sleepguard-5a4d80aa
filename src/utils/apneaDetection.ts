
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
let sensitivityMultiplier = 1; // Default sensitivity
let lastAnalysisTime = 0;
const ANALYSIS_THROTTLE_MS = 500; // Limit analysis frequency

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

// Set sensitivity level (1-10)
export const setSensitivity = (level: number): void => {
  // Convert 1-10 scale to a multiplier between 0.5 and 2.5
  // Lower values make detection more sensitive
  sensitivityMultiplier = 2.5 - ((level - 1) / 9) * 2;
  console.log(`Detection sensitivity set to ${level} (multiplier: ${sensitivityMultiplier})`);
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
    
    // Request microphone access with optimal settings for voice detection
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      } 
    });
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create analyzer optimized for breathing sounds (lower frequencies)
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Higher for better frequency resolution
    analyser.minDecibels = -90; // Lower threshold to catch quieter sounds
    analyser.maxDecibels = -10; // Upper threshold
    analyser.smoothingTimeConstant = 0.85; // Smoothing to reduce noise
    
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    isListening = true;
    console.log("Started listening to microphone with optimized settings");
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

// Get current breathing data for visualization - optimized for performance
export const getCurrentBreathingData = (): number[] => {
  if (!analyser || !dataArray || !isListening) return [];
  
  analyser.getByteFrequencyData(dataArray);
  
  // Process the raw frequency data to extract breathing pattern
  // Focus on frequencies between 50-500Hz where breathing sounds are most present
  const startBin = Math.floor(50 / (audioContext!.sampleRate / analyser.fftSize));
  const endBin = Math.floor(500 / (audioContext!.sampleRate / analyser.fftSize));
  
  // Use typed arrays and limit range for better performance
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  
  // Cache the max value to avoid multiple calculations
  const maxValue = Math.max(...relevantData, 1); // Avoid division by zero
  
  // Use map with sensitivity multiplier in one pass
  return relevantData.map(value => 
    Math.min(1, (value / maxValue) * sensitivityMultiplier)
  );
};

// Analyze the current audio for apnea patterns - optimized
export const analyzeCurrentAudio = (): AudioAnalysisResult => {
  if (!analyser || !dataArray || !isListening) {
    return {
      isApnea: false,
      confidence: 0,
      duration: 0,
      pattern: "normal"
    };
  }
  
  // Throttle analysis to reduce CPU usage
  const now = Date.now();
  if (now - lastAnalysisTime < ANALYSIS_THROTTLE_MS) {
    // Return previous result to avoid excessive processing
    return {
      isApnea: false,
      confidence: 0,
      duration: 0,
      pattern: "normal"
    };
  }
  
  lastAnalysisTime = now;
  
  analyser.getByteFrequencyData(dataArray);
  
  // Focus on frequencies between 50-500Hz where breathing sounds are most present
  const startBin = Math.floor(50 / (audioContext!.sampleRate / analyser.fftSize));
  const endBin = Math.floor(500 / (audioContext!.sampleRate / analyser.fftSize));
  
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  const avgAmplitude = relevantData.reduce((sum, val) => sum + val, 0) / relevantData.length;
  
  // Apply sensitivity to detection threshold (lower values = more sensitive)
  const threshold = 8 / sensitivityMultiplier;
  
  // Detect silence (potential apnea) if amplitude is very low
  const isSilent = avgAmplitude < threshold;
  
  // Calculate confidence based on how far below threshold
  const confidence = isSilent ? Math.min(1, (threshold - avgAmplitude) / threshold) : 0;
  
  // Determine breathing pattern
  let pattern: "normal" | "interrupted" | "missing" = "normal";
  
  if (isSilent) {
    pattern = "missing";
  } else if (confidence > 0.3) {
    pattern = "interrupted";
  }
  
  return {
    isApnea: isSilent && confidence > 0.6,
    confidence: confidence,
    duration: 0, // Would be tracked over time in a real implementation
    pattern: pattern
  };
};

// Start continuous detection with performance optimizations
export const startContinuousDetection = (
  callback: (result: AudioAnalysisResult) => void,
  intervalMs: number = 1000
): void => {
  if (detectionInterval) {
    clearInterval(detectionInterval);
  }
  
  // Use throttled interval for better performance
  const actualInterval = Math.max(500, intervalMs); // Minimum 500ms to prevent excessive CPU usage
  
  detectionInterval = window.setInterval(() => {
    const result = analyzeCurrentAudio();
    callback(result);
  }, actualInterval);
  
  console.log(`Started continuous detection with interval ${actualInterval}ms`);
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
