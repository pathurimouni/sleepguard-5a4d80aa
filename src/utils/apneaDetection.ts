import { pipeline } from "@huggingface/transformers";
import { 
  detectApneaWithReferencePatterns, 
  centralApneaPatterns, 
  obstructiveApneaPatterns,
  hypopneaPatterns,
  normalBreathingPatterns
} from "./apneaReferenceData";

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

// Model and detection settings
const MODEL_NAME = "onnx-community/whisper-tiny.en"; // Using whisper as a base for audio processing
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let rawTimeData: Float32Array | null = null;
let audioProcessor: any = null;
let detectionInterval: number | null = null;
let isInitialized = false;
let isListening = false;
let sensitivityMultiplier = 3.5; // Further increased sensitivity
let lastAnalysisTime = 0;
const ANALYSIS_THROTTLE_MS = 80; // Reduced further for more frequent checks
const DETECTION_THRESHOLD_BASE = 2.5; // Reduced threshold for even more sensitive detection

// Enhanced breathing pattern detection variables
let breathingPatternBuffer: number[] = []; // Buffer to store recent breathing patterns
const PATTERN_BUFFER_SIZE = 100; // Increased for more detailed pattern analysis
let consecutiveAnomalies = 0; // Track consecutive anomalies for more reliable detection
let detectionEvents: AudioAnalysisResult[] = []; // Track recent detection events
let historicalBreathingData: number[][] = []; // Store sequences of breathing data for pattern matching

// Advanced sound detection parameters
const SNORING_FREQUENCY_RANGE = { min: 40, max: 400 }; // Hz - expanded range
const COUGHING_FREQUENCY_RANGE = { min: 200, max: 1500 }; // Hz - expanded range
const GASPING_FREQUENCY_RANGE = { min: 300, max: 2000 }; // Hz - expanded range
let soundPatterns: { [key: string]: number[] } = {
  snoring: [],
  coughing: [],
  gasping: [],
};

// Frequency ranges for different sounds
const BREATHING_FREQUENCY_RANGE = { min: 30, max: 500 }; // Hz - expanded typical breathing frequency range
const AMBIENT_NOISE_THRESHOLD = 0.12; // Reduced threshold for better detection of subtle sounds

// Initialize the audio processing pipeline with enhanced configuration
export const initializeDetection = async (): Promise<boolean> => {
  try {
    if (isInitialized) return true;
    
    console.log("Initializing audio context and model with ultra-high sensitivity...");
    
    // Initialize audio context with optimal settings
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 48000 // Higher sample rate for better fidelity
    });
    
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
      console.log("Falling back to enhanced frequency analysis with reference patterns");
    }
    
    // Initialize historical data structures
    breathingPatternBuffer = [];
    historicalBreathingData = [];
    detectionEvents = [];
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Failed to initialize audio detection:", error);
    return false;
  }
};

