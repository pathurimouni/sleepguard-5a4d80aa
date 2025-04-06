import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle } from "lucide-react";
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
  generateTestApneaEvent,
  setSensitivity
} from "@/utils/apneaDetection";
import { uploadBreathingRecording, uploadLiveRecording } from "@/utils/recordingService";
import { getCurrentUser } from "@/utils/auth";

export const useTrackingSession = () => {
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
  const [shouldRedirect, setShouldRedirect] = useState(false);
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
      settings.schedule = settings.schedule || {};
      settings.schedule.weekdays = [true, true, true, true, true, true, true];
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
    
    const startTimeString = settings.schedule?.startTime || "22:00";
    const endTimeString = settings.schedule?.endTime || "07:00";
    
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
          // Try multiple approaches to ensure microphone access works
          await navigator.mediaDevices.getUserMedia({ audio: true });
          
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
          
          // Try a simpler microphone request as a fallback
          try {
            const simpleStream = await navigator.mediaDevices.getUserMedia({ 
              audio: true 
            });
            setMicPermission(true);
            
            const recorder = new MediaRecorder(simpleStream);
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
          } catch (fallbackError) {
            console.error("Fallback microphone access also failed:", fallbackError);
            setMicPermission(false);
            setDetectionMode("simulation");
          }
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
          // Try to start listening with multiple retries for improved microphone access
          let retries = 0;
          let started = false;
          
          while (retries < 5 && !started) {
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
            }, 800); // Reduced for more responsive detection
          } else {
            setMicPermission(false);
            setDetectionMode("simulation");
            toast("Microphone access issues", {
              description: "Falling back to simulation mode. Check browser permissions.",
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
    if (!result || result.nonBreathingNoise) {
      setApneaStatus("normal");
      return;
    }
    
    if (result.detectedSounds) {
      const newEvent = {
        timestamp: Date.now(),
        type: "normal" as "snoring" | "coughing" | "gasping" | "pausedBreathing" | "normal"
      };
      
      // Only track meaningful events - focus on apnea indicators
      if (result.detectedSounds.pausedBreathing) {
        newEvent.type = "pausedBreathing";
        setDetectedSoundEvents(prev => {
          const newEvents = [...prev, newEvent];
          if (newEvents.length > 10) {
            return newEvents.slice(-10);
          }
          return newEvents;
        });
      } else if (result.detectedSounds.gasping) {
        newEvent.type = "gasping";
        setDetectedSoundEvents(prev => {
          const newEvents = [...prev, newEvent];
          if (newEvents.length > 10) {
            return newEvents.slice(-10);
          }
          return newEvents;
        });
      }
    }
    
    if (result.isApnea || result.confidence > 0.30) {
      handleApneaEvent(result.pattern === "missing" ? "severe" : "moderate", result.detectedSounds);
    } else if (result.confidence > 0.15) {
      setApneaStatus("warning");
      
      // Only show apnea-related alerts, not other sound notifications
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
      
      if (navigator.vibrate && settings.alertTypes?.vibration) {
        navigator.vibrate(severity === "severe" ? [200, 100, 200, 100, 200] : [100, 50, 100, 50, 100]);
      }
      
      // Create alert sound
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
      setShouldRedirect(false);
      
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
          setIsUploading(true);
          saveRecordingToSupabase(completedSession);
          
          setCurrentSession(null);
          setIsTracking(false);
          setIsScheduled(false);
          setDetectedSoundEvents([]);
          toast.success("Sleep tracking completed and saved");
          setShouldRedirect(true);
        }
      }
    } catch (error) {
      console.error("Error stopping tracking:", error);
      toast.error("Failed to stop tracking");
      setIsUploading(false);
    }
  };

  const saveRecordingToSupabase = async (session: SleepSession) => {
    if (!recordingData) {
      setIsUploading(false);
      return;
    }
    
    try {
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

  // Effect to handle delayed navigation
  useEffect(() => {
    if (shouldRedirect) {
      // Wait a moment for any processing to complete
      const redirectTimer = setTimeout(() => {
        navigate("/");
      }, 1500);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [shouldRedirect, navigate]);

  return {
    isTracking,
    currentSession,
    elapsedTime,
    apneaStatus,
    currentEvents,
    detectionMode,
    setDetectionMode,
    micPermission,
    setMicPermission,
    isScheduled,
    isRecordingUploadable,
    isUploading,
    recordingData,
    detectedSoundEvents,
    mediaRecorder,
    startTracking,
    stopTracking,
    initializeDetectionSystem,
  };
};
