
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Circle } from "lucide-react";
import { getCurrentBreathingData } from "@/utils/apneaDetection";

interface BreathingVisualizerProps {
  isTracking: boolean;
  status?: "normal" | "warning" | "danger";
  detectedEvents?: {
    timestamp: number;
    type: "snoring" | "coughing" | "gasping" | "pausedBreathing" | "normal";
  }[];
}

const BreathingVisualizer: React.FC<BreathingVisualizerProps> = ({
  isTracking,
  status = "normal",
  detectedEvents = []
}) => {
  const [breathingData, setBreathingData] = useState<number[]>([]);
  const [eventMarkers, setEventMarkers] = useState<{
    index: number;
    type: string;
    color: string;
  }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxDataPoints = 120; // Increased for more detailed view
  const updateInterval = 40; // ms - reduced further for smoother visualization

  useEffect(() => {
    if (!isTracking) {
      setBreathingData([]);
      setEventMarkers([]);
      return;
    }

    // Update event markers when detected events change
    if (detectedEvents.length > 0) {
      const newMarkers = detectedEvents.map((event, idx) => {
        let color = "rgba(59, 130, 246, 0.8)"; // Default blue
        
        switch (event.type) {
          case "snoring":
            color = "rgba(245, 158, 11, 0.8)"; // Amber
            break;
          case "pausedBreathing":
            color = "rgba(220, 38, 38, 0.8)"; // Red
            break;
          case "gasping":
            color = "rgba(239, 68, 68, 0.8)"; // Red
            break;
          case "coughing":
            color = "rgba(16, 185, 129, 0.8)"; // Green
            break;
        }
        
        return {
          index: Math.max(0, breathingData.length - 5 - idx * 3), // Space out markers
          type: event.type,
          color: color
        };
      });
      
      setEventMarkers(newMarkers);
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
            const amplifiedValue = Math.min(1, value * 1.5); // Increased amplification
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
              value += (Math.random() - 0.5) * 0.6; // Increased from 0.5 to 0.6
              // Occasionally add brief pauses (lower values)
              if (Math.random() < 0.25) {
                value *= Math.random() * 0.5; // Reduced for more noticeable pauses
              }
            } else if (status === "danger") {
              // More severe irregularities for danger state
              if (Math.random() < 0.4) { // Increased from 0.35 to 0.4
                // Simulate apnea (near zero breathing)
                value = Math.random() * 0.1; // Reduced from 0.15 to 0.1 for more extreme lows
              } else {
                // Simulate gasping (sharp peaks)
                value = normalPattern * (1 + Math.random() * 1.2) + (Math.random() - 0.5) * 0.8; // Increased variation
              }
            } else {
              // Normal state with minimal noise
              value += (Math.random() - 0.5) * 0.18; // Increased from 0.15 to 0.18 for more visible fluctuations
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
  }, [isTracking, status, detectedEvents]);

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

  // Visualize the waveform with a smoother, more professional look
  const renderWaveform = () => {
    return (
      <div className="relative w-full h-full flex items-end p-2">
        {/* Advanced waveform design for better visualization */}
        {breathingData.map((value, index) => {
          // Calculate opacity based on position - more recent points are more visible
          const opacity = 0.7 + (index / breathingData.length) * 0.3;
          
          // Check if there's a detected event at this position
          const event = eventMarkers.find(marker => marker.index === index);
          
          // Determine bar color based on events or status
          let barColor = getStatusColor();
          let glowEffect = '';
          
          if (event) {
            barColor = event.color;
            glowEffect = `shadow-lg shadow-${event.color}`;
          }
          
          return (
            <div 
              key={index} 
              className="relative h-full mx-[1px]"
              style={{ width: `${100 / maxDataPoints}%`, minWidth: '2px', maxWidth: '6px' }}
            >
              <motion.div
                className="absolute bottom-0 w-full rounded-t-full"
                style={{
                  backgroundColor: barColor,
                  opacity: opacity,
                  boxShadow: event ? `0 0 8px 2px ${barColor}` : (
                    status === "danger" ? `0 0 8px 1px ${barColor}` : 
                    status === "warning" ? `0 0 4px 1px ${barColor}` : 'none'
                  )
                }}
                initial={{ height: 0 }}
                animate={{ 
                  height: `${value * 100}%`
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 20, 
                  mass: 0.5 // Adjusted for more responsive motion
                }}
              />
              
              {/* Add dot markers for detected events */}
              {event && (
                <div 
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 animate-pulse"
                  title={event.type}
                >
                  <Circle 
                    size={10} 
                    fill={event.color} 
                    color="white" 
                    className="stroke-2" 
                  />
                </div>
              )}
            </div>
          );
        })}
        
        {/* Add a subtle curve that connects all data points for a smoother appearance */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getStatusColor()} stopOpacity="0.7" />
              <stop offset="100%" stopColor={getStatusColor()} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {breathingData.length > 0 && (
            <path
              d={`
                M 0,${(1 - breathingData[0]) * 100}
                ${breathingData.map((value, index) => {
                  const x = (index / (breathingData.length - 1)) * 100;
                  const y = (1 - value) * 100;
                  return `L ${x},${y}`;
                }).join(' ')}
                L 100,${(1 - breathingData[breathingData.length - 1]) * 100}
                L 100,100 L 0,100 Z
              `}
              fill="url(#gradient)"
              className="opacity-30"
            />
          )}
        </svg>
      </div>
    );
  };

  return (
    <div className={`w-full h-40 md:h-56 rounded-2xl overflow-hidden transition-colors duration-300 ${getBackgroundColor()}`}>
      <AnimatePresence mode="wait">
        {isTracking ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
            ref={containerRef}
          >
            {renderWaveform()}
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
