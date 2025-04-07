
import { toast } from "sonner";

// Audio buffer interface
export interface ProcessedAudio {
  buffer: AudioBuffer;
  features: Float32Array | Float32Array[] | null;
  duration: number;
  sampleRate: number;
  featureType: 'mfcc' | 'melspectrogram' | 'raw';
}

// Preprocessing settings
export interface PreprocessingOptions {
  trimSilence?: boolean;
  normalizeVolume?: boolean;
  featureExtraction?: 'mfcc' | 'melspectrogram' | 'raw';
  silenceThreshold?: number; // 0-1, default 0.05
  melFilterBanks?: number; // Default 40
  mfccCoefficients?: number; // Default 13
}

// Create audio context as needed
const getAudioContext = (): AudioContext => {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  return new AudioContextClass() as AudioContext;
};

// Convert audio blob to audio buffer
export const blobToAudioBuffer = async (blob: Blob): Promise<AudioBuffer> => {
  try {
    const audioContext = getAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error("Error converting blob to audio buffer:", error);
    toast.error("Failed to process audio data");
    throw error;
  }
};

// Trim silence from audio buffer
export const trimSilence = (
  buffer: AudioBuffer, 
  threshold: number = 0.05
): AudioBuffer => {
  const audioContext = getAudioContext();
  const channelData = buffer.getChannelData(0);
  
  // Find start and end points (non-silent)
  let start = 0;
  let end = channelData.length - 1;
  
  // Find first non-silent sample
  for (let i = 0; i < channelData.length; i++) {
    if (Math.abs(channelData[i]) > threshold) {
      start = Math.max(0, i - 4410); // 100ms buffer at 44.1kHz
      break;
    }
  }
  
  // Find last non-silent sample
  for (let i = channelData.length - 1; i >= 0; i--) {
    if (Math.abs(channelData[i]) > threshold) {
      end = Math.min(channelData.length - 1, i + 4410); // 100ms buffer
      break;
    }
  }
  
  // Create trimmed buffer
  const duration = (end - start) / buffer.sampleRate;
  const trimmedBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    end - start,
    buffer.sampleRate
  );
  
  // Copy trimmed data to new buffer
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const trimmedData = trimmedBuffer.getChannelData(channel);
    const originalData = buffer.getChannelData(channel);
    for (let i = 0; i < trimmedData.length; i++) {
      trimmedData[i] = originalData[i + start];
    }
  }
  
  return trimmedBuffer;
};

// Normalize audio volume
export const normalizeVolume = (buffer: AudioBuffer): AudioBuffer => {
  const audioContext = getAudioContext();
  const normalizedBuffer = audioContext.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );
  
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    const normalizedData = normalizedBuffer.getChannelData(channel);
    
    // Find peak amplitude
    let max = 0;
    for (let i = 0; i < channelData.length; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > max) {
        max = abs;
      }
    }
    
    // Normalize based on peak (avoid division by zero)
    const gainFactor = max > 0.001 ? 0.9 / max : 1;
    for (let i = 0; i < channelData.length; i++) {
      normalizedData[i] = channelData[i] * gainFactor;
    }
  }
  
  return normalizedBuffer;
};

// Extract Mel spectrogram features
export const extractMelSpectrogram = (
  buffer: AudioBuffer,
  melBands: number = 40
): Float32Array[] => {
  try {
    const audioContext = getAudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    
    // Create temporary buffer source to connect to analyzer
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    
    // Frame parameters
    const frameDuration = 0.025; // 25ms frames
    const frameStep = 0.010; // 10ms step
    const frameSamples = Math.floor(buffer.sampleRate * frameDuration);
    const hopSamples = Math.floor(buffer.sampleRate * frameStep);
    const frameCount = Math.floor((buffer.length - frameSamples) / hopSamples) + 1;
    
    // Matrix to store mel spectrogram
    const melSpectrogram: Float32Array[] = [];
    
    // Process each frame
    for (let frame = 0; frame < frameCount; frame++) {
      const startSample = frame * hopSamples;
      
      // Get spectrum for this frame
      const dataArray = new Float32Array(bufferLength);
      analyser.getFloatFrequencyData(dataArray);
      
      // Apply mel filterbanks (simplified implementation)
      const melFrame = applyMelFilterbanks(dataArray, melBands, buffer.sampleRate);
      melSpectrogram.push(melFrame);
      
      // Move source ahead for next frame
      source.start(0, startSample / buffer.sampleRate, frameDuration);
    }
    
    return melSpectrogram;
  } catch (error) {
    console.error("Error extracting mel spectrogram:", error);
    return [];
  }
};

