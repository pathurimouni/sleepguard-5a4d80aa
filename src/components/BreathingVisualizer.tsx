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
  const updateInterval = 100; // ms

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
            // Take the average of the current audio data
            const value = currentData.reduce((sum, val) => sum + val, 0) / currentData.length;
            newData.push(value);
            
            // Keep only the most recent data points
            if (newData.length > maxDataPoints) {
              newData.shift();
            }
            return newData;
          });
        } else {
          // If no data, simulate breathing pattern as fallback
          setBreathingData((current) => {
            const newData = [...current];
            const normalPattern = Math.sin(Date.now() / 2000) * 0.5 + 0.5;
            
            // Add some randomness and potential anomalies based on status
            let value = normalPattern;
            if (status === "warning") {
              // Occasionally add irregularities for warning state
              value += (Math.random() - 0.5) * 0.3;
            } else if (status === "danger") {
              // More severe irregularities for danger state
              value = Math.random() < 0.2 ? 0.1 : normalPattern + (Math.random() - 0.5) * 0.5;
            } else {
              // Normal state with minimal noise
              value += (Math.random() - 0.5) * 0.1;
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

  const getStatusColor = () => {
    switch (status) {
      case "warning":
        return "rgb(245, 158, 11)"; // Amber
      case "danger":
        return "rgb(239, 68, 68)"; // Red
      default:
        return "rgb(59, 130, 246)"; // Blue
    }
  };

  return (
    <div className="w-full h-40 md:h-56 bg-secondary/50 rounded-2xl overflow-hidden">
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
                animate={{ height: `${value * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
