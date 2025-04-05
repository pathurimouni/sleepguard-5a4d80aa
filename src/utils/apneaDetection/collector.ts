import { AudioAnalysisResult } from "./types";
import { 
  BREATHING_FREQUENCY_RANGE,
  SNORING_FREQUENCY_RANGE,
  GASPING_FREQUENCY_RANGE,
  getAudioComponents,
  AMBIENT_NOISE_THRESHOLD
} from "./core";

// Breathing pattern data storage
let breathingPatternBuffer: number[] = [];
const PATTERN_BUFFER_SIZE = 120;
let historicalBreathingData: number[][] = [];

// Sound pattern storage
let soundPatterns: { [key: string]: number[] } = {
  snoring: [],
  gasping: [],
};

// Get current real-time breathing data
export const getCurrentBreathingData = (): number[] => {
  const { analyser, dataArray, rawTimeData, isListening, sensitivityMultiplier } = getAudioComponents();
  
  if (!analyser || !dataArray || !isListening) return [];
  
  analyser.getByteFrequencyData(dataArray);
  
  if (rawTimeData) {
    analyser.getFloatTimeDomainData(rawTimeData);
  }
  
  const audioContext = getAudioComponents().audioContext;
  if (!audioContext) return [];
  
  const startBin = Math.floor(BREATHING_FREQUENCY_RANGE.min / (audioContext.sampleRate / analyser.fftSize));
  const endBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext.sampleRate / analyser.fftSize));
  
  const nonBreathingStartBin = Math.floor(BREATHING_FREQUENCY_RANGE.max / (audioContext.sampleRate / analyser.fftSize));
  const nonBreathingEndBin = Math.floor(3500 / (audioContext.sampleRate / analyser.fftSize));
  
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

// Update sound pattern buffers for snoring and gasping detection
const updateSoundPatterns = (frequencyData: Uint8Array): void => {
  const { audioContext, analyser } = getAudioComponents();
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

// Helper function to detect sound patterns
export const detectSoundPattern = (patternData: number[], threshold: number): boolean => {
  if (patternData.length < 3) return false;
  
  const avg = patternData.reduce((sum, val) => sum + val, 0) / patternData.length;
  const peak = Math.max(...patternData);
  
  return avg > threshold || peak > threshold * 1.1;
};

// Get stored breathing patterns
export const getBreathingPatterns = () => ({
  breathingPatternBuffer,
  historicalBreathingData,
  soundPatterns
});

// Export collection state management
export const resetPatternData = () => {
  breathingPatternBuffer = [];
  historicalBreathingData = [];
  soundPatterns = {
    snoring: [],
    gasping: []
  };
};

// Get recent detection events
let detectionEvents: AudioAnalysisResult[] = [];
export const getRecentDetectionEvents = (): AudioAnalysisResult[] => {
  return [...detectionEvents];
};

// Add detection event
export const addDetectionEvent = (event: AudioAnalysisResult) => {
  if (detectionEvents.length >= 10) detectionEvents.shift();
  detectionEvents.push(event);
};