// Extract MFCC features
export const extractMFCC = (
  buffer: AudioBuffer,
  coefficients: number = 13
): Float32Array[] => {
  // For a full implementation, we'd use a library like meyda.js
  // This is a simplified placeholder
  try {
    // Get mel spectrogram first
    const melSpectrogram = extractMelSpectrogram(buffer);
    
    // Apply log and DCT (simplified implementation)
    const mfccs: Float32Array[] = [];
    for (const melFrame of melSpectrogram) {
      // Apply log to mel energies
      const logMelFrame = new Float32Array(melFrame.length);
      for (let i = 0; i < melFrame.length; i++) {
        logMelFrame[i] = Math.log(Math.max(1e-10, melFrame[i]));
      }
      
      // Apply DCT (simplified)
      const mfccFrame = new Float32Array(coefficients);
      for (let i = 0; i < coefficients; i++) {
        let sum = 0;
        for (let j = 0; j < logMelFrame.length; j++) {
          sum += logMelFrame[j] * Math.cos((Math.PI / logMelFrame.length) * (j + 0.5) * i);
        }
        mfccFrame[i] = sum;
      }
      
      mfccs.push(mfccFrame);
    }
    
    return mfccs;
  } catch (error) {
    console.error("Error extracting MFCCs:", error);
    return [];
  }
};

// Helper function for mel filterbanks
function applyMelFilterbanks(
  frequencyData: Float32Array,
  melBands: number,
  sampleRate: number
): Float32Array {
  // Convert to mel scale and apply filters
  const melFrame = new Float32Array(melBands);
  const maxFreq = sampleRate / 2;
  
  // Simple linear spacing (a real implementation would use proper mel spacing)
  for (let i = 0; i < melBands; i++) {
    const startBin = Math.floor((frequencyData.length * i) / melBands);
    const endBin = Math.floor((frequencyData.length * (i + 1)) / melBands);
    
    let sum = 0;
    for (let j = startBin; j < endBin; j++) {
      // Convert dB to linear scale
      const linearValue = Math.pow(10, frequencyData[j] / 20);
      sum += linearValue;
    }
    
    melFrame[i] = sum / (endBin - startBin);
  }
  
  return melFrame;
}

// Main preprocessing function
export const preprocessAudio = async (
  audioBlob: Blob,
  options: PreprocessingOptions = {}
): Promise<ProcessedAudio> => {
  try {
    // Set default options
    const {
      trimSilence: shouldTrim = true,
      normalizeVolume: shouldNormalize = true,
      featureExtraction = 'melspectrogram',
      silenceThreshold = 0.05,
      melFilterBanks = 40,
      mfccCoefficients = 13
    } = options;
    
    // Convert to audio buffer
    let buffer = await blobToAudioBuffer(audioBlob);
    
    // Apply preprocessing steps
    if (shouldTrim) {
      buffer = trimSilence(buffer, silenceThreshold);
    }
    
    if (shouldNormalize) {
      buffer = normalizeVolume(buffer);
    }
    
    // Extract features based on type
    let features: Float32Array | Float32Array[] | null = null;
    
    switch (featureExtraction) {
      case 'mfcc':
        features = extractMFCC(buffer, mfccCoefficients);
        break;
      case 'melspectrogram':
        features = extractMelSpectrogram(buffer, melFilterBanks);
        break;
      case 'raw':
      default:
        // Use raw audio data
        features = buffer.getChannelData(0);
        break;
    }
    
    return {
      buffer,
      features,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      featureType: featureExtraction
    };
  } catch (error) {
    console.error("Error preprocessing audio:", error);
    toast.error("Failed to preprocess audio");
    throw error;
  }
};

