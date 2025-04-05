
import { AudioAnalysisResult } from "./types";

// Audio context and analysis variables
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let rawTimeData: Float32Array | null = null;
let audioProcessor: any = null;
let detectionInterval: number | null = null;
let isInitialized = false;
let isListening = false;
let sensitivityMultiplier = 4.5;
let lastAnalysisTime = 0;

// Constants for detection settings
export const ANALYSIS_THROTTLE_MS = 60;
export const DETECTION_THRESHOLD_BASE = 2.0;
export const AMBIENT_NOISE_THRESHOLD = 0.08;

// Constants for frequency ranges
export const BREATHING_FREQUENCY_RANGE = { min: 20, max: 600 };
export const SNORING_FREQUENCY_RANGE = { min: 30, max: 500 };
export const GASPING_FREQUENCY_RANGE = { min: 200, max: 2500 };

// Initialize audio detection system
export const initializeDetection = async (): Promise<boolean> => {
  try {
    if (isInitialized) return true;
    
    console.log("Initializing audio context and model with ultra-high sensitivity...");
    
    // Fix for complex union type
    const AudioContextClass = window.AudioContext || 
      ((window as any).webkitAudioContext as typeof AudioContext);
    
    audioContext = new AudioContextClass({
      latencyHint: 'interactive',
      sampleRate: 48000
    });
    
    try {
      audioProcessor = await import("@huggingface/transformers").then(module => {
        return module.pipeline(
          "automatic-speech-recognition",
          "onnx-community/whisper-tiny.en",
        );
      });
      console.log("Audio processing model loaded successfully");
    } catch (error) {
      console.error("Error loading audio model:", error);
      console.log("Falling back to enhanced frequency analysis with reference patterns");
    }
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Failed to initialize audio detection:", error);
    return false;
  }
};

// Set sensitivity level
export const setSensitivity = (level: number): void => {
  sensitivityMultiplier = 7.0 - ((level - 1) / 9) * 6.8;
  console.log(`Detection sensitivity set to ${level} (multiplier: ${sensitivityMultiplier})`);
};

// Start audio analysis
export const startListening = async (): Promise<boolean> => {
  if (!isInitialized) {
    const initialized = await initializeDetection();
    if (!initialized) return false;
  }
  
  if (isListening) return true;
  
  try {
    if (!audioContext) return false;
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
        channelCount: 1
      } 
    });
    
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 32768;
    analyser.minDecibels = -150;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.2;
    
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    rawTimeData = new Float32Array(analyser.fftSize);
    
    isListening = true;
    console.log("Started listening to microphone with enhanced settings for maximum apnea detection sensitivity");
    return true;
  } catch (error) {
    console.error("Error accessing microphone:", error);
    return false;
  }
};

// Stop audio analysis
export const stopListening = (): void => {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    if (isListening) {
      if (analyser) {
        analyser.disconnect();
      }
    }
  }
  
  isListening = false;
  console.log("Stopped listening to microphone");
};

// Export internal state accessors
export const getAudioComponents = () => ({
  audioContext,
  analyser,
  dataArray,
  rawTimeData,
  isListening,
  sensitivityMultiplier
});

// Start continuous detection
export const startContinuousDetection = (
  callback: (result: AudioAnalysisResult) => void,
  intervalMs: number = 1000
): void => {
  if (detectionInterval) {
    clearInterval(detectionInterval);
  }
  
  const actualInterval = Math.max(200, intervalMs);
  
  detectionInterval = window.setInterval(() => {
    const result = analyzeCurrentAudio();
    callback(result);
  }, actualInterval);
  
  console.log(`Started continuous detection with interval ${actualInterval}ms`);
};

// Import the analyze function from analyzer module
// This needs to be imported at the bottom to avoid circular dependencies
import { analyzeCurrentAudio } from "./analyzer";
