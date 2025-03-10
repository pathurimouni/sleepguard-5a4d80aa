import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Moon, Clock, RefreshCw, AlertTriangle, Calendar } from "lucide-react";
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
  SleepSession,
  getUserSettings
} from "@/utils/storage";
import {
  initializeDetection,
  startListening,
  stopListening,
  startContinuousDetection,
  AudioAnalysisResult,
  generateTestApneaEvent
} from "@/utils/apneaDetection";

const Tracking = () => {
  const navigate = useNavigate();
  const [isTracking, setIsTracking] = useState(false);
  const [currentSession, setCurrentSession] = useState<SleepSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [apneaStatus, setApneaStatus] = useState<"normal" | "warning" | "danger">("normal");
  const [currentEvents, setCurrentEvents] = useState<number>(0);
  const [detectionMode, setDetectionMode] = useState<"real" | "simulation">("real");
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);

  // Check if there's an active session on load
  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      setCurrentSession(session);
      setIsTracking(true);
      setCurrentEvents(session.apneaEvents.length);
      
      // Try to initialize the detection system
      initializeDetectionSystem();
    } else {
      // Check if auto mode is enabled and should start now
      checkAutoSchedule();
    }
  }, []);

  // Check auto schedule on regular intervals
  useEffect(() => {
    const settings = getUserSettings();
    if (settings.detectionMode === "auto") {
      const checkInterval = setInterval(() => {
        checkAutoSchedule();
      }, 60000); // Check every minute
      
      return () => clearInterval(checkInterval);
    }
  }, []);

  // Check if we should start or stop tracking based on schedule
  const checkAutoSchedule = () => {
    const settings = getUserSettings();
    
    if (settings.detectionMode !== "auto") return;
    
    const now = new Date();
    const currentDay = now.getDay(); // 0-6, Sunday to Saturday
    
    // Check if today is a scheduled day
    if (!settings.schedule.weekdays[currentDay]) {
      if (isTracking && isScheduled) {
        // Stop tracking if it was started by schedule
        stopTracking();
      }
      return;
    }
    
    // Parse time strings to compare
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHours, startMinutes] = settings.schedule.startTime.split(':').map(Number);
    const startTimeMinutes = startHours * 60 + startMinutes;
    
    const [endHours, endMinutes] = settings.schedule.endTime.split(':').map(Number);
    const endTimeMinutes = endHours * 60 + endMinutes;
    
    // Handle overnight schedules (end time is on the next day)
    const isOvernightSchedule = endTimeMinutes < startTimeMinutes;
    
    // Check if current time is within schedule
    const isWithinSchedule = isOvernightSchedule
      ? (currentTime >= startTimeMinutes || currentTime <= endTimeMinutes)
      : (currentTime >= startTimeMinutes && currentTime <= endTimeMinutes);
    
    if (isWithinSchedule && !isTracking) {
      // Start tracking if within schedule and not already tracking
      startTracking(true);
    } else if (!isWithinSchedule && isTracking && isScheduled) {
      // Stop tracking if outside schedule and currently tracking due to schedule
      stopTracking();
    }
  };

  // Initialize detection system
  const initializeDetectionSystem = async () => {
    try {
      const initialized = await initializeDetection();
      if (initialized) {
        console.log("Detection system initialized successfully");
      } else {
        console.log("Falling back to simulation mode");
        setDetectionMode("simulation");
        toast("Using simulation mode", {
          description: "Could not initialize the detection system. Using simulated data instead.",
          icon: <RefreshCw className="h-4 w-4" />,
        });
      }
    } catch (error) {
      console.error("Error initializing detection:", error);
      setDetectionMode("simulation");
    }
  };

  // Update elapsed time for active session
  useEffect(() => {
    if (!isTracking || !currentSession) return;

    const intervalId = setInterval(() => {
      const startTime = currentSession.startTime.getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isTracking, currentSession]);

  // Handle real-time detection when tracking
  useEffect(() => {
    if (!isTracking) return;

    const setupRealTimeDetection = async () => {
      try {
        // Check if we're using real or simulation mode
        if (detectionMode === "real") {
          // Start listening to the microphone
          const started = await startListening();
          if (started) {
            setMicPermission(true);
            // Start the continuous detection
            startContinuousDetection((result) => {
              handleDetectionResult(result);
            }, 2000); // Check every 2 seconds
          } else {
            setMicPermission(false);
            // Fallback to simulation
            setDetectionMode("simulation");
            toast("Microphone access denied", {
              description: "Falling back to simulation mode",
              icon: <AlertTriangle className="h-4 w-4" />,
            });
          }
        } else {
          // Simulation mode
          const simulationInterval = setInterval(() => {
            const result = generateTestApneaEvent();
            handleDetectionResult(result);
          }, 2000);
          
          return () => clearInterval(simulationInterval);
        }
      } catch (error) {
        console.error("Error in real-time detection:", error);
        // Fallback to simulation in case of error
        setDetectionMode("simulation");
      }
    };
    
    setupRealTimeDetection();
    
    // Cleanup
    return () => {
      if (detectionMode === "real") {
        stopListening();
      }
    };
  }, [isTracking, detectionMode]);

  // Handle detection results (from real detection or simulation)
  const handleDetectionResult = (result: AudioAnalysisResult) => {
    if (result.isApnea) {
      // Definite apnea detected
      handleApneaEvent(result.pattern === "missing" ? "severe" : "moderate");
    } else if (result.confidence > 0.5) {
      // Potential apnea (warning)
      setApneaStatus("warning");
      setTimeout(() => setApneaStatus("normal"), 3000);
    }
  };

  const startTracking = async (fromSchedule = false) => {
    try {
      await initializeDetectionSystem();
      
      const session = startNewSession();
      setCurrentSession(session);
      setIsTracking(true);
      setElapsedTime(0);
      setCurrentEvents(0);
      setApneaStatus("normal");
      setIsScheduled(fromSchedule);
      
      if (fromSchedule) {
        toast.success("Scheduled sleep tracking started");
      } else {
        toast.success("Sleep tracking started");
      }
    } catch (error) {
      console.error("Error starting tracking:", error);
      toast.error("Failed to start tracking");
    }
  };

  const stopTracking = () => {
    try {
      if (currentSession) {
        // Stop real-time detection
        if (detectionMode === "real") {
          stopListening();
        }
        
        const completedSession = endCurrentSession();
        if (completedSession) {
          setCurrentSession(null);
          setIsTracking(false);
          setIsScheduled(false);
          toast.success("Sleep tracking completed and saved");
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Error stopping tracking:", error);
      toast.error("Failed to stop tracking");
    }
  };

  const handleApneaEvent = (severity: "mild" | "moderate" | "severe") => {
    // Update UI first
    setApneaStatus(severity === "mild" ? "warning" : "danger");
    setCurrentEvents((prev) => prev + 1);
    
    // Show alert
    if (severity === "moderate" || severity === "severe") {
      // Get settings to check which alert types to use
      const settings = getUserSettings();
      
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
      
      // Vibrate if supported and enabled in settings
      if (navigator.vibrate && settings.alertTypes.vibration) {
        navigator.vibrate(severity === "severe" ? [200, 100, 200] : [100, 50, 100]);
      }
      
      // Play sound if enabled
      if (settings.alertTypes.sound) {
        // Play a beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(severity === "severe" ? 880 : 660, audioContext.currentTime);
        
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
      }
    }
    
    // Add to storage
    addApneaEvent({
      timestamp: new Date(),
      duration: Math.floor(Math.random() * 10) + 5, // 5-15 seconds
      type: severity === "severe" ? "breathing_pause" : "movement",
      severity,
    });
    
    // Reset status after delay
    setTimeout(() => {
      setApneaStatus("normal");
    }, 5000);
  };

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
                  className="text-amber-500 text-sm text-center"
                >
                  Microphone access denied. Using simulation mode.
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
                onClick={() => startTracking(false)}
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
