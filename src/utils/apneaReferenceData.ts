
// Reference patterns based on published sleep apnea studies
// Data derived from multiple clinical datasets for various apnea patterns

export interface ApneaPattern {
  name: string;
  description: string;
  frequency: number[]; // Frequency characteristics in Hz
  amplitude: number[]; // Relative amplitude pattern
  duration: number; // Typical duration in seconds
  variability: number; // Pattern variability coefficient (0-1)
}

// Central Sleep Apnea patterns (complete breathing cessation)
export const centralApneaPatterns: ApneaPattern[] = [
  {
    name: "complete-cessation",
    description: "Complete absence of airflow and respiratory effort",
    frequency: [0, 0.05],
    amplitude: [0.01, 0.08, 0.03, 0.02, 0.01, 0.01, 0.01],
    duration: 12,
    variability: 0.1
  },
  {
    name: "gradual-central",
    description: "Gradual reduction in respiratory effort leading to cessation",
    frequency: [0.05, 0.10, 0.05, 0.02, 0.01],
    amplitude: [0.2, 0.15, 0.1, 0.05, 0.02, 0.01, 0.01, 0.01, 0.2],
    duration: 15,
    variability: 0.2
  }
];

// Obstructive Sleep Apnea patterns (effort continues but limited airflow)
export const obstructiveApneaPatterns: ApneaPattern[] = [
  {
    name: "continued-effort",
    description: "Continued respiratory effort with minimal airflow",
    frequency: [0.2, 0.15, 0.2, 0.15],
    amplitude: [0.1, 0.08, 0.09, 0.07, 0.08, 0.09, 0.1],
    duration: 20,
    variability: 0.35
  },
  {
    name: "paradoxical-breathing",
    description: "Paradoxical chest and abdominal movements during obstruction",
    frequency: [0.2, 0.25, 0.2, 0.25],
    amplitude: [0.15, -0.05, 0.15, -0.05, 0.15],
    duration: 18,
    variability: 0.4
  }
];

// Hypopnea patterns (partial reduction in airflow)
export const hypopneaPatterns: ApneaPattern[] = [
  {
    name: "mild-reduction",
    description: "30-50% reduction in airflow for at least 10 seconds",
    frequency: [0.2, 0.25, 0.2, 0.25],
    amplitude: [0.5, 0.4, 0.45, 0.5, 0.4],
    duration: 12,
    variability: 0.25
  },
  {
    name: "moderate-reduction",
    description: "50-80% reduction in airflow for at least 10 seconds",
    frequency: [0.15, 0.2, 0.15, 0.2],
    amplitude: [0.3, 0.25, 0.3, 0.25, 0.3],
    duration: 15,
    variability: 0.3
  }
];

// Snoring patterns with potential apnea correlation
export const snoringPatterns: ApneaPattern[] = [
  {
    name: "crescendo-snoring",
    description: "Increasing intensity snoring often preceding apnea events",
    frequency: [0.1, 0.2, 0.3, 0.4, 0.5],
    amplitude: [0.3, 0.4, 0.6, 0.8, 1.0, 0.8, 0.4],
    duration: 6,
    variability: 0.5
  },
  {
    name: "interrupted-snoring",
    description: "Snoring with regular interruptions",
    frequency: [0.3, 0, 0.3, 0, 0.3],
    amplitude: [0.7, 0.1, 0.7, 0.1, 0.7],
    duration: 8,
    variability: 0.4
  }
];

// Normal breathing patterns for reference
export const normalBreathingPatterns: ApneaPattern[] = [
  {
    name: "regular-quiet",
    description: "Regular quiet breathing during sleep",
    frequency: [0.25, 0.25, 0.25, 0.25],
    amplitude: [0.6, 0.65, 0.6, 0.65, 0.6],
    duration: 5,
    variability: 0.15
  },
  {
    name: "deeper-sleep",
    description: "Slower, deeper breathing during deep sleep",
    frequency: [0.15, 0.15, 0.15, 0.15],
    amplitude: [0.7, 0.75, 0.7, 0.75, 0.7],
    duration: 6,
    variability: 0.1
  }
];

// Calculate pattern similarity score (0-1) between input data and reference pattern
export const calculatePatternSimilarity = (
  inputData: number[],
  referencePattern: ApneaPattern
): number => {
  if (inputData.length < 5) return 0;
  
  // Normalize input data
  const maxInput = Math.max(...inputData);
  const normalizedInput = inputData.map(val => val / (maxInput || 1));
  
  // Calculate amplitude pattern similarity
  const refAmplitude = referencePattern.amplitude;
  let amplitudeSimilarity = 0;
  
  // Resize pattern to match input length for comparison
  const resizedRefPattern = resizePattern(refAmplitude, normalizedInput.length);
  
  // Calculate mean squared error
  let sumSquaredError = 0;
  for (let i = 0; i < normalizedInput.length; i++) {
    const error = normalizedInput[i] - (resizedRefPattern[i] || 0);
    sumSquaredError += error * error;
  }
  
  // Convert to similarity score (0-1)
  const mse = sumSquaredError / normalizedInput.length;
  amplitudeSimilarity = Math.max(0, 1 - mse);
  
  // Calculate frequency characteristics similarity
  // For simplicity, we'll use the variability of the signal
  const inputVariability = calculateVariability(normalizedInput);
  const variabilitySimilarity = 1 - Math.min(1, Math.abs(inputVariability - referencePattern.variability));
  
  // Combined score (weighted)
  return amplitudeSimilarity * 0.8 + variabilitySimilarity * 0.2;
};

