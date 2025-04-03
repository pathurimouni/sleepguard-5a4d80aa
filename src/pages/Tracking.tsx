
import React, { useState, useEffect, useRef } from "react";
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
  getUserSettings,
  defaultSettings
} from "@/utils/storage";
import {
  initializeDetection,
  startListening,
  stopListening,
  startContinuousDetection,
  AudioAnalysisResult,
  generateTestApneaEvent,
  setSensitivity
} from "@/utils/apneaDetection";
import { uploadBreathingRecording, uploadLiveRecording } from "@/utils/recordingService";
import { getCurrentUser } from "@/utils/auth";
import { supabase } from "@/integrations/supabase/client";

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
  const [isRecordingUploadable, setIsRecordingUploadable] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingData, setRecordingData] = useState<Blob | null>(null);
  const [detectedSoundEvents, setDetectedSoundEvents] = useState<Array<{
    timestamp: number;
    type: "snoring" | "coughing" | "gasping" | "pausedBreathing" | "normal";
  }>>([]);

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      setCurrentSession(session);
      setIsTracking(true);
      setCurrentEvents(session.apneaEvents.length);
      
      const settings = getUserSettings();
      setSensitivity(settings.sensitivity);
      
      initializeDetectionSystem();
    } else {
      checkAutoSchedule();
    }
  }, []);

  useEffect(() => {
    const settings = getUserSettings();
    setSensitivity(settings.sensitivity);
    
    if (settings.detectionMode === "auto") {
      const checkInterval = setInterval(() => {
        checkAutoSchedule();
      }, 60000);
      
      return () => clearInterval(checkInterval);
    }
  }, []);

  const checkAutoSchedule = () => {
    const settings = getUserSettings();
    
    if (settings.detectionMode !== "auto") return;
    
    if (!settings.schedule || !Array.isArray(settings.schedule.weekdays) || settings.schedule.weekdays.length !== 7) {
      console.error("Invalid weekdays array, using defaults");
      settings.schedule = defaultSettings.schedule;
    }
    
    const now = new Date();
    const currentDay = now.getDay();
    
    if (!settings.schedule.weekdays[currentDay]) {
      if (isTracking && isScheduled) {
        stopTracking();
      }
      return;
    }
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startTimeString = settings.schedule.startTime || defaultSettings.schedule.startTime;
    const endTimeString = settings.schedule.endTime || defaultSettings.schedule.endTime;
    
    const [startHours, startMinutes] = startTimeString.split(':').map(Number);
    const startTimeMinutes = startHours * 60 + startMinutes;
    
    const [endHours, endMinutes] = endTimeString.split(':').map(Number);
    const endTimeMinutes = endHours * 60 + endMinutes;
    
    const isOvernightSchedule = endTimeMinutes < startTimeMinutes;
    
    const isWithinSchedule = isOvernightSchedule
      ? (currentTime >= startTimeMinutes || currentTime <= endTimeMinutes)
      : (currentTime >= startTimeMinutes && currentTime <= endTimeMinutes);
    
    if (isWithinSchedule && !isTracking) {
      startTracking(true);
    } else if (!isWithinSchedule && isTracking && isScheduled) {
      stopTracking();
    }
  };

  const initializeDetectionSystem = async () => {
    try {
      const settings = getUserSettings();
      setSensitivity(settings.sensitivity);
      
      const initialized = await initializeDetection();
      if (initialized) {
        console.log("Detection system initialized successfully");
        
        try {
          // Request microphone with explicit permissions and optimal settings
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 48000,
              channelCount: 1
            } 
          });
          
          const recorder = new MediaRecorder(stream, { 
            mimeType: 'audio/webm',
            audioBitsPerSecond: 128000
          });
          
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              setAudioChunks((current) => [...current, e.data]);
            }
          };
          
          recorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            setRecordingData(audioBlob);
            setIsRecordingUploadable(true);
            setAudioChunks([]);
          };
          
          setMediaRecorder(recorder);
          setMicPermission(true);
        } catch (error) {
          console.error("Error setting up audio recording:", error);
          setMicPermission(false);
          setDetectionMode("simulation");
        }
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

  useEffect(() => {
    if (!isTracking) return;

    const setupRealTimeDetection = async () => {
      try {
        if (detectionMode === "real") {
          // Try to start listening with retries for improved microphone access
          let retries = 0;
          let started = false;
          
          while (retries < 3 && !started) {
            started = await startListening();
            if (!started) {
              console.log(`Attempt ${retries + 1} to access microphone failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 500));
              retries++;
            }
          }
          
          if (started) {
            setMicPermission(true);
            
            if (mediaRecorder && mediaRecorder.state !== 'recording') {
              setAudioChunks([]);
              mediaRecorder.start(1000);
            }
            
            startContinuousDetection((result) => {
              handleDetectionResult(result);
            }, 1200); // Slightly reduced for more responsive detection
          } else {
            setMicPermission(false);
            setDetectionMode("simulation");
            toast("Microphone access denied", {
              description: "Falling back to simulation mode",
              icon: <AlertTriangle className="h-4 w-4" />,
            });
            
            // Start simulation mode since real detection failed
            const simulationInterval = setInterval(() => {
              const result = generateTestApneaEvent();
              handleDetectionResult(result);
            }, 1500);
            
            return () => clearInterval(simulationInterval);
          }
        } else {
          const simulationInterval = setInterval(() => {
            const result = generateTestApneaEvent();
            handleDetectionResult(result);
          }, 1500);
          
          return () => clearInterval(simulationInterval);
        }
      } catch (error) {
        console.error("Error in real-time detection:", error);
        setDetectionMode("simulation");
      }
    };
    
    setupRealTimeDetection();
    
    return () => {
      if (detectionMode === "real") {
        stopListening();
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }
    };
  }, [isTracking, detectionMode, mediaRecorder]);

  const handleDetectionResult = (result: AudioAnalysisResult) => {
    if (result.nonBreathingNoise) {
      setApneaStatus("normal");
      // No toast notification for ambient noise
      return;
    }
    
    if (result.detectedSounds) {
      const newEvent = {
        timestamp: Date.now(),
        type: "normal" as "snoring" | "coughing" | "gasping" | "pausedBreathing" | "normal"
      };
      
      if (result.detectedSounds.pausedBreathing) {
        newEvent.type = "pausedBreathing";
      } else if (result.detectedSounds.snoring) {
        newEvent.type = "snoring";
      } else if (result.detectedSounds.gasping) {
        newEvent.type = "gasping";
      } else if (result.detectedSounds.coughing) {
        newEvent.type = "coughing";
      }
      
      if (newEvent.type !== "normal" || result.confidence > 0.3) {
        setDetectedSoundEvents(prev => {
          const newEvents = [...prev, newEvent];
          if (newEvents.length > 10) {
            return newEvents.slice(-10);
          }
          return newEvents;
        });
      }
    }
    
    if (result.isApnea || result.confidence > 0.35) {
      handleApneaEvent(result.pattern === "missing" ? "severe" : "moderate", result.detectedSounds);
    } else if (result.confidence > 0.20) {
      setApneaStatus("warning");
      
      // Only show apnea-related alerts, not sound notifications
      if (result.pattern === "interrupted") {
        toast.info(
          <div className="flex flex-col">
            <span className="font-medium">Irregular Breathing</span>
            <span className="text-sm">
              Possible breathing irregularity detected
            </span>
          </div>,
          { duration: 3000 }
        );
      }
      
      setTimeout(() => setApneaStatus("normal"), 3000);
    }
  };

  const handleApneaEvent = (severity: "mild" | "moderate" | "severe", detectedSounds?: any) => {
    setApneaStatus(severity === "mild" ? "warning" : "danger");
    setCurrentEvents((prev) => prev + 1);
    
    if (severity === "moderate" || severity === "severe") {
      const settings = getUserSettings();
      
      let eventMessage = "Abnormal breathing pattern detected";
      if (detectedSounds) {
        if (detectedSounds.pausedBreathing) eventMessage = "Breathing pause detected";
        else if (detectedSounds.gasping) eventMessage = "Gasping detected";
      }
      
      toast(
        <div className="flex flex-col">
          <span className="font-medium">Apnea Event Detected</span>
          <span className="text-sm">{eventMessage}</span>
        </div>,
        {
          icon: <AlertTriangle className="text-amber-500" />,
          duration: 5000,
          position: "top-center",
        }
      );
      
      if (navigator.vibrate && settings.alertTypes.vibration) {
        navigator.vibrate(severity === "severe" ? [200, 100, 200, 100, 200] : [100, 50, 100, 50, 100]);
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const oscillator1 = audioContext.createOscillator();
      oscillator1.type = "sine";
      oscillator1.frequency.setValueAtTime(severity === "severe" ? 880 : 660, audioContext.currentTime);
      
      const oscillator2 = audioContext.createOscillator();
      oscillator2.type = "triangle";
      oscillator2.frequency.setValueAtTime(severity === "severe" ? 440 : 330, audioContext.currentTime);
      
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.start();
      oscillator2.start();
      oscillator1.stop(audioContext.currentTime + 0.7);
      oscillator2.stop(audioContext.currentTime + 0.7);
    }
    
    addApneaEvent({
      timestamp: new Date(),
      duration: Math.floor(Math.random() * 10) + 5,
      type: detectedSounds?.pausedBreathing ? "breathing_pause" : 
            detectedSounds?.gasping ? "breathing_pause" : "movement",
      severity,
    });
    
    setTimeout(() => {
      setApneaStatus("normal");
    }, 5000);
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
      setIsRecordingUploadable(false);
      setRecordingData(null);
      setDetectedSoundEvents([]);
      
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
        if (detectionMode === "real") {
          stopListening();
          
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }
        
        const completedSession = endCurrentSession();
        if (completedSession) {
          saveRecordingToSupabase(completedSession);
          
          setCurrentSession(null);
          setIsTracking(false);
          setIsScheduled(false);
          setDetectedSoundEvents([]);
          toast.success("Sleep tracking completed and saved");
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Error stopping tracking:", error);
      toast.error("Failed to stop tracking");
    }
  };

  const saveRecordingToSupabase = async (session: SleepSession) => {
    if (!recordingData) return;
    
    try {
      setIsUploading(true);
      
      const user = await getCurrentUser();
      if (!user) {
        toast.error("You must be logged in to save recordings");
        setIsUploading(false);
        return;
      }
      
      const duration = Math.floor(session.duration || 0);
      
      let recordingPromise;
      
      if (session.apneaEvents.length > 0) {
        const fileName = `sleep-recording-${new Date().toISOString()}.webm`;
        const file = new File([recordingData], fileName, { type: 'audio/webm' });
        recordingPromise = uploadBreathingRecording(user.id, file, duration, (progress) => {
          console.log(`Upload progress: ${progress}%`);
        });
      } else {
        const fileName = `live-recording-${new Date().toISOString()}.webm`;
        const file = new File([recordingData], fileName, { type: 'audio/webm' });
        recordingPromise = uploadLiveRecording(user.id, file, duration, (progress) => {
          console.log(`Upload progress: ${progress}%`);
        });
      }
      
      const result = await recordingPromise;
      
      if (result) {
        toast.success("Recording uploaded successfully for analysis");
        console.log("Recording saved:", result);
      } else {
        toast.error("Failed to upload recording");
      }
    } catch (error) {
      console.error("Error saving recording:", error);
      toast.error("Error saving recording");
    } finally {
      setIsUploading(false);
    }
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

              <BreathingVisualizer 
                isTracking={isTracking} 
                status={apneaStatus} 
                detectedEvents={detectedSoundEvents}
              />

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
                  <AlertTriangle size={14} />
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
