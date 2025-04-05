import { pipeline } from "@huggingface/transformers";
import { 
  detectApneaWithReferencePatterns, 
  centralApneaPatterns, 
  obstructiveApneaPatterns,
  hypopneaPatterns,
  normalBreathingPatterns
} from "./apneaReferenceData";

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

const MODEL_NAME = "onnx-community/whisper-tiny.en";
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
const ANALYSIS_THROTTLE_MS = 60;
const DETECTION_THRESHOLD_BASE = 2.0;

let breathingPatternBuffer: number[] = [];
const PATTERN_BUFFER_SIZE = 120;
let consecutiveAnomalies = 0;
let detectionEvents: AudioAnalysisResult[] = [];
let historicalBreathingData: number[][] = [];

const SNORING_FREQUENCY_RANGE = { min: 30, max: 500 };
const GASPING_FREQUENCY_RANGE = { min: 200, max: 2500 };
let soundPatterns: { [key: string]: number[] } = {
  snoring: [],
  gasping: [],
};

const BREATHING_FREQUENCY_RANGE = { min: 20, max: 600 };
const AMBIENT_NOISE_THRESHOLD = 0.08;

export const initializeDetection = async (): Promise<boolean> => {
  try {
    if (isInitialized) return true;
    
    console.log("Initializing audio context and model with ultra-high sensitivity...");
    
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 48000
    });
    
    try {
      audioProcessor = await pipeline(
        "automatic-speech-recognition",
        MODEL_NAME,
      );
      console.log("Audio processing model loaded successfully");
    } catch (error) {
      console.error("Error loading audio model:", error);
      console.log("Falling back to enhanced frequency analysis with reference patterns");
    }
    
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

export const setSensitivity = (level: number): void => {
  sensitivityMultiplier = 7.0 - ((level - 1) / 9) * 6.8;
  console.log(`Detection sensitivity set to ${level} (multiplier: ${sensitivityMultiplier})`);
};

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
    
    breathingPatternBuffer = [];
    consecutiveAnomalies = 0;
    detectionEvents = [];
    historicalBreathingData = [];
    
    soundPatterns = {
      snoring: [],
      gasping: [],
    };
    
    isListening = true;
    console.log("Started listening to microphone with enhanced settings for maximum apnea detection sensitivity");
    return true;
  } catch (error) {
    console.error("Error accessing microphone:", error);
    return false;
  }
};

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

export const getCurrentBreathingData = (): number[] => {
  if (!analyser || !dataArray || !isListening) return [];
  
  analyser.getByteFrequencyData(dataArray);
  
  if (rawTimeData) {
    analyser.getFloatTimeDomainData(rawTimeData);
  }
  
  const startBin = Math.floor(BREATHING_FREQUENCY_RANGE.min / (audioContext!.sampleRate / analyser.fftSize));
  const endBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext!.sampleRate / analyser.fftSize));
  
  const nonBreathingStartBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext!.sampleRate / analyser.fftSize));
  const nonBreathingEndBin = Math.floor(3500 / (audioContext!.sampleRate / analyser.fftSize));
  
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  const nonBreathingData = Array.from(dataArray.subarray(nonBreathingStartBin, nonBreathingEndBin));
  
  let timeAvg = 0;
  if (rawTimeData) {
    timeAvg = rawTimeData.reduce((sum, val) => sum + Math.abs(val), 0) / rawTimeData.length;
  }
  
  const nonBreathingAvg = nonBreathingData.reduce((sum, val) => sum + val, 0) / nonBreathingData.length;
  const hasNonBreathingNoise = nonBreathingAvg > AMBIENT_NOISE_THRESHOLD * 255;
  
  const maxValue = Math.max(...relevantData, 1);
  
  const processedData = relevantData.map(value => 
    Math.min(1, (value / maxValue) * sensitivityMultiplier * 3.0)
  );
  
  if (!hasNonBreathingNoise) {
    if (breathingPatternBuffer.length >= PATTERN_BUFFER_SIZE) {
      breathingPatternBuffer.shift();
    }
    
    const avgValue = processedData.reduce((sum, val) => sum + val, 0) / processedData.length;
    const enhancedValue = avgValue + (timeAvg * 10);
    breathingPatternBuffer.push(Math.min(1, enhancedValue));
    
    if (breathingPatternBuffer.length >= 10) {
      const recentData = breathingPatternBuffer.slice(-10);
      historicalBreathingData.push([...recentData]);
      
      if (historicalBreathingData.length > 20) {
        historicalBreathingData.shift();
      }
    }
    
    updateSoundPatterns(dataArray);
  }
  
  return processedData;
};