// Set sensitivity level (1-10) with greatly enhanced effectiveness
export const setSensitivity = (level: number): void => {
  // Convert 1-10 scale to a more aggressive multiplier between 0.2 and 6.0
  // Lower values make detection more sensitive
  sensitivityMultiplier = 6.0 - ((level - 1) / 9) * 5.8;
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
    analyser.fftSize = 32768; // Dramatically increased for much better frequency resolution
    analyser.minDecibels = -140; // Even lower threshold to catch extremely quiet sounds
    analyser.maxDecibels = -10; // Upper threshold
    analyser.smoothingTimeConstant = 0.3; // Reduced for faster response to changes
    
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    rawTimeData = new Float32Array(analyser.fftSize);
    
    // Reset pattern buffer when starting new session
    breathingPatternBuffer = [];
    consecutiveAnomalies = 0;
    detectionEvents = [];
    historicalBreathingData = [];
    
    // Reset sound patterns
    soundPatterns = {
      snoring: [],
      coughing: [],
      gasping: [],
    };
    
    isListening = true;
    console.log("Started listening to microphone with ultra-enhanced settings for maximum sensitivity");
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

// Get current breathing data for visualization with enhanced noise detection
export const getCurrentBreathingData = (): number[] => {
  if (!analyser || !dataArray || !isListening) return [];
  
  analyser.getByteFrequencyData(dataArray);
  
  if (rawTimeData) {
    analyser.getFloatTimeDomainData(rawTimeData);
  }
  
  // Process the raw frequency data to extract breathing pattern
  // Focus on frequencies between BREATHING_FREQUENCY_RANGE where breathing sounds are most present
  const startBin = Math.floor(BREATHING_FREQUENCY_RANGE.min / (audioContext!.sampleRate / analyser.fftSize));
  const endBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext!.sampleRate / analyser.fftSize));
  
  // Check for non-breathing noise in other frequency ranges
  const nonBreathingStartBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext!.sampleRate / analyser.fftSize));
  const nonBreathingEndBin = Math.floor(3500 / (audioContext!.sampleRate / analyser.fftSize));
  
  // Use typed arrays and limit range for better performance
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  const nonBreathingData = Array.from(dataArray.subarray(nonBreathingStartBin, nonBreathingEndBin));
  
  // Calculate the average amplitude in time domain for transient detection
  let timeAvg = 0;
  if (rawTimeData) {
    timeAvg = rawTimeData.reduce((sum, val) => sum + Math.abs(val), 0) / rawTimeData.length;
  }
  
  // Calculate average non-breathing noise
  const nonBreathingAvg = nonBreathingData.reduce((sum, val) => sum + val, 0) / nonBreathingData.length;
  const hasNonBreathingNoise = nonBreathingAvg > AMBIENT_NOISE_THRESHOLD * 255;
  
  // Cache the max value to avoid multiple calculations
  const maxValue = Math.max(...relevantData, 1); // Avoid division by zero
  
  // Use map with enhanced sensitivity multiplier in one pass
  const processedData = relevantData.map(value => 
    Math.min(1, (value / maxValue) * sensitivityMultiplier * 2)
  );
  
  // Update the breathing pattern buffer if no non-breathing noise is detected
  if (!hasNonBreathingNoise) {
    if (breathingPatternBuffer.length >= PATTERN_BUFFER_SIZE) {
      breathingPatternBuffer.shift();
    }
    
    // Add the average of the current data to the pattern buffer
    const avgValue = processedData.reduce((sum, val) => sum + val, 0) / processedData.length;
    const enhancedValue = avgValue + (timeAvg * 6); // Increase time domain component for better transient detection
    breathingPatternBuffer.push(Math.min(1, enhancedValue));
    
    // Store sequences of breathing data for pattern matching
    if (breathingPatternBuffer.length >= 10) {
      const recentData = breathingPatternBuffer.slice(-10);
      historicalBreathingData.push([...recentData]);
      
      // Keep only the most recent 20 sequences
      if (historicalBreathingData.length > 20) {
        historicalBreathingData.shift();
      }
    }
    
    // Update sound pattern detection
    updateSoundPatterns(dataArray);
  }
  
  return processedData;
};

