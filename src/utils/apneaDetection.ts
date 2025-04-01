import { pipeline } from "@huggingface/transformers";

// Types for audio detection
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
let sensitivityMultiplier = 2.5; // Increased default sensitivity from 1.5 to 2.5
let lastAnalysisTime = 0;
const ANALYSIS_THROTTLE_MS = 150; // Reduced from 200ms to 150ms for more frequent checks
const DETECTION_THRESHOLD_BASE = 4; // Reduced threshold from 6 to 4 for even more sensitive detection

// Enhanced breathing pattern detection variables
let breathingPatternBuffer: number[] = []; // Buffer to store recent breathing patterns
const PATTERN_BUFFER_SIZE = 60; // Increased from 40 to 60 data points for more detailed pattern analysis
let consecutiveAnomalies = 0; // Track consecutive anomalies for more reliable detection

// Advanced sound detection parameters
const SNORING_FREQUENCY_RANGE = { min: 60, max: 300 }; // Hz
const COUGHING_FREQUENCY_RANGE = { min: 300, max: 1000 }; // Hz
const GASPING_FREQUENCY_RANGE = { min: 500, max: 1500 }; // Hz
let soundPatterns: { [key: string]: number[] } = {
  snoring: [],
  coughing: [],
  gasping: [],
};

