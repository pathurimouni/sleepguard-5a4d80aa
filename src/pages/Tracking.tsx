
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Moon, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import ActionButton from "@/components/ActionButton";
import BreathingVisualizer from "@/components/BreathingVisualizer";
import { 
  startNewSession, 
  getCurrentSession, 
  endCurrentSession,
  addApneaEvent,
  SleepSession
} from "@/utils/storage";

const Tracking = () => {
  const navigate = useNavigate();
  const [isTracking, setIsTracking] = useState(false);
  const [currentSession, setCurrentSession] = useState<SleepSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [apneaStatus, setApneaStatus] = useState<"normal" | "warning" | "danger">("normal");
  const [currentEvents, setCurrentEvents] = useState<number>(0);

  // Check if there's an active session on load
  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      setCurrentSession(session);
      setIsTracking(true);
      setCurrentEvents(session.apneaEvents.length);
    }
  }, []);

  // Update elapsed time for active session
  useEffect(() => {
    if (!isTracking || !currentSession) return;

    const intervalId = setInterval(() => {
      const startTime = currentSession.startTime.getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);

      // Simulate random apnea events for demonstration
      const random = Math.random();
      if (random < 0.005) {
        simulateApneaEvent("moderate");
      } else if (random < 0.03) {
        setApneaStatus("warning");
        setTimeout(() => setApneaStatus("normal"), 3000);
      } else if (random < 0.001) {
        simulateApneaEvent("severe");
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isTracking, currentSession]);

  const startTracking = () => {
    try {
      const session = startNewSession();
      setCurrentSession(session);
      setIsTracking(true);
      setElapsedTime(0);
      setCurrentEvents(0);
      setApneaStatus("normal");
      toast.success("Sleep tracking started");
    } catch (error) {
      console.error("Error starting tracking:", error);
      toast.error("Failed to start tracking");
    }
  };

  const stopTracking = () => {
    try {
      if (currentSession) {
        const completedSession = endCurrentSession();
        if (completedSession) {
          setCurrentSession(null);
          setIsTracking(false);
          toast.success("Sleep tracking completed and saved");
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Error stopping tracking:", error);
      toast.error("Failed to stop tracking");
    }
  };

  const simulateApneaEvent = (severity: "mild" | "moderate" | "severe") => {
    // Update UI first
    setApneaStatus(severity === "mild" ? "warning" : "danger");
    setCurrentEvents((prev) => prev + 1);
    
    // Show alert
    if (severity === "moderate" || severity === "severe") {
      toast(
        <div className="flex flex-col">
          <span className="font-medium">Apnea Event Detected</span>
          <span className="text-sm">Abnormal breathing pattern detected</span>
        </div>,
        {
          icon: <AlertTriangle className="text-amber-500" />,
          duration: 5000,
          position: "top-center",
        }
      );
      
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(severity === "severe" ? [200, 100, 200] : [100, 50, 100]);
      }
    }
    
    // Add to storage
    addApneaEvent({
      timestamp: new Date(),
      duration: Math.floor(Math.random() * 10) + 5, // 5-15 seconds
      type: Math.random() > 0.7 ? "movement" : "breathing_pause",
      severity,
    });
    
    // Reset status after delay
    setTimeout(() => {
      setApneaStatus("normal");
    }, 5000);
  };

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const format = (val: number) => val.toString().padStart(2, "0");
    return `${format(hours)}:${format(minutes)}:${format(secs)}`;
  };

  return (
    <PageTransition>
      <div className="page-container pt-8 md:pt-24 pb-24">
        <div className="page-content">
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold mb-2"
            >
              Sleep Tracking
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Monitor your breathing patterns in real-time
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6 mb-6"
          >
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
                      <span>Tracking</span>
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

              <BreathingVisualizer isTracking={isTracking} status={apneaStatus} />

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
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center space-x-4"
          >
            {isTracking ? (
              <ActionButton
                variant="destructive"
                size="lg"
                onClick={stopTracking}
                icon={<Pause size={18} />}
              >
                Stop Tracking
              </ActionButton>
            ) : (
              <ActionButton
                variant="primary"
                size="lg"
                onClick={startTracking}
                icon={<Play size={18} />}
              >
                Start Tracking
              </ActionButton>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            <p>Place your device nearby while you sleep</p>
            <p>The microphone will be used to detect breathing patterns</p>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Tracking;
