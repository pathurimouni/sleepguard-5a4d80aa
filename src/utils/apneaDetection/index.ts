
// Export all functionality from submodules
export * from "./types";
export * from "./core";
export * from "./collector";
export * from "./analyzer";
export * from "./simulator";

// Reset all state when initializing a new detection session
export const resetAllState = () => {
  const { resetPatternData } = require("./collector");
  const { resetAnalysisState } = require("./analyzer");
  
  resetPatternData();
  resetAnalysisState();
};

// Fix re-export ambiguity by explicitly re-exporting the functions
export { getRecentDetectionEvents, addDetectionEvent } from "./types";