// Format features for CNN input
export const prepareForCNN = (processedAudio: ProcessedAudio): Float32Array => {
  // This function would format the features to match the expected CNN input
  // The exact implementation depends on the model's input requirements
  
  try {
    const { features, featureType } = processedAudio;
    
    if (!features) {
      throw new Error("No features available to prepare for CNN");
    }
    
    if (featureType === 'mfcc' || featureType === 'melspectrogram') {
      // For MFCCs or Mel spectrograms, we need to flatten the 2D array
      // and possibly pad or truncate to a fixed length
      const featureFrames = features as Float32Array[];
      
      // Target size for CNN input
      const targetFrames = 128; // Example: model expects 128 frames
      const featureSize = featureFrames[0].length;
      const modelInputSize = targetFrames * featureSize;
      
      // Create fixed-size array for model input
      const modelInput = new Float32Array(modelInputSize);
      modelInput.fill(0); // Initialize with zeros (padding)
      
      // Copy available frames (truncate if needed)
      const framesToUse = Math.min(featureFrames.length, targetFrames);
      
      for (let i = 0; i < framesToUse; i++) {
        const frame = featureFrames[i];
        for (let j = 0; j < frame.length; j++) {
          modelInput[i * featureSize + j] = frame[j];
        }
      }
      
      return modelInput;
    } else {
      // For raw audio, we need to reshape to fixed length
      const rawAudio = features as Float32Array;
      
      // Target size for CNN input
      const targetLength = 16384; // Example: model expects 16384 samples
      
      // Create fixed-size array and copy data (with truncation or padding)
      const modelInput = new Float32Array(targetLength);
      modelInput.fill(0); // Initialize with zeros (padding)
      
      const samplesToUse = Math.min(rawAudio.length, targetLength);
      
      for (let i = 0; i < samplesToUse; i++) {
        modelInput[i] = rawAudio[i];
      }
      
      return modelInput;
    }
  } catch (error) {
    console.error("Error preparing data for CNN:", error);
    throw error;
  }
};

// Save audio to WAV file
export const saveAudioToWav = (buffer: AudioBuffer, filename: string = "recording.wav"): void => {
  try {
    // Create WAV file
    const wavBlob = audioBufferToWav(buffer);
    
    // Create download link
    const url = URL.createObjectURL(wavBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
    
  } catch (error) {
    console.error("Error saving audio to WAV:", error);
    toast.error("Failed to save audio file");
  }
};

// Convert AudioBuffer to WAV blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM format
  const bitDepth = 16; // 16-bit
  
  // Extract channel data
  const channelData: Float32Array[] = [];
  for (let channel = 0; channel < numChannels; channel++) {
    channelData.push(buffer.getChannelData(channel));
  }
  
  // Calculate byte sizes
  const dataLength = channelData[0].length * numChannels * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  
  // Create WAV buffer
  const wavBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(wavBuffer);
  
  // Write WAV header
  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  
  // "fmt " sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true); // audio format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // byte rate
  view.setUint16(32, numChannels * (bitDepth / 8), true); // block align
  view.setUint16(34, bitDepth, true);
  
  // "data" sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
  
  // Write audio data
  const offset = 44;
  let pos = offset;
  
  // Process each sample
  for (let i = 0; i < channelData[0].length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      
      // Convert to 16-bit PCM
      let val = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, val, true);
      pos += 2;
    }
  }
  
  return new Blob([wavBuffer], { type: "audio/wav" });
}

// Helper function to write string to DataView
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