const updateSoundPatterns = (frequencyData: Uint8Array): void => {
  if (!audioContext || !analyser) return;
  
  const sampleRate = audioContext.sampleRate;
  const binSize = sampleRate / analyser.fftSize;
  
  const snoringStartBin = Math.floor(SNORING_FREQUENCY_RANGE.min / binSize);
  const snoringEndBin = Math.floor(SNORING_FREQUENCY_RANGE.max / binSize);
  const snoringData = Array.from(frequencyData.subarray(snoringStartBin, snoringEndBin));
  const snoringAvg = snoringData.reduce((sum, val) => sum + val, 0) / snoringData.length;
  
  const gaspingStartBin = Math.floor(GASPING_FREQUENCY_RANGE.min / binSize);
  const gaspingEndBin = Math.floor(GASPING_FREQUENCY_RANGE.max / binSize);
  const gaspingData = Array.from(frequencyData.subarray(gaspingStartBin, gaspingEndBin));
  const gaspingAvg = gaspingData.reduce((sum, val) => sum + val, 0) / gaspingData.length;
  
  if (soundPatterns.snoring.length >= 10) soundPatterns.snoring.shift();
  if (soundPatterns.gasping.length >= 10) soundPatterns.gasping.shift();
  
  soundPatterns.snoring.push(snoringAvg);
  soundPatterns.gasping.push(gaspingAvg);
};

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
  
  const now = Date.now();
  if (now - lastAnalysisTime < ANALYSIS_THROTTLE_MS) {
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
  
  const startBin = Math.floor(BREATHING_FREQUENCY_RANGE.min / (audioContext!.sampleRate / analyser.fftSize)); 
  const endBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext!.sampleRate / analyser.fftSize));
  
  const nonBreathingStartBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext!.sampleRate / analyser.fftSize));
  const nonBreathingEndBin = Math.floor(4500 / (audioContext!.sampleRate / analyser.fftSize));
  
  const relevantData = Array.from(dataArray.subarray(startBin, endBin));
  const nonBreathingData = Array.from(dataArray.subarray(nonBreathingStartBin, nonBreathingEndBin));
  
  const nonBreathingAvg = nonBreathingData.reduce((sum, val) => sum + val, 0) / nonBreathingData.length;
  const hasNonBreathingNoise = nonBreathingAvg > AMBIENT_NOISE_THRESHOLD * 255;
  
  const avgAmplitude = relevantData.reduce((sum, val) => sum + val, 0) / relevantData.length;
  
  let timeAvg = 0;
  if (rawTimeData) {
    timeAvg = rawTimeData.reduce((sum, val) => sum + Math.abs(val), 0) / rawTimeData.length;
  }
  
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
      message: "Non-breathing noise detected."
    };
    
    if (detectionEvents.length >= 10) detectionEvents.shift();
    detectionEvents.push(result);
    
    return result;
  }
  
  const threshold = (DETECTION_THRESHOLD_BASE / 1.5) / (sensitivityMultiplier * 1.5);
  
  const isSilent = avgAmplitude < threshold && timeAvg < threshold / 10;
  
  let confidence = isSilent ? Math.min(1, (threshold - avgAmplitude) / threshold * 3.0) : 0;
  
  if (timeAvg < threshold / 12) {
    confidence = Math.max(confidence, 0.60);
  }
  
  const snoring = detectSoundPattern(soundPatterns.snoring, 4);
  const gasping = detectSoundPattern(soundPatterns.gasping, 6);
  
  let patternType: string | undefined = undefined;
  
  if (breathingPatternBuffer.length >= 10) {
    const recentBreathingData = breathingPatternBuffer.slice(-10);
    const referenceResult = detectApneaWithReferencePatterns(recentBreathingData);
    
    if (referenceResult.confidence > 0.4) {
      confidence = Math.max(confidence, referenceResult.confidence * 1.3);
      patternType = referenceResult.patternType;
      
      if (referenceResult.isApnea) {
        confidence = Math.max(confidence, 0.8);
      }
    }
  }
  
  if (breathingPatternBuffer.length >= 5) {
    const mean = breathingPatternBuffer.reduce((sum, val) => sum + val, 0) / breathingPatternBuffer.length;
    const variance = breathingPatternBuffer.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / breathingPatternBuffer.length;
    const stdDev = Math.sqrt(variance);
    
    const isIrregular = stdDev > 0.055 * sensitivityMultiplier;
    
    const recentValues = breathingPatternBuffer.slice(-5);
    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const recentVariance = recentValues.reduce((sum, val) => sum + Math.pow(val - recentMean, 2), 0) / recentValues.length;
    const recentStdDev = Math.sqrt(recentVariance);
    
    const isFlat = recentStdDev < 0.02 && recentMean < 0.18;
    
    if (isIrregular || isFlat) {
      confidence = Math.max(confidence, 0.65);
      
      if (isFlat && recentMean < 0.12) {
        confidence = Math.max(confidence, 0.85);
      }
    }
    
    const pausedBreathing = isFlat && recentMean < 0.15;
    
    if (snoring || gasping) {
      confidence = Math.max(confidence, 0.7);
    }
  }
  
  if (confidence > 0.09) {
    consecutiveAnomalies++;
  } else {
    consecutiveAnomalies = Math.max(0, consecutiveAnomalies - 1);
  }
  
  if (consecutiveAnomalies >= 2) {
    confidence += 0.35;
  }
  
  let pattern: "normal" | "interrupted" | "missing" = "normal";
  
  if (confidence > 0.30) {
    pattern = "missing";
  } else if (confidence > 0.10) {
    pattern = "interrupted";
  }
  
  const result: AudioAnalysisResult = {
    isApnea: confidence > 0.30,
    confidence: confidence,
    duration: consecutiveAnomalies * (ANALYSIS_THROTTLE_MS / 1000),
    pattern: pattern,
    timestamp: now,
    frequencyData: relevantData.slice(0, 100),
    detectedSounds: {
      snoring: snoring,
      coughing: false,
      gasping: gasping,
      pausedBreathing: pattern === "missing"
    },
    nonBreathingNoise: false,
    patternType
  };
  
  if (detectionEvents.length >= 10) detectionEvents.shift();
  detectionEvents.push(result);
  
  return result;
};

