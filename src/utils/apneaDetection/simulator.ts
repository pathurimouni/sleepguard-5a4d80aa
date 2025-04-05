
import { AudioAnalysisResult } from "./types";

// Generate synthetic apnea event for testing purposes
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
