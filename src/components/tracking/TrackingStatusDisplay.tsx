
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, Moon, Calendar, RefreshCw, MicOff } from "lucide-react";

interface TrackingStatusDisplayProps {
  elapsedTime: number;
  isTracking: boolean;
  isScheduled: boolean;
  currentEvents: number;
  micPermission: boolean | null;
  detectionMode: "real" | "simulation";
  isUploading: boolean;
}

const TrackingStatusDisplay: React.FC<TrackingStatusDisplayProps> = ({
  elapsedTime,
  isTracking,
  isScheduled,
  currentEvents,
  micPermission,
  detectionMode,
  isUploading
}) => {
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const format = (val: number) => val.toString().padStart(2, "0");
    return `${format(hours)}:${format(minutes)}:${format(secs)}`;
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Clock size={20} className="text-muted-foreground" />
          <div className="text-xl font-mono">{formatElapsedTime(elapsedTime)}</div>
        </div>
        <AnimatePresence mode="wait">
          {isTracking ? (
            <motion.div
              key="tracking-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>{isScheduled ? "Auto Tracking" : "Tracking"}</span>
            </motion.div>
          ) : (
            <motion.div
              key="inactive-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
            >
              Inactive
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <AlertTriangle 
            size={20} 
            className={currentEvents > 0 ? "text-amber-500" : "text-muted-foreground"} 
          />
          <div className="text-sm font-medium">
            {currentEvents} {currentEvents === 1 ? "event" : "events"} detected
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Moon size={20} className="text-muted-foreground" />
          <div className="text-sm font-medium">
            Sleep quality: {currentEvents > 5 ? "Poor" : currentEvents > 0 ? "Fair" : "Good"}
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="flex justify-center items-center space-x-2 text-xs">
          <RefreshCw size={14} className="animate-spin text-primary" />
          <span className="text-primary">Saving recording...</span>
        </div>
      )}

      {isScheduled && (
        <div className="flex items-center justify-center space-x-2 text-xs text-blue-500">
          <Calendar size={14} />
          <span>Running on auto schedule</span>
        </div>
      )}

      {micPermission === false && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="text-amber-500 text-sm text-center flex items-center justify-center space-x-2"
        >
          <MicOff size={14} />
          <span>Microphone access denied. Using simulation mode.</span>
        </motion.div>
      )}

      {detectionMode === "simulation" && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="text-blue-500 text-xs text-center"
        >
          Running in simulation mode (for demonstration purposes)
        </motion.div>
      )}
    </div>
  );
};

export default TrackingStatusDisplay;