const detectSoundPattern = (patternData: number[], threshold: number): boolean => {
  if (patternData.length < 3) return false;
  
  const avg = patternData.reduce((sum, val) => sum + val, 0) / patternData.length;
  const peak = Math.max(...patternData);
  
  return avg > threshold || peak > threshold * 1.1;
};

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

export const generateTestApneaEvent = (): AudioAnalysisResult => {
  const random = Math.random();
  
  if (random < 0.15) {
    return {
      isApnea: true,
      confidence: 0.85 + (random * 0.15),
      duration: Math.floor(random * 10) + 5,
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
  } else if (random < 0.40) {
    return {
      isApnea: false,
      confidence: 0.55 + (random * 0.3),
      duration: Math.floor(random * 5) + 2,
      pattern: "interrupted",
      timestamp: Date.now(),
      detectedSounds: {
        snoring: random > 0.2,
        coughing: false,
        gasping: false,
        pausedBreathing: false
      },
      nonBreathingNoise: false,
      patternType: random < 0.25 ? "continued-effort" : "moderate-reduction"
    };
  } else {
    return {
      isApnea: false,
      confidence: random * 0.25,
      duration: 0,
      pattern: "normal",
      timestamp: Date.now(),
      detectedSounds: {
        snoring: random > 0.85,
        coughing: false,
        gasping: false,
        pausedBreathing: false
      },
      nonBreathingNoise: false,
      patternType: random < 0.6 ? "regular-quiet" : "deeper-sleep"
    };
  }
};

export const getRecentDetectionEvents = (): AudioAnalysisResult[] => {
  return [...detectionEvents];
};