// New function to detect specific sound patterns
const updateSoundPatterns = (frequencyData: Uint8Array): void => {
  if (!audioContext || !analyser) return;
  
  const sampleRate = audioContext.sampleRate;
  const binSize = sampleRate / analyser.fftSize;
  
  // Analyze snoring frequencies
  const snoringStartBin = Math.floor(SNORING_FREQUENCY_RANGE.min / binSize);
  const snoringEndBin = Math.floor(SNORING_FREQUENCY_RANGE.max / binSize);
  const snoringData = Array.from(frequencyData.subarray(snoringStartBin, snoringEndBin));
  const snoringAvg = snoringData.reduce((sum, val) => sum + val, 0) / snoringData.length;
  
  // Analyze coughing frequencies
  const coughingStartBin = Math.floor(COUGHING_FREQUENCY_RANGE.min / binSize);
  const coughingEndBin = Math.floor(COUGHING_FREQUENCY_RANGE.max / binSize);
  const coughingData = Array.from(frequencyData.subarray(coughingStartBin, coughingEndBin));
  const coughingAvg = coughingData.reduce((sum, val) => sum + val, 0) / coughingData.length;
  
  // Analyze gasping frequencies
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

// Enhanced analysis function with better pattern detection, sound classification, and noise filtering
export const analyzeCurrentAudio = (): AudioAnalysisResult => {
  if (!analyser || !dataArray || !isListening || breathingPatternBuffer.length < 5) {
    return {
      isApnea: false,
      confidence: 0,
      duration: 0,
      pattern: "normal",
      timestamp: Date.now(),
      detectedSounds: {
        snoring: false,
        coughing: false,
        gasping: false,
        pausedBreathing: false
      },
      nonBreathingNoise: false
    };
  }
  
  // Throttle analysis to reduce CPU usage but more frequent than before
  const now = Date.now();
  if (now - lastAnalysisTime < ANALYSIS_THROTTLE_MS) {
    // Return previous result to avoid excessive processing
    return detectionEvents.length > 0 ? detectionEvents[detectionEvents.length - 1] : {
      isApnea: false,
      confidence: 0,
      duration: 0,
      pattern: "normal",
      timestamp: now,
      detectedSounds: {
        snoring: false,
        coughing: false,
        gasping: false,
        pausedBreathing: false
      },
      nonBreathingNoise: false
    };
  }
  
  lastAnalysisTime = now;
  
  analyser.getByteFrequencyData(dataArray);
  if (rawTimeData) {
    analyser.getFloatTimeDomainData(rawTimeData);
  }
  
  // Focus on breathing frequency range
  const startBin = Math.floor(BREATHING_FREQUENCY_RANGE.min / (audioContext!.sampleRate / analyser.fftSize)); 
  const endBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext!.sampleRate / analyser.fftSize));
  
  // Check for non-breathing noise in other frequency ranges
  const nonBreathingStartBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext!.sampleRate / analyser.fftSize));
  const nonBreathingEndBin = Math.floor(4500 / (audioContext!.sampleRate / analyser.fftSize));
  
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  const nonBreathingData = Array.from(dataArray.subarray(nonBreathingStartBin, nonBreathingEndBin));
  
  // Calculate average non-breathing noise
  const nonBreathingAvg = nonBreathingData.reduce((sum, val) => sum + val, 0) / nonBreathingData.length;
  const hasNonBreathingNoise = nonBreathingAvg > AMBIENT_NOISE_THRESHOLD * 255;
  
  const avgAmplitude = relevantData.reduce((sum, val) => sum + val, 0) / relevantData.length;
  
  // Calculate the average amplitude in time domain for transient detection
  let timeAvg = 0;
  if (rawTimeData) {
    timeAvg = rawTimeData.reduce((sum, val) => sum + Math.abs(val), 0) / rawTimeData.length;
  }
  
  // If non-breathing noise is detected, return early with a notification
  if (hasNonBreathingNoise) {
    const result: AudioAnalysisResult = {
      isApnea: false,
      confidence: 0,
      duration: 0,
      pattern: "normal",
      timestamp: now,
      detectedSounds: {
        snoring: false,
        coughing: false,
        gasping: false,
        pausedBreathing: false
      },
      nonBreathingNoise: true,
      message: "Non-breathing noise detected. Please ensure you're in a quiet environment."
    };
    
    // Add to detection events history
    if (detectionEvents.length >= 10) detectionEvents.shift();
    detectionEvents.push(result);
    
    return result;
  }
  
  // Apply enhanced sensitivity to detection threshold for breathing analysis
  const threshold = DETECTION_THRESHOLD_BASE / sensitivityMultiplier;
  
  // Detect silence (potential apnea) with enhanced detection
  const isSilent = avgAmplitude < threshold && timeAvg < threshold / 10;
  
  // Calculate confidence based on how far below threshold - make it more sensitive
  let confidence = isSilent ? Math.min(1, (threshold - avgAmplitude) / threshold * 2) : 0;
  
  // Add time domain component to confidence calculation
  if (timeAvg < threshold / 10) {
    confidence = Math.max(confidence, 0.35);
  }
  
  // Detect sound patterns only if no non-breathing noise is detected
  const snoring = detectSoundPattern(soundPatterns.snoring, 6); // Reduced threshold to detect subtler snoring
  const coughing = detectSoundPattern(soundPatterns.coughing, 8); // Reduced threshold
  const gasping = detectSoundPattern(soundPatterns.gasping, 10); // Reduced threshold
  
  // Use reference patterns for better detection
  let referenceMatch: any = null;
  let patternType: string | undefined = undefined;
  
  // Only do pattern matching when we have enough data
  if (breathingPatternBuffer.length >= 10) {
    const recentBreathingData = breathingPatternBuffer.slice(-10);
    const referenceResult = detectApneaWithReferencePatterns(recentBreathingData);
    
    if (referenceResult.confidence > 0.6) {
      // Use the result from reference pattern matching to improve confidence
      confidence = Math.max(confidence, referenceResult.confidence);
      patternType = referenceResult.patternType;
      
      if (referenceResult.isApnea) {
        confidence = Math.max(confidence, 0.8);
      }
    }
  }
  
  // Enhanced pattern detection using the buffer
  // Calculate standard deviation to detect irregular patterns
  if (breathingPatternBuffer.length >= 5) {
    const mean = breathingPatternBuffer.reduce((sum, val) => sum + val, 0) / breathingPatternBuffer.length;
    const variance = breathingPatternBuffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / breathingPatternBuffer.length;
    const stdDev = Math.sqrt(variance);
    
    // Detect irregular patterns - rapid changes in breathing amplitude
    const isIrregular = stdDev > 0.065 * sensitivityMultiplier;
    
    // Look for extended periods of no variation - indicates potential apnea
    const recentValues = breathingPatternBuffer.slice(-5);
    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const recentVariance = recentValues.reduce((sum, val) => sum + Math.pow(val - recentMean, 2), 0) / recentValues.length;
    const recentStdDev = Math.sqrt(recentVariance);
    
    // Low recent variation with low values indicates potential apnea
    const isFlat = recentStdDev < 0.02 && recentMean < 0.12;
    
    // Boost confidence if pattern analysis also suggests issues
    if (isIrregular || isFlat) {
      confidence = Math.max(confidence, 0.65);
      
      if (isFlat && recentMean < 0.1) {
        confidence = Math.max(confidence, 0.85);
      }
    }
    
    // Detect paused breathing
    const pausedBreathing = isFlat && recentMean < 0.1;
    
    // Add sound-based detection to further improve confidence
    if (snoring || gasping) {
      confidence = Math.max(confidence, 0.7);
    }
  }
  
  // Increase confidence threshold for consecutive anomalies for more reliable detection
  if (confidence > 0.15) { // Lowered threshold to detect more subtle events
    consecutiveAnomalies++;
  } else {
    consecutiveAnomalies = Math.max(0, consecutiveAnomalies - 1);
  }
  
  // Boost confidence if we've detected multiple anomalies in a row
  if (consecutiveAnomalies >= 2) {
    confidence += 0.4;
  }
  
  // Determine breathing pattern
  let pattern: "normal" | "interrupted" | "missing" = "normal";
  
  if (confidence > 0.45) {
    pattern = "missing";
  } else if (confidence > 0.15) { // Lowered threshold to detect subtler interruptions
    pattern = "interrupted";
  }
  
  // Create the full analysis result with detailed sound detection
  const result: AudioAnalysisResult = {
    isApnea: confidence > 0.45,
    confidence: confidence,
    duration: consecutiveAnomalies * (ANALYSIS_THROTTLE_MS / 1000),
    pattern: pattern,
    timestamp: now,
    frequencyData: relevantData.slice(0, 100),
    detectedSounds: {
      snoring: snoring,
      coughing: coughing,
      gasping: gasping,
      pausedBreathing: pattern === "missing"
    },
    nonBreathingNoise: false,
    patternType
  };
  
  // Add to detection events history
  if (detectionEvents.length >= 10) detectionEvents.shift();
  detectionEvents.push(result);
  
  return result;
};

