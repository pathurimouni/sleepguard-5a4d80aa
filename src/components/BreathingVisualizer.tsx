
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Circle, AlertTriangle } from "lucide-react";
import { getCurrentBreathingData, getRecentDetectionEvents } from "@/utils/apneaDetection";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

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
  const [breathingData, setBreathingData] = useState<{ value: number, index: number }[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxDataPoints = 100; // Number of data points to display
  const updateInterval = 50; // ms - for smoother visualization

  useEffect(() => {
    if (!isTracking) {
      setBreathingData([]);
      setAlertMessage(null);
      return;
    }

    // Get real breathing data when tracking
    const interval = setInterval(() => {
      try {
        // Get current audio data for visualization
        const currentData = getCurrentBreathingData();
        
        // Get recent detection events for enhanced visualization
        const recentEvents = getRecentDetectionEvents();
        
        if (currentData.length > 0) {
          setBreathingData((prevData) => {
            const newData = [...prevData];
            // Take the average of the current audio data with increased sensitivity
            const value = currentData.reduce((sum, val) => sum + val, 0) / currentData.length;
            // Apply amplification factor to make small changes more visible
            const amplifiedValue = Math.min(1, value * 5.0); // Increased amplification for better visibility
            
            newData.push({ value: amplifiedValue, index: prevData.length > 0 ? prevData[prevData.length - 1].index + 1 : 0 });
            
            // Keep only the most recent data points
            if (newData.length > maxDataPoints) {
              newData.shift();
            }
            return newData;
          });
          
          // Check for recent events to highlight in the visualization
          if (recentEvents.length > 0) {
            const latestEvent = recentEvents[recentEvents.length - 1];
            
            // If high confidence apnea event detected, show alert
            if (latestEvent.confidence > 0.50 && (latestEvent.detectedSounds?.pausedBreathing || latestEvent.isApnea)) {
              setAlertMessage("Significant breathing irregularity detected!");
              
              // Clear alert after 5 seconds
              setTimeout(() => setAlertMessage(null), 5000);
            }
          }
        } else {
          // If no data, simulate breathing pattern as fallback with enhanced realism
          setBreathingData((current) => {
            const newData = [...current];
            const normalPattern = Math.sin(Date.now() / 2000) * 0.5 + 0.5;
            
            // Add some randomness and potential anomalies based on status
            let value = normalPattern;
            if (status === "warning") {
              // Create more noticeable irregularities for warning state
              value += (Math.random() - 0.5) * 0.7;
              // Occasionally add brief pauses (lower values)
              if (Math.random() < 0.25) {
                value *= Math.random() * 0.4;
              }
            } else if (status === "danger") {
              // More severe irregularities for danger state
              if (Math.random() < 0.4) {
                // Simulate apnea (near zero breathing)
                value = Math.random() * 0.08;
              } else {
                // Simulate gasping (sharp peaks)
                value = normalPattern * (1 + Math.random() * 1.4) + (Math.random() - 0.5) * 0.9;
              }
            } else {
              // Normal state with minimal noise
              value += (Math.random() - 0.5) * 0.2;
            }
            
            // Ensure value stays within bounds
            value = Math.max(0, Math.min(1, value));
            
            newData.push({ 
              value: value, 
              index: newData.length > 0 ? newData[newData.length - 1].index + 1 : 0 
            });
            
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

  // Enhanced color based on status with better contrast and visual appeal
  const getStatusColor = () => {
    switch (status) {
      case "warning":
        return "rgb(245, 158, 11)"; // Updated amber
      case "danger":
        return "rgb(239, 68, 68)"; // Updated red
      default:
        return "rgb(79, 70, 229)"; // Updated deeper indigo/purple
    }
  };

  // Background color based on status for better visual indication
  const getBackgroundColor = () => {
    switch (status) {
      case "warning":
        return "bg-amber-50/40 dark:bg-amber-900/30"; // Lighter amber background
      case "danger":
        return "bg-red-50/40 dark:bg-red-900/30"; // Lighter red background
      default:
        return "bg-indigo-50/40 dark:bg-indigo-900/20"; // Indigo/purple tints
    }
  };

  // Render a line chart for breathing visualization
  const renderLineChart = () => {
    if (breathingData.length < 2) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-muted-foreground">Gathering breathing data...</div>
        </div>
      );
    }

    // Create threshold lines based on status
    const thresholdValue = status === "danger" ? 0.2 : status === "warning" ? 0.3 : 0.25;
    
    // Find significant apnea events to mark on chart
    const significantEvents = detectedEvents
      .filter(event => event.type === "pausedBreathing" || event.type === "gasping")
      .map(event => {
        // Map timestamp to index position on chart (approximate)
        const eventTime = event.timestamp;
        const currentTime = Date.now();
        const timeAgo = currentTime - eventTime; // ms ago
        const pointsAgo = timeAgo / updateInterval; // numeric value
        const dataLength = breathingData.length;
        const targetIndex = Math.max(0, dataLength - pointsAgo);
        
        return {
          index: Math.floor(targetIndex),
          type: event.type
        };
      })
      .filter(event => event.index >= 0 && event.index < breathingData.length);

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={breathingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
          <XAxis 
            dataKey="index" 
            tick={false} 
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} 
          />
          <YAxis 
            domain={[0, 1]} 
            tick={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} 
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background/95 border border-border p-2 rounded text-xs shadow-md">
                    <p className="font-medium">Breathing intensity: {(payload[0].value as number * 100).toFixed(1)}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
          
          {/* Reference line for apnea threshold */}
          <ReferenceLine 
            y={thresholdValue} 
            stroke={status === "danger" ? "rgba(239, 68, 68, 0.6)" : "rgba(245, 158, 11, 0.6)"} 
            strokeDasharray="3 3" 
            label={{ 
              value: 'Apnea threshold', 
              position: 'insideBottomRight',
              fill: getStatusColor(),
              fontSize: 10
            }} 
          />
          
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={getStatusColor()} 
            strokeWidth={2.5}
            dot={false} 
            isAnimationActive={false}
            activeDot={{ r: 6, fill: getStatusColor(), strokeWidth: 1, stroke: "#fff" }}
            animationDuration={0}
          />
          
          {/* Custom reference lines for detected events */}
          {significantEvents.map((event, idx) => (
            <ReferenceLine 
              key={idx}
              x={breathingData[event.index]?.index}
              stroke={event.type === "pausedBreathing" ? "rgba(239, 68, 68, 0.9)" : "rgba(245, 158, 11, 0.9)"}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className={`w-full h-40 md:h-56 rounded-2xl overflow-hidden transition-colors duration-300 ${getBackgroundColor()} border border-slate-200/30 dark:border-slate-700/30 shadow-sm`}>
      <AnimatePresence mode="wait">
        {isTracking ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
            ref={containerRef}
          >
            {renderLineChart()}
            
            {/* Alert message for significant events */}
            <AnimatePresence>
              {alertMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-4 left-0 right-0 mx-auto w-max bg-red-500 text-white px-4 py-2 rounded-lg flex items-center shadow-lg z-10"
                >
                  <AlertTriangle size={16} className="mr-2" />
                  <span className="text-sm font-semibold">{alertMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
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
