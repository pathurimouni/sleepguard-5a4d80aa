
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