// Helper function to detect specific sound patterns with improved sensitivity
const detectSoundPattern = (patternData: number[], threshold: number): boolean => {
  if (patternData.length < 3) return false;
  
  // Calculate average and peak values
  const avg = patternData.reduce((sum, val) => sum + val, 0) / patternData.length;
  const peak = Math.max(...patternData);
  
  // A sound is detected if the average is above threshold or there's a significant peak
  return avg > threshold || peak > threshold * 1.2;
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
  const actualInterval = Math.max(200, intervalMs); // Minimum 200ms for even more responsive detection
  
  detectionInterval = window.setInterval(() => {
    const result = analyzeCurrentAudio();
    callback(result);
  }, actualInterval);
  
  console.log(`Started continuous detection with interval ${actualInterval}ms`);
};

// For testing - generate a random apnea event with more realistic distribution based on reference patterns
export const generateTestApneaEvent = (): AudioAnalysisResult => {
  const random = Math.random();
  
  if (random < 0.12) { // Slightly increased probability of severe apnea for testing
    return {
      isApnea: true,
      confidence: 0.85 + (random * 0.15), // 0.85-1.0 confidence
      duration: Math.floor(random * 10) + 5, // 5-15 seconds
      pattern: "missing",
      timestamp: Date.now(),
      detectedSounds: {
        snoring: false,
        coughing: false,
        gasping: true,
        pausedBreathing: true
      },
      nonBreathingNoise: false,
      patternType: random < 0.06 ? "complete-cessation" : "gradual-central"
    };
  } else if (random < 0.35) { // Increased probability of moderate events
    return {
      isApnea: false,
      confidence: 0.55 + (random * 0.3), // 0.55-0.85 confidence
      duration: Math.floor(random * 5) + 2, // 2-7 seconds
      pattern: "interrupted",
      timestamp: Date.now(),
      detectedSounds: {
        snoring: random > 0.2,
        coughing: random < 0.15,
        gasping: false,
        pausedBreathing: false
      },
      nonBreathingNoise: false,
      patternType: random < 0.25 ? "continued-effort" : "moderate-reduction"
    };
  } else {
    return {
      isApnea: false,
      confidence: random * 0.25, // 0-0.25 confidence
      duration: 0,
      pattern: "normal",
      timestamp: Date.now(),
      detectedSounds: {
        snoring: random > 0.85,
        coughing: random > 0.92,
        gasping: false,
        pausedBreathing: false
      },
      nonBreathingNoise: false,
      patternType: random < 0.6 ? "regular-quiet" : "deeper-sleep"
    };
  }
};

// Get recent detection events
export const getRecentDetectionEvents = (): AudioAnalysisResult[] => {
  return [...detectionEvents];
};
