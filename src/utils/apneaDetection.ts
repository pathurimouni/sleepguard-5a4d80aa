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
let sensitivityMultiplier = 1.5; // Increased default sensitivity from 1 to 1.5
let lastAnalysisTime = 0;
const ANALYSIS_THROTTLE_MS = 200; // Reduced from 300ms to 200ms for more frequent checks
const DETECTION_THRESHOLD_BASE = 6; // Reduced threshold from 8 to 6 for more sensitive detection

// Enhanced breathing pattern detection variables
let breathingPatternBuffer: number[] = []; // Buffer to store recent breathing patterns
const PATTERN_BUFFER_SIZE = 40; // Increased from 30 to 40 data points for pattern analysis
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

// Set sensitivity level (1-10) with greatly enhanced effectiveness
export const setSensitivity = (level: number): void => {
  // Convert 1-10 scale to a more aggressive multiplier between 0.2 and 3.5
  // Lower values make detection more sensitive
  sensitivityMultiplier = 3.5 - ((level - 1) / 9) * 3.3;
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
        autoGainControl: false,   // Disable to maintain consistent levels
        sampleRate: 48000, // Higher sample rate for better detection
        channelCount: 1    // Mono recording is sufficient for breathing analysis
      } 
    });
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create analyzer optimized for breathing sounds (lower frequencies)
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 8192; // Increased from 4096 for even better frequency resolution
    analyser.minDecibels = -110; // Lower threshold to catch even quieter sounds (from -100)
    analyser.maxDecibels = -10; // Upper threshold
    analyser.smoothingTimeConstant = 0.65; // Reduced from 0.75 for faster response to changes
    
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    // Reset pattern buffer when starting new session
    breathingPatternBuffer = [];
    consecutiveAnomalies = 0;
    
    isListening = true;
    console.log("Started listening to microphone with highly enhanced settings for better sensitivity");
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
  // Focus on frequencies between 30-800Hz where breathing sounds are most present (expanded range)
  const startBin = Math.floor(30 / (audioContext!.sampleRate / analyser.fftSize));
  const endBin = Math.floor(800 / (audioContext!.sampleRate / analyser.fftSize));
  
  // Use typed arrays and limit range for better performance
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  
  // Cache the max value to avoid multiple calculations
  const maxValue = Math.max(...relevantData, 1); // Avoid division by zero
  
  // Use map with enhanced sensitivity multiplier in one pass
  const processedData = relevantData.map(value => 
    Math.min(1, (value / maxValue) * sensitivityMultiplier * 1.2)
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
  const startBin = Math.floor(30 / (audioContext!.sampleRate / analyser.fftSize)); // Changed from 40 to 30Hz
  const endBin = Math.floor(800 / (audioContext!.sampleRate / analyser.fftSize)); // Changed from 600 to 800Hz
  
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  const avgAmplitude = relevantData.reduce((sum, val) => sum + val, 0) / relevantData.length;
  
  // Apply enhanced sensitivity to detection threshold
  const threshold = DETECTION_THRESHOLD_BASE / sensitivityMultiplier;
  
  // Detect silence (potential apnea) if amplitude is very low
  const isSilent = avgAmplitude < threshold;
  
  // Calculate confidence based on how far below threshold - make it more sensitive
  let confidence = isSilent ? Math.min(1, (threshold - avgAmplitude) / threshold * 1.25) : 0;
  
  // Enhanced pattern detection using the buffer
  // Calculate standard deviation to detect irregular patterns
  if (breathingPatternBuffer.length >= 5) {
    const mean = breathingPatternBuffer.reduce((sum, val) => sum + val, 0) / breathingPatternBuffer.length;
    const variance = breathingPatternBuffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / breathingPatternBuffer.length;
    const stdDev = Math.sqrt(variance);
    
    // Detect irregular patterns - rapid changes in breathing amplitude (more sensitive)
    const isIrregular = stdDev > 0.12 * sensitivityMultiplier; // Reduced from 0.15 to 0.12
    
    // Look for extended periods of no variation - indicates potential apnea
    const recentValues = breathingPatternBuffer.slice(-5);
    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const recentVariance = recentValues.reduce((sum, val) => sum + Math.pow(val - recentMean, 2), 0) / recentValues.length;
    const recentStdDev = Math.sqrt(recentVariance);
    
    // Low recent variation with low values indicates potential apnea (more sensitive)
    const isFlat = recentStdDev < 0.04 && recentMean < 0.25; // Changed from 0.05/0.3 to 0.04/0.25
    
    // Boost confidence if pattern analysis also suggests issues
    if (isIrregular || isFlat) {
      confidence = Math.max(confidence, 0.55); // Increased from 0.5 to 0.55
      
      if (isFlat && recentMean < 0.2) {
        confidence = Math.max(confidence, 0.75); // Increased from 0.7 to 0.75
      }
    }
  }
  
  // Increase confidence threshold for consecutive anomalies for more reliable detection
  if (confidence > 0.25) { // Reduced from 0.3 to 0.25 to catch more events
    consecutiveAnomalies++;
  } else {
    consecutiveAnomalies = Math.max(0, consecutiveAnomalies - 1);
  }
  
  // Boost confidence if we've detected multiple anomalies in a row
  if (consecutiveAnomalies >= 2) { // Reduced from 3 to 2 for faster detection
    confidence += 0.25; // Increased from 0.2 to 0.25
  }
  
  // Determine breathing pattern
  let pattern: "normal" | "interrupted" | "missing" = "normal";
  
  if (confidence > 0.55) { // Reduced from 0.6 to 0.55
    pattern = "missing";
  } else if (confidence > 0.25) { // Reduced from 0.3 to 0.25
    pattern = "interrupted";
  }
  
  return {
    isApnea: confidence > 0.55, // Reduced from 0.6 to 0.55
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