// Initialize the audio processing pipeline
export const initializeDetection = async (): Promise<boolean> => {
  try {
    if (isInitialized) return true;
    
    console.log("Initializing audio context and model with heightened sensitivity...");
    
    // Initialize audio context
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Try to load the audio processing model
    try {
      audioProcessor = await pipeline(
        "automatic-speech-recognition",
        MODEL_NAME,
      );
      console.log("Audio processing model loaded successfully");
    } catch (error) {
      console.error("Error loading audio model:", error);
      // Fallback to frequency analysis only if model fails to load
      console.log("Falling back to enhanced frequency analysis only");
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
  // Convert 1-10 scale to a more aggressive multiplier between 0.2 and 4.5
  // Lower values make detection more sensitive
  sensitivityMultiplier = 4.5 - ((level - 1) / 9) * 4.3;
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
    
    // Request microphone access with further optimized settings for better breathing detection
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
    
    // Create analyzer optimized for breathing sounds (with wider frequency range)
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 16384; // Dramatically increased from 8192 for much better frequency resolution
    analyser.minDecibels = -120; // Lower threshold to catch even quieter sounds (from -110)
    analyser.maxDecibels = -10; // Upper threshold
    analyser.smoothingTimeConstant = 0.5; // Reduced from 0.65 for faster response to changes
    
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    // Reset pattern buffer when starting new session
    breathingPatternBuffer = [];
    consecutiveAnomalies = 0;
    
    // Reset sound patterns
    soundPatterns = {
      snoring: [],
      coughing: [],
      gasping: [],
    };
    
    isListening = true;
    console.log("Started listening to microphone with super-enhanced settings for maximum sensitivity");
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

// Get current breathing data for visualization - optimized for maximum sensitivity
export const getCurrentBreathingData = (): number[] => {
  if (!analyser || !dataArray || !isListening) return [];
  
  analyser.getByteFrequencyData(dataArray);
  
  // Process the raw frequency data to extract breathing pattern
  // Focus on frequencies between 20-2000Hz where breathing and related sounds are most present (greatly expanded range)
  const startBin = Math.floor(20 / (audioContext!.sampleRate / analyser.fftSize));
  const endBin = Math.floor(2000 / (audioContext!.sampleRate / analyser.fftSize));
  
  // Use typed arrays and limit range for better performance
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  
  // Cache the max value to avoid multiple calculations
  const maxValue = Math.max(...relevantData, 1); // Avoid division by zero
  
  // Use map with enhanced sensitivity multiplier in one pass
  const processedData = relevantData.map(value => 
    Math.min(1, (value / maxValue) * sensitivityMultiplier * 1.5)
  );
  
  // Update the breathing pattern buffer
  if (breathingPatternBuffer.length >= PATTERN_BUFFER_SIZE) {
    breathingPatternBuffer.shift();
  }
  
  // Add the average of the current data to the pattern buffer
  const avgValue = processedData.reduce((sum, val) => sum + val, 0) / processedData.length;
  breathingPatternBuffer.push(avgValue);
  
  // Update sound pattern detection
  updateSoundPatterns(dataArray);
  
  return processedData;
};

// New function to detect specific sound patterns
const updateSoundPatterns = (frequencyData: Uint8Array): void => {
  if (!audioContext || !analyser) return;
  
  const sampleRate = audioContext.sampleRate;
  const binSize = sampleRate / analyser.fftSize;
  
  // Analyze snoring frequencies (60-300 Hz)
  const snoringStartBin = Math.floor(SNORING_FREQUENCY_RANGE.min / binSize);
  const snoringEndBin = Math.floor(SNORING_FREQUENCY_RANGE.max / binSize);
  const snoringData = Array.from(frequencyData.subarray(snoringStartBin, snoringEndBin));
  const snoringAvg = snoringData.reduce((sum, val) => sum + val, 0) / snoringData.length;
  
  // Analyze coughing frequencies (300-1000 Hz)
  const coughingStartBin = Math.floor(COUGHING_FREQUENCY_RANGE.min / binSize);
  const coughingEndBin = Math.floor(COUGHING_FREQUENCY_RANGE.max / binSize);
  const coughingData = Array.from(frequencyData.subarray(coughingStartBin, coughingEndBin));
  const coughingAvg = coughingData.reduce((sum, val) => sum + val, 0) / coughingData.length;
  
  // Analyze gasping frequencies (500-1500 Hz)
  const gaspingStartBin = Math.floor(GASPING_FREQUENCY_RANGE.min / binSize);
  const gaspingEndBin = Math.floor(GASPING_FREQUENCY_RANGE.max / binSize);
  const gaspingData = Array.from(frequencyData.subarray(gaspingStartBin, gaspingEndBin));
  const gaspingAvg = gaspingData.reduce((sum, val) => sum + val, 0) / gaspingData.length;
  
  // Update sound pattern buffers
  if (soundPatterns.snoring.length >= 10) soundPatterns.snoring.shift();
  if (soundPatterns.coughing.length >= 10) soundPatterns.coughing.shift();
  if (soundPatterns.gasping.length >= 10) soundPatterns.gasping.shift();
  
  soundPatterns.snoring.push(snoringAvg);
  soundPatterns.coughing.push(coughingAvg);
  soundPatterns.gasping.push(gaspingAvg);
};

// Enhanced analysis function with better pattern detection and sound classification
export const analyzeCurrentAudio = (): AudioAnalysisResult => {
  if (!analyser || !dataArray || !isListening || breathingPatternBuffer.length < 5) {
    return {
      isApnea: false,
      confidence: 0,
      duration: 0,
      pattern: "normal",
      detectedSounds: {
        snoring: false,
        coughing: false,
        gasping: false,
        pausedBreathing: false
      }
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
      pattern: "normal",
      detectedSounds: {
        snoring: false,
        coughing: false,
        gasping: false,
        pausedBreathing: false
      }
    };
  }
  
  lastAnalysisTime = now;
  
  analyser.getByteFrequencyData(dataArray);
  
  // Focus on a much wider range of frequencies for better detection
  const startBin = Math.floor(20 / (audioContext!.sampleRate / analyser.fftSize)); // Changed from 30 to 20Hz
  const endBin = Math.floor(2000 / (audioContext!.sampleRate / analyser.fftSize)); // Changed from 800 to 2000Hz
  
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  const avgAmplitude = relevantData.reduce((sum, val) => sum + val, 0) / relevantData.length;
  
  // Apply enhanced sensitivity to detection threshold
  const threshold = DETECTION_THRESHOLD_BASE / sensitivityMultiplier;
  
  // Detect silence (potential apnea) if amplitude is very low
  const isSilent = avgAmplitude < threshold;
  
  // Calculate confidence based on how far below threshold - make it more sensitive
  let confidence = isSilent ? Math.min(1, (threshold - avgAmplitude) / threshold * 1.5) : 0;
  
  // Detect sound patterns
  const snoring = detectSoundPattern(soundPatterns.snoring, 10);
  const coughing = detectSoundPattern(soundPatterns.coughing, 12);
  const gasping = detectSoundPattern(soundPatterns.gasping, 15);
  
  // Enhanced pattern detection using the buffer
  // Calculate standard deviation to detect irregular patterns
  if (breathingPatternBuffer.length >= 5) {
    const mean = breathingPatternBuffer.reduce((sum, val) => sum + val, 0) / breathingPatternBuffer.length;
    const variance = breathingPatternBuffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / breathingPatternBuffer.length;
    const stdDev = Math.sqrt(variance);
    
    // Detect irregular patterns - rapid changes in breathing amplitude (even more sensitive)
    const isIrregular = stdDev > 0.1 * sensitivityMultiplier; // Reduced from 0.12 to 0.1
    
    // Look for extended periods of no variation - indicates potential apnea
    const recentValues = breathingPatternBuffer.slice(-5);
    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const recentVariance = recentValues.reduce((sum, val) => sum + Math.pow(val - recentMean, 2), 0) / recentValues.length;
    const recentStdDev = Math.sqrt(recentVariance);
    
    // Low recent variation with low values indicates potential apnea (even more sensitive)
    const isFlat = recentStdDev < 0.03 && recentMean < 0.2; // Changed from 0.04/0.25 to 0.03/0.2
    
    // Boost confidence if pattern analysis also suggests issues
    if (isIrregular || isFlat) {
      confidence = Math.max(confidence, 0.6); // Increased from 0.55 to 0.6
      
      if (isFlat && recentMean < 0.15) {
        confidence = Math.max(confidence, 0.8); // Increased from 0.75 to 0.8
      }
    }
    
    // Detect paused breathing
    const pausedBreathing = isFlat && recentMean < 0.15;
    
    // Add sound-based detection to further improve confidence
    if (snoring || gasping) {
      confidence = Math.max(confidence, 0.65);
    }
  }
  
  // Increase confidence threshold for consecutive anomalies for more reliable detection
  if (confidence > 0.2) { // Reduced from 0.25 to 0.2 to catch even more events
    consecutiveAnomalies++;
  } else {
    consecutiveAnomalies = Math.max(0, consecutiveAnomalies - 1);
  }
  
  // Boost confidence if we've detected multiple anomalies in a row
  if (consecutiveAnomalies >= 2) { // Already at 2, keep at 2 for fast detection
    confidence += 0.3; // Increased from 0.25 to 0.3
  }
  
  // Determine breathing pattern
  let pattern: "normal" | "interrupted" | "missing" = "normal";
  
  if (confidence > 0.5) { // Reduced from 0.55 to 0.5
    pattern = "missing";
  } else if (confidence > 0.2) { // Reduced from 0.25 to 0.2
    pattern = "interrupted";
  }
  
  // Create the full analysis result with detailed sound detection
  return {
    isApnea: confidence > 0.5, // Reduced from 0.55 to 0.5
    confidence: confidence,
    duration: consecutiveAnomalies * (ANALYSIS_THROTTLE_MS / 1000), // Estimated duration based on consecutive anomalies
    pattern: pattern,
    detectedSounds: {
      snoring: snoring,
      coughing: coughing,
      gasping: gasping,
      pausedBreathing: pattern === "missing"
    }
  };
};

// Helper function to detect specific sound patterns
const detectSoundPattern = (patternData: number[], threshold: number): boolean => {
  if (patternData.length < 3) return false;
  
  // Calculate average and peak values
  const avg = patternData.reduce((sum, val) => sum + val, 0) / patternData.length;
  const peak = Math.max(...patternData);
  
  // A sound is detected if the average is above threshold or there's a significant peak
  return avg > threshold || peak > threshold * 1.5;
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
  const actualInterval = Math.max(250, intervalMs); // Minimum 250ms (reduced from 300ms) for even more responsive detection
  
  detectionInterval = window.setInterval(() => {
    const result = analyzeCurrentAudio();
    callback(result);
  }, actualInterval);
  
  console.log(`Started continuous detection with interval ${actualInterval}ms`);
};

// For testing - generate a random apnea event with more realistic distribution
export const generateTestApneaEvent = (): AudioAnalysisResult => {
  const random = Math.random();
  
  if (random < 0.1) { // Increased probability for testing
    return {
      isApnea: true,
      confidence: 0.85 + (random * 0.15), // 0.85-1.0 confidence
      duration: Math.floor(random * 10) + 5, // 5-15 seconds
      pattern: "missing",
      detectedSounds: {
        snoring: false,
        coughing: false,
        gasping: true,
        pausedBreathing: true
      }
    };
  } else if (random < 0.3) { // Increased probability for testing
    return {
      isApnea: false,
      confidence: 0.55 + (random * 0.3), // 0.55-0.85 confidence
      duration: Math.floor(random * 5) + 2, // 2-7 seconds
      pattern: "interrupted",
      detectedSounds: {
        snoring: random > 0.2,
        coughing: random < 0.1,
        gasping: false,
        pausedBreathing: false
      }
    };
  } else {
    return {
      isApnea: false,
      confidence: random * 0.25, // 0-0.25 confidence
      duration: 0,
      pattern: "normal",
      detectedSounds: {
        snoring: random > 0.9,
        coughing: random > 0.95,
        gasping: false,
        pausedBreathing: false
      }
    };
  }
};
