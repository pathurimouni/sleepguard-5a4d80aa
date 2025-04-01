import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentBreathingData } from "@/utils/apneaDetection";

interface BreathingVisualizerProps {
  isTracking: boolean;
  status?: "normal" | "warning" | "danger";
}

const BreathingVisualizer: React.FC<BreathingVisualizerProps> = ({
  isTracking,
  status = "normal",
}) => {
  const [breathingData, setBreathingData] = useState<number[]>([]);
  const maxDataPoints = 100;
  const updateInterval = 50; // ms - reduced further from 75ms to 50ms for even smoother visualization

  useEffect(() => {
    if (!isTracking) {
      setBreathingData([]);
      return;
    }

    // Get real breathing data when tracking
    const interval = setInterval(() => {
      try {
        // Get current audio data for visualization
        const currentData = getCurrentBreathingData();
        
        if (currentData.length > 0) {
          setBreathingData((prevData) => {
            const newData = [...prevData];
            // Take the average of the current audio data with increased sensitivity
            const value = currentData.reduce((sum, val) => sum + val, 0) / currentData.length;
            // Apply amplification factor to make small changes more visible
            const amplifiedValue = Math.min(1, value * 1.25);
            newData.push(amplifiedValue);
            
            // Keep only the most recent data points
            if (newData.length > maxDataPoints) {
              newData.shift();
            }
            return newData;
          });
        } else {
          // If no data, simulate breathing pattern as fallback with enhanced realism
          setBreathingData((current) => {
            const newData = [...current];
            const normalPattern = Math.sin(Date.now() / 2000) * 0.5 + 0.5;
            
            // Add some randomness and potential anomalies based on status with enhanced realism and sensitivity
            let value = normalPattern;
            if (status === "warning") {
              // Create more noticeable irregularities for warning state
              value += (Math.random() - 0.5) * 0.5; // Increased from 0.4 to 0.5
              // Occasionally add brief pauses (lower values)
              if (Math.random() < 0.25) { // Increased from 0.2 to 0.25
                value *= Math.random() * 0.6; // Reduced from 0.7 to 0.6 for more noticeable pauses
              }
            } else if (status === "danger") {
              // More severe irregularities for danger state
              if (Math.random() < 0.35) { // Increased from 0.3 to 0.35
                // Simulate apnea (near zero breathing)
                value = Math.random() * 0.15; // Reduced from 0.2 to 0.15 for more extreme lows
              } else {
                // Simulate gasping (sharp peaks)
                value = normalPattern * (1 + Math.random() * 0.9) + (Math.random() - 0.5) * 0.7; // Increased from 0.8/0.6 to 0.9/0.7
              }
            } else {
              // Normal state with minimal noise
              value += (Math.random() - 0.5) * 0.15; // Increased from 0.1 to 0.15 for more visible fluctuations
            }
            
            // Ensure value stays within bounds
            value = Math.max(0, Math.min(1, value));
            
            newData.push(value);
            if (newData.length > maxDataPoints) {
              newData.shift();
            }
            return newData;
          });
        }
      } catch (error) {
        console.error("Error updating breathing visualization:", error);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isTracking, status]);

  // Enhanced color based on status with better contrast - avoid black colors
  const getStatusColor = () => {
    switch (status) {
      case "warning":
        return "rgb(245, 158, 11)"; // Amber
      case "danger":
        return "rgb(220, 38, 38)"; // Increased intensity red
      default:
        return "rgb(59, 130, 246)"; // Blue
    }
  };

  // Background color based on status for better visual indication - avoid black colors
  const getBackgroundColor = () => {
    switch (status) {
      case "warning":
        return "bg-amber-100/30 dark:bg-amber-900/20"; // Light amber background
      case "danger":
        return "bg-red-100/30 dark:bg-red-900/20"; // Light red background
      default:
        return "bg-blue-100/20 dark:bg-blue-900/10"; // Changed from bg-secondary/50 to blue tints
    }
  };

  return (
    <div className={`w-full h-40 md:h-56 rounded-2xl overflow-hidden transition-colors duration-300 ${getBackgroundColor()}`}>
      <AnimatePresence>
        {isTracking ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex items-end p-4"
          >
            {breathingData.map((value, index) => (
              <motion.div
                key={index}
                className="h-full w-full max-w-[6px] mx-[1px] rounded-t-full"
                style={{
                  backgroundColor: getStatusColor(),
                  opacity: 0.7 + (index / breathingData.length) * 0.3,
                }}
                initial={{ height: 0 }}
                animate={{ 
                  height: `${value * 100}%`,
                  // Add stronger glow effect for better visibility, especially in danger status
                  boxShadow: status === "danger" 
                    ? `0 0 12px 2px ${getStatusColor()}` 
                    : status === "warning" 
                      ? `0 0 8px 1px ${getStatusColor()}` 
                      : "none"
                }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full h-full flex flex-col items-center justify-center text-muted-foreground space-y-2"
          >
            <div className="text-4xl">😴</div>
            <div className="text-sm">Start tracking to see your breathing pattern</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BreathingVisualizer;
