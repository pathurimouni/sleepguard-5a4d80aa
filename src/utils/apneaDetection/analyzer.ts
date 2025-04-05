import { AudioAnalysisResult, detectionEvents, getRecentDetectionEvents } from "./types";
import { 
  DETECTION_THRESHOLD_BASE, 
  AMBIENT_NOISE_THRESHOLD,
  BREATHING_FREQUENCY_RANGE,
  getAudioComponents
} from "./core";

// Analysis state
let consecutiveAnomalies = 0;
let lastAnalysisTime = 0;

// Analyze current audio for sleep apnea
export const analyzeCurrentAudio = (): AudioAnalysisResult => {
  const { analyser, dataArray, rawTimeData, isListening, sensitivityMultiplier } = getAudioComponents();
  const { breathingPatternBuffer, soundPatterns } = getBreathingPatterns();
  
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
    const recentEvents = getRecentDetectionEvents();
    return recentEvents.length > 0 ? recentEvents[recentEvents.length - 1] : {
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
  
  const audioContext = getAudioComponents().audioContext;
  if (!audioContext) {
    return { isApnea: false, confidence: 0, duration: 0, pattern: "normal" };
  }
  
  analyser.getByteFrequencyData(dataArray);
  if (rawTimeData) {
    analyser.getFloatTimeDomainData(rawTimeData);
  }
  
  const startBin = Math.floor(BREATHING_FREQUENCY_RANGE.min / (audioContext.sampleRate / analyser.fftSize)); 
  const endBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext.sampleRate / analyser.fftSize));
  
  const nonBreathingStartBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext.sampleRate / analyser.fftSize));
  const nonBreathingEndBin = Math.floor(4500 / (audioContext.sampleRate / analyser.fftSize));
  
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
    
    addDetectionEvent(result);
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
  
  addDetectionEvent(result);
  return result;
};

// Reset consecutive anomalies counter
export const resetAnalysisState = () => {
  // Reset any analyzer-specific state here
  consecutiveAnomalies = 0;
  
  // Clear detection events
  while (detectionEvents.length > 0) {
    detectionEvents.pop();
  }
};
