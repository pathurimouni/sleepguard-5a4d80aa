
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
const ANALYSIS_THROTTLE_MS = 300; // Reduced from 500ms to 300ms for more frequent checks
const DETECTION_THRESHOLD_BASE = 8; // Base threshold value for detection

// Enhanced breathing pattern detection variables
let breathingPatternBuffer: number[] = []; // Buffer to store recent breathing patterns
const PATTERN_BUFFER_SIZE = 30; // Store last 30 data points for pattern analysis
let consecutiveAnomalies = 0; // Track consecutive anomalies for more reliable detection

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

// Set sensitivity level (1-10) with enhanced effectiveness
export const setSensitivity = (level: number): void => {
  // Convert 1-10 scale to a more aggressive multiplier between 0.3 and 3.0
  // Lower values make detection more sensitive
  sensitivityMultiplier = 3.0 - ((level - 1) / 9) * 2.7;
  console.log(`Detection sensitivity set to ${level} (multiplier: ${sensitivityMultiplier})`);
};

// Start listening to the microphone with enhanced settings
export const startListening = async (): Promise<boolean> => {
  if (!isInitialized) {
    const initialized = await initializeDetection();
    if (!initialized) return false;
  }
  
  if (isListening) return true;
  
  try {
    if (!audioContext) return false;
    
    // Request microphone access with optimized settings for better breathing detection
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false, // Disable for more authentic sound capture
        noiseSuppression: false, // Disable to catch subtle sounds
        autoGainControl: false   // Disable to maintain consistent levels
      } 
    });
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create analyzer optimized for breathing sounds (lower frequencies)
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096; // Increased from 2048 for better frequency resolution
    analyser.minDecibels = -100; // Lower threshold to catch quieter sounds
    analyser.maxDecibels = -10; // Upper threshold
    analyser.smoothingTimeConstant = 0.75; // Reduced from 0.85 for faster response to changes
    
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    // Reset pattern buffer when starting new session
    breathingPatternBuffer = [];
    consecutiveAnomalies = 0;
    
    isListening = true;
    console.log("Started listening to microphone with enhanced settings for better sensitivity");
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

// Get current breathing data for visualization - optimized for sensitivity
export const getCurrentBreathingData = (): number[] => {
  if (!analyser || !dataArray || !isListening) return [];
  
  analyser.getByteFrequencyData(dataArray);
  
  // Process the raw frequency data to extract breathing pattern
  // Focus on frequencies between 40-600Hz where breathing sounds are most present
  const startBin = Math.floor(40 / (audioContext!.sampleRate / analyser.fftSize));
  const endBin = Math.floor(600 / (audioContext!.sampleRate / analyser.fftSize));
  
  // Use typed arrays and limit range for better performance
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  
  // Cache the max value to avoid multiple calculations
  const maxValue = Math.max(...relevantData, 1); // Avoid division by zero
  
  // Use map with enhanced sensitivity multiplier in one pass
  const processedData = relevantData.map(value => 
    Math.min(1, (value / maxValue) * sensitivityMultiplier)
  );
  
  // Update the breathing pattern buffer
  if (breathingPatternBuffer.length >= PATTERN_BUFFER_SIZE) {
    breathingPatternBuffer.shift();
  }
  
  // Add the average of the current data to the pattern buffer
  const avgValue = processedData.reduce((sum, val) => sum + val, 0) / processedData.length;
  breathingPatternBuffer.push(avgValue);
  
  return processedData;
};

// Enhanced analysis function with better pattern detection
export const analyzeCurrentAudio = (): AudioAnalysisResult => {
  if (!analyser || !dataArray || !isListening || breathingPatternBuffer.length < 5) {
    return {
      isApnea: false,
      confidence: 0,
      duration: 0,
      pattern: "normal"
    };
  }
  
  // Throttle analysis to reduce CPU usage but more frequent than before
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
  
  // Focus on a wider range of frequencies for better detection
  const startBin = Math.floor(40 / (audioContext!.sampleRate / analyser.fftSize));
  const endBin = Math.floor(600 / (audioContext!.sampleRate / analyser.fftSize));
  
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  const avgAmplitude = relevantData.reduce((sum, val) => sum + val, 0) / relevantData.length;
  
  // Apply enhanced sensitivity to detection threshold
  const threshold = DETECTION_THRESHOLD_BASE / sensitivityMultiplier;
  
  // Detect silence (potential apnea) if amplitude is very low
  const isSilent = avgAmplitude < threshold;
  
  // Calculate confidence based on how far below threshold
  let confidence = isSilent ? Math.min(1, (threshold - avgAmplitude) / threshold) : 0;
  
  // Enhanced pattern detection using the buffer
  // Calculate standard deviation to detect irregular patterns
  if (breathingPatternBuffer.length >= 5) {
    const mean = breathingPatternBuffer.reduce((sum, val) => sum + val, 0) / breathingPatternBuffer.length;
    const variance = breathingPatternBuffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / breathingPatternBuffer.length;
    const stdDev = Math.sqrt(variance);
    
    // Detect irregular patterns - rapid changes in breathing amplitude
    const isIrregular = stdDev > 0.15 * sensitivityMultiplier;
    
    // Look for extended periods of no variation - indicates potential apnea
    const recentValues = breathingPatternBuffer.slice(-5);
    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const recentVariance = recentValues.reduce((sum, val) => sum + Math.pow(val - recentMean, 2), 0) / recentValues.length;
    const recentStdDev = Math.sqrt(recentVariance);
    
    // Low recent variation with low values indicates potential apnea
    const isFlat = recentStdDev < 0.05 && recentMean < 0.3;
    
    // Boost confidence if pattern analysis also suggests issues
    if (isIrregular || isFlat) {
      confidence = Math.max(confidence, 0.5);
      
      if (isFlat && recentMean < 0.2) {
        confidence = Math.max(confidence, 0.7);
      }
    }
  }
  
  // Increase confidence threshold for consecutive anomalies for more reliable detection
  if (confidence > 0.3) {
    consecutiveAnomalies++;
  } else {
    consecutiveAnomalies = Math.max(0, consecutiveAnomalies - 1);
  }
  
  // Boost confidence if we've detected multiple anomalies in a row
  if (consecutiveAnomalies >= 3) {
    confidence += 0.2;
  }
  
  // Determine breathing pattern
  let pattern: "normal" | "interrupted" | "missing" = "normal";
  
  if (confidence > 0.6) {
    pattern = "missing";
  } else if (confidence > 0.3) {
    pattern = "interrupted";
  }
  
  return {
    isApnea: confidence > 0.6,
    confidence: confidence,
    duration: consecutiveAnomalies * (ANALYSIS_THROTTLE_MS / 1000), // Estimated duration based on consecutive anomalies
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
  
  // Use optimized interval for better balance between performance and responsiveness
  const actualInterval = Math.max(300, intervalMs); // Minimum 300ms (reduced from 500ms) for more responsive detection
  
  detectionInterval = window.setInterval(() => {
    const result = analyzeCurrentAudio();
    callback(result);
  }, actualInterval);
  
  console.log(`Started continuous detection with interval ${actualInterval}ms`);
};

// For testing - generate a random apnea event with more realistic distribution
export const generateTestApneaEvent = (): AudioAnalysisResult => {
  const random = Math.random();
  
  if (random < 0.08) { // Increased probability for testing
    return {
      isApnea: true,
      confidence: 0.8 + (random * 0.2), // 0.8-1.0 confidence
      duration: Math.floor(random * 10) + 5, // 5-15 seconds
      pattern: "missing"
    };
  } else if (random < 0.25) { // Increased probability for testing
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