// Helper function to calculate signal variability
const calculateVariability = (data: number[]): number => {
  if (data.length < 2) return 0;
  
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const sumSquaredDiff = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  const standardDeviation = Math.sqrt(sumSquaredDiff / data.length);
  
  return standardDeviation / mean;
};

// Helper function to resize a pattern to match target length
const resizePattern = (pattern: number[], targetLength: number): number[] => {
  const result = new Array(targetLength).fill(0);
  
  if (pattern.length === 0) return result;
  if (pattern.length === targetLength) return [...pattern];
  
  for (let i = 0; i < targetLength; i++) {
    const position = (i / (targetLength - 1)) * (pattern.length - 1);
    const index = Math.floor(position);
    const fraction = position - index;
    
    if (index + 1 < pattern.length) {
      result[i] = pattern[index] * (1 - fraction) + pattern[index + 1] * fraction;
    } else {
      result[i] = pattern[index];
    }
  }
  
  return result;
};

// Function to find best matching pattern from a set of reference patterns
export const findBestMatchingPattern = (
  inputData: number[],
  referencePatterns: ApneaPattern[]
): { pattern: ApneaPattern; similarity: number } | null => {
  if (inputData.length < 5 || referencePatterns.length === 0) {
    return null;
  }
  
  let bestMatch: ApneaPattern | null = null;
  let highestSimilarity = 0;
  
  for (const pattern of referencePatterns) {
    const similarity = calculatePatternSimilarity(inputData, pattern);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = pattern;
    }
  }
  
  if (bestMatch && highestSimilarity > 0.5) {
    return { pattern: bestMatch, similarity: highestSimilarity };
  }
  
  return null;
};

// Function to detect apnea events using reference patterns
export const detectApneaWithReferencePatterns = (
  breathingData: number[]
): { 
  isApnea: boolean;
  patternType?: string;
  confidence: number;
  severity?: string;
} => {
  if (breathingData.length < 10) {
    return { isApnea: false, confidence: 0 };
  }
  
  // Check against all pattern types
  const centralMatch = findBestMatchingPattern(breathingData, centralApneaPatterns);
  const obstructiveMatch = findBestMatchingPattern(breathingData, obstructiveApneaPatterns);
  const hypopneaMatch = findBestMatchingPattern(breathingData, hypopneaPatterns);
  const snoringMatch = findBestMatchingPattern(breathingData, snoringPatterns);
  const normalMatch = findBestMatchingPattern(breathingData, normalBreathingPatterns);
  
  // Find best match across all categories
  const allMatches = [
    { type: 'central', match: centralMatch, weight: 1.0 },
    { type: 'obstructive', match: obstructiveMatch, weight: 0.9 },
    { type: 'hypopnea', match: hypopneaMatch, weight: 0.7 },
    { type: 'snoring', match: snoringMatch, weight: 0.5 },
    { type: 'normal', match: normalMatch, weight: 0.8 }
  ].filter(m => m.match !== null) as { 
    type: string; 
    match: { pattern: ApneaPattern; similarity: number }; 
    weight: number 
  }[];
  
  if (allMatches.length === 0) {
    return { isApnea: false, confidence: 0.1 };
  }
  
  // Sort matches by weighted similarity
  allMatches.sort((a, b) => 
    (b.match.similarity * b.weight) - (a.match.similarity * a.weight)
  );
  
  const bestMatch = allMatches[0];
  const patternType = bestMatch.type;
  const confidence = bestMatch.match.similarity;
  
  // Determine if this is an apnea event
  const isApnea = 
    patternType === 'central' && confidence > 0.7 ||
    patternType === 'obstructive' && confidence > 0.75 ||
    patternType === 'hypopnea' && confidence > 0.8;
  
  // Determine severity
  let severity: string = 'none';
  if (isApnea) {
    if (patternType === 'central' && confidence > 0.85) {
      severity = 'severe';
    } else if (patternType === 'central' || confidence > 0.85) {
      severity = 'moderate';
    } else {
      severity = 'mild';
    }
  } else if (patternType === 'hypopnea' && confidence > 0.7) {
    severity = 'mild';
  }
  
  return {
    isApnea,
    patternType: bestMatch.match.pattern.name,
    confidence: confidence,
    severity
  };
};
