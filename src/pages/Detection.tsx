
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Mic, MicOff, Play, Stop, Download, AlertTriangle, 
  Save, FileText, BarChart2, Loader2, Wand2
} from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import MicPermissionRequest from "@/components/MicPermissionRequest";
import { Card } from "@/components/ui/card";
import BreathingVisualizer from "@/components/BreathingVisualizer";
import { getCurrentUser } from "@/utils/auth";
import { loadModel, detectApnea, createDetectionSession, logDetectionEvent, endDetectionSession, getSessionStats } from "@/utils/cnnModel";
import { preprocessAudio, saveAudioToWav } from "@/utils/audioProcessing";
import { 
  initializeDetection, 
  startListening, 
  stopListening, 
  getAudioComponents,
  setSensitivity
} from "@/utils/apneaDetection/core";

// Interfaces
interface AudioVisualizerProps {
  isRecording: boolean;
  audioData: number[];
}

interface DetectionStats {
  sessionId: string | null;
  totalEvents: number;
  apneaCount: number;
  normalCount: number;
  apneaPercentage: number;
  averageConfidence: number;
  severityScore: number;
  startTime: Date | null;
  elapsedTime: number;
}

interface DetectionEventData {
  id?: string;
  timestamp: Date;
  label: 'apnea' | 'normal';
  confidence: number;
  duration?: number;
}

// Audio Visualizer Component
const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isRecording, audioData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !isRecording) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / audioData.length;
    
    ctx.fillStyle = '#4f46e5';
    
    for (let i = 0; i < audioData.length; i++) {
      const barHeight = audioData[i] * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  }, [isRecording, audioData]);
  
  return (
    <div className="w-full h-24 bg-slate-50 dark:bg-slate-900 rounded-md overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={1000} 
        height={150} 
        className="w-full h-full"
      />
    </div>
  );
};

// Detection Timeline Component
const DetectionTimeline: React.FC<{ events: DetectionEventData[] }> = ({ events }) => {
  return (
    <div className="w-full mt-4">
      <h3 className="text-sm font-medium mb-2">Detection Timeline</h3>
      <div className="w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-md relative overflow-hidden">
        {events.map((event, index) => {
          const isApnea = event.label === 'apnea';
          const position = (index / Math.max(events.length - 1, 1)) * 100;
          const confidence = event.confidence * 100;
          
          return (
            <div 
              key={index}
              className={`absolute w-2 h-full ${isApnea ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ 
                left: `${position}%`, 
                opacity: confidence / 100,
                width: `${Math.max(3, confidence / 10)}px`
              }}
              title={`${event.label} (${confidence.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>Start</span>
        <span>End</span>
      </div>
    </div>
  );
};

// Sleep Apnea Detection Page
const Detection: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [currentDetection, setCurrentDetection] = useState<'normal' | 'apnea' | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0);
  const [detectionEvents, setDetectionEvents] = useState<DetectionEventData[]>([]);
  const [stats, setStats] = useState<DetectionStats>({
    sessionId: null,
    totalEvents: 0,
    apneaCount: 0,
    normalCount: 0,
    apneaPercentage: 0,
    averageConfidence: 0,
    severityScore: 0,
    startTime: null,
    elapsedTime: 0
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const sessionIntervalRef = useRef<number | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  
  // Initialize the page
  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          toast.error("You must be logged in to use this feature");
          navigate("/login");
          return;
        }
        
        setUser(currentUser);
        
        // Check if user is admin (for dataset access)
        try {
          const { data } = await fetch(
            `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/rest/v1/user_roles?user_id=eq.${currentUser.id}&role=eq.admin`,
            {
              headers: {
                "apikey": `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                "Authorization": `Bearer ${currentUser.access_token}`,
              },
            }
          ).then(res => res.json());
          
          setIsAdmin(data && data.length > 0);
        } catch (error) {
          console.error("Error checking admin status:", error);
        }
        
        // Initialize the CNN model
        await loadModel();
        
        // Initialize the audio detection
        await initializeDetection();
        
        // Set default sensitivity
        setSensitivity(5);
        
      } catch (error) {
        console.error("Error initializing detection page:", error);
      }
    };
    
    init();
    
    return () => {
      // Clean up resources
      stopRecording();
      stopDetection();
      
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Update elapsed time
  useEffect(() => {
    if (stats.startTime && isDetecting) {
      sessionIntervalRef.current = window.setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - stats.startTime!.getTime()) / 1000);
        setStats(prevStats => ({ ...prevStats, elapsedTime: elapsed }));
      }, 1000);
    }
    
    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
    };
  }, [stats.startTime, isDetecting]);
  
  // Request microphone access
  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      setMicPermission(true);
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      setMicPermission(false);
      toast.error("Microphone access is required for sleep apnea detection");
    }
  };
  
  // Initialize audio analysis
  const initAudioAnalysis = async () => {
    if (!micPermission) return false;
    
    try {
      // Create AudioContext
      audioContextRef.current = new (window.AudioContext || 
        (window as any).webkitAudioContext)();
      
      // Get user media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      // Set up recorder event handlers
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };
      
      setMediaRecorder(recorder);
      
      // Create analyzer
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      
      source.connect(analyser);
      
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      return true;
    } catch (error) {
      console.error("Error initializing audio analysis:", error);
      toast.error("Failed to initialize audio recording");
      return false;
    }
  };
  
  // Start recording
  const startRecording = async () => {
    if (isRecording) return;
    
    // Initialize if needed
    if (!analyserRef.current) {
      const initialized = await initAudioAnalysis();
      if (!initialized) return;
    }
    
    // Start recording
    if (mediaRecorder && mediaRecorder.state !== 'recording') {
      setRecordedChunks([]);
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Start visualizer animation
      animateVisualizer();
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (!isRecording) return;
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    setIsRecording(false);
    
    // Stop visualizer animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };
  
  // Animate the audio visualizer
  const animateVisualizer = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    
    // Get data for visualization
    analyser.getByteTimeDomainData(dataArray);
    
    // Convert Uint8Array to normalized number array for visualization
    const normalized = Array.from(dataArray).map(val => (val - 128) / 128);
    
    // Take every nth value to reduce data size
    const step = Math.ceil(normalized.length / 50);
    const visualData = [];
    for (let i = 0; i < normalized.length; i += step) {
      visualData.push(normalized[i]);
    }
    
    setAudioData(visualData);
    
    // Continue animation
    animationRef.current = requestAnimationFrame(animateVisualizer);
  };
  
  // Save recording
  const saveRecording = async () => {
    if (recordedChunks.length === 0) {
      toast.error("No recording available to save");
      return;
    }
    
    // Create blob from recorded chunks
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    
    try {
      setIsProcessing(true);
      
      // Preprocess the audio
      const processedAudio = await preprocessAudio(blob, {
        trimSilence: true,
        normalizeVolume: true,
        featureExtraction: 'melspectrogram'
      });
      
      // Save as WAV file
      saveAudioToWav(processedAudio.buffer, `apnea_recording_${Date.now()}.wav`);
      
      toast.success("Recording saved successfully");
    } catch (error) {
      console.error("Error saving recording:", error);
      toast.error("Failed to save recording");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Start continuous detection
  const startDetection = async () => {
    if (isDetecting) return;
    
    try {
      // Start audio listening
      const listeningStarted = await startListening();
      
      if (!listeningStarted) {
        toast.error("Failed to start audio analysis");
        return;
      }
      
      // Create a new detection session
      const sessionId = await createDetectionSession(user.id);
      
      if (!sessionId) {
        toast.error("Failed to create detection session");
        stopListening();
        return;
      }
      
      // Initialize detection state
      setIsDetecting(true);
      setDetectionEvents([]);
      setStats({
        sessionId,
        totalEvents: 0,
        apneaCount: 0,
        normalCount: 0,
        apneaPercentage: 0,
        averageConfidence: 0,
        severityScore: 0,
        startTime: new Date(),
        elapsedTime: 0
      });
      setCurrentDetection(null);
      setConfidenceLevel(0);
      
      // Start detection interval
      detectionIntervalRef.current = window.setInterval(async () => {
        const { audioContext, analyser, dataArray, rawTimeData } = getAudioComponents();
        
        if (!analyser || !dataArray || !rawTimeData) {
          return;
        }
        
        // Get audio data
        analyser.getByteFrequencyData(dataArray);
        analyser.getFloatTimeDomainData(rawTimeData);
        
        // Create a temporary buffer from the raw audio data
        const tempBuffer = audioContext!.createBuffer(1, rawTimeData.length, audioContext!.sampleRate);
        tempBuffer.getChannelData(0).set(rawTimeData);
        
        // Preprocess the audio
        const tempBlob = await audioBufferToBlobAsync(tempBuffer);
        const processedAudio = await preprocessAudio(tempBlob, {
          trimSilence: false, // Don't trim for real-time analysis
          normalizeVolume: true,
          featureExtraction: 'melspectrogram'
        });
        
        // Run detection
        const prediction = await detectApnea(processedAudio);
        
        if (prediction) {
          // Update UI with detection results
          setCurrentDetection(prediction.label);
          setConfidenceLevel(prediction.confidence);
          
          // Add to events list
          const newEvent: DetectionEventData = {
            timestamp: new Date(prediction.timestamp),
            label: prediction.label,
            confidence: prediction.confidence
          };
          
          setDetectionEvents(prev => [...prev, newEvent]);
          
          // Update stats
          setStats(prevStats => {
            const newApneaCount = prediction.label === 'apnea' 
              ? prevStats.apneaCount + 1 
              : prevStats.apneaCount;
              
            const newNormalCount = prediction.label === 'normal' 
              ? prevStats.normalCount + 1 
              : prevStats.normalCount;
              
            const newTotalEvents = newApneaCount + newNormalCount;
            const newApneaPercentage = newTotalEvents > 0 
              ? (newApneaCount / newTotalEvents) * 100 
              : 0;
              
            // Calculate average confidence
            const newAverageConfidence = (
              (prevStats.averageConfidence * (newTotalEvents - 1)) + 
              prediction.confidence
            ) / newTotalEvents;
            
            // Calculate severity score (0-100)
            const newSeverityScore = Math.min(
              100, 
              (newApneaPercentage * 0.7) + (newAverageConfidence * 30)
            );
            
            return {
              ...prevStats,
              totalEvents: newTotalEvents,
              apneaCount: newApneaCount,
              normalCount: newNormalCount,
              apneaPercentage: newApneaPercentage,
              averageConfidence: newAverageConfidence,
              severityScore: newSeverityScore
            };
          });
          
          // Log event to database
          if (stats.sessionId) {
            await logDetectionEvent(stats.sessionId, prediction);
          }
        }
      }, 2000); // Check every 2 seconds
      
      toast.success("Apnea detection started");
    } catch (error) {
      console.error("Error starting detection:", error);
      toast.error("Failed to start apnea detection");
    }
  };
  
  // Stop detection
  const stopDetection = async () => {
    if (!isDetecting) return;
    
    // Stop detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    // Stop audio listening
    stopListening();
    
    // Update database session
    if (stats.sessionId) {
      const sessionStats = {
        apneaCount: stats.apneaCount,
        normalCount: stats.normalCount,
        averageConfidence: stats.averageConfidence,
        severityScore: stats.severityScore
      };
      
      await endDetectionSession(stats.sessionId, sessionStats);
    }
    
    setIsDetecting(false);
    toast.success("Apnea detection stopped");
  };
  
  // Helper to convert AudioBuffer to Blob
  const audioBufferToBlobAsync = async (buffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary OfflineAudioContext
        const offlineContext = new OfflineAudioContext(
          buffer.numberOfChannels,
          buffer.length,
          buffer.sampleRate
        );
        
        // Create a buffer source
        const source = offlineContext.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineContext.destination);
        
        // Start rendering
        source.start(0);
        
        offlineContext.startRendering().then(renderedBuffer => {
          // Convert rendered buffer to WAV
          const wavBlob = audioBufferToWav(renderedBuffer);
          resolve(wavBlob);
        }).catch(err => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  };
  
  // Convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    // Number of channels
    const numChannels = buffer.numberOfChannels;
    
    // Get channel data
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    // Interleaved
    const interleaved = numChannels === 2
      ? interleave(channels[0], channels[1])
      : channels[0];
    
    // Create buffer
    const dataView = encodeWAV(interleaved, buffer.sampleRate, numChannels);
    const audioBlob = new Blob([dataView], { type: 'audio/wav' });
    
    return audioBlob;
  };
  
  // Interleave two channels
  const interleave = (leftChannel: Float32Array, rightChannel: Float32Array): Float32Array => {
    const length = leftChannel.length + rightChannel.length;
    const result = new Float32Array(length);
    
    let inputIndex = 0;
    
    for (let i = 0; i < length;) {
      result[i++] = leftChannel[inputIndex];
      result[i++] = rightChannel[inputIndex];
      inputIndex++;
    }
    
    return result;
  };
  
  // Encode as WAV
  const encodeWAV = (
    samples: Float32Array, 
    sampleRate: number, 
    numChannels: number
  ): DataView => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 4, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);
    
    // Write the PCM samples
    floatTo16BitPCM(view, 44, samples);
    
    return view;
  };
  
  // Write a string to a DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // Convert floating point to 16-bit PCM
  const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };
  
  // Format time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };
  
  // Export session report
  const exportReport = async () => {
    if (!stats.sessionId) {
      toast.error("No active session to export");
      return;
    }
    
    try {
      // Get complete session stats from database
      const sessionData = await getSessionStats(stats.sessionId);
      
      if (!sessionData) {
        toast.error("Failed to retrieve session data");
        return;
      }
      
      // Format data for PDF
      // In a real implementation, you'd use jsPDF or a similar library
      const jsonData = JSON.stringify(sessionData, null, 2);
      
      // Create a blob with the data
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `apnea_report_${stats.sessionId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Session report exported");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  };
  
  // View all sessions
  const viewAllSessions = () => {
    navigate("/analytics");
  };
  
  // Render the page
  return (
    <PageTransition>
      <div className="page-container pt-8 md:pt-16 pb-24">
        <div className="page-content">
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl font-bold mb-2"
            >
              Sleep Apnea Detection
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Real-time monitoring and analysis of breathing patterns
            </motion.p>
          </div>
          
          {!micPermission ? (
            <MicPermissionRequest
              onRequestPermission={requestMicPermission}
              onSkip={() => navigate("/")}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Status and controls */}
              <Card className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Recording Status</h2>
                    <p className="text-sm text-muted-foreground">
                      {isRecording ? "Recording in progress..." : "Ready to record"}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4 md:mt-0">
                    <Button
                      variant={isRecording ? "destructive" : "default"}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing}
                      className="flex items-center gap-2"
                    >
                      {isRecording ? (
                        <>
                          <Stop size={16} />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic size={16} />
                          Start Recording
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={saveRecording}
                      disabled={isRecording || recordedChunks.length === 0 || isProcessing}
                      className="flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Save Recording
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Audio visualizer */}
                <AudioVisualizer 
                  isRecording={isRecording} 
                  audioData={audioData} 
                />
              </Card>
              
              {/* Detection controls and results */}
              <Card className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Detection Status</h2>
                    <p className="text-sm text-muted-foreground">
                      {isDetecting ? (
                        `Monitoring: ${formatTime(stats.elapsedTime)}`
                      ) : (
                        "Detection not active"
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4 md:mt-0">
                    <Button
                      variant={isDetecting ? "destructive" : "default"}
                      onClick={isDetecting ? stopDetection : startDetection}
                      className="flex items-center gap-2"
                    >
                      {isDetecting ? (
                        <>
                          <Stop size={16} />
                          Stop Detection
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          Start Detection
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={exportReport}
                      disabled={!stats.sessionId || isDetecting}
                      className="flex items-center gap-2"
                    >
                      <FileText size={16} />
                      Export Report
                    </Button>
                  </div>
                </div>
                
                {/* Current detection status */}
                {isDetecting && (
                  <div className="mb-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className={`w-4 h-4 rounded-full ${
                          currentDetection === 'apnea' 
                            ? 'bg-red-500 animate-pulse' 
                            : currentDetection === 'normal' 
                              ? 'bg-green-500' 
                              : 'bg-slate-300'
                        }`}
                      />
                      <div>
                        <p className="font-medium">
                          {currentDetection === 'apnea' 
                            ? 'Apnea Detected' 
                            : currentDetection === 'normal' 
                              ? 'Normal Breathing' 
                              : 'Analyzing...'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Confidence: {(confidenceLevel * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Confidence meter */}
                    {currentDetection && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Low Confidence</span>
                          <span>High Confidence</span>
                        </div>
                        <Progress 
                          value={confidenceLevel * 100} 
                          className="h-2" 
                        />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Detection visualization */}
                <BreathingVisualizer 
                  isTracking={isDetecting} 
                  status={currentDetection === 'apnea' ? 'missing' : 'normal'} 
                  detectedEvents={[]}
                />
                
                {/* Timeline view */}
                {detectionEvents.length > 0 && (
                  <DetectionTimeline events={detectionEvents} />
                )}
              </Card>
              
              {/* Statistics panel */}
              {(isDetecting || stats.totalEvents > 0) && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Session Statistics</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                      <p className="text-muted-foreground text-xs mb-1">Duration</p>
                      <p className="text-xl font-semibold">{formatTime(stats.elapsedTime)}</p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                      <p className="text-muted-foreground text-xs mb-1">Apnea Events</p>
                      <p className="text-xl font-semibold">{stats.apneaCount}</p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                      <p className="text-muted-foreground text-xs mb-1">Apnea Rate</p>
                      <p className="text-xl font-semibold">
                        {stats.apneaPercentage.toFixed(1)}%
                      </p>
                    </div>
                    
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                      <p className="text-muted-foreground text-xs mb-1">Severity Score</p>
                      <p className="text-xl font-semibold">
                        {stats.severityScore.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Severity indicator */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">Severity Level</h3>
                      <span className={`text-sm font-medium ${
                        stats.severityScore < 30 
                          ? 'text-green-500' 
                          : stats.severityScore < 60 
                            ? 'text-yellow-500' 
                            : 'text-red-500'
                      }`}>
                        {stats.severityScore < 30 
                          ? 'Normal/Mild' 
                          : stats.severityScore < 60 
                            ? 'Moderate' 
                            : 'Severe'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full ${
                          stats.severityScore < 30 
                            ? 'bg-green-500' 
                            : stats.severityScore < 60 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, stats.severityScore)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={viewAllSessions}
                      className="flex items-center gap-2"
                    >
                      <BarChart2 size={16} />
                      View All Sessions
                    </Button>
                  </div>
                </Card>
              )}
              
              {/* Admin panel for dataset management */}
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8"
                >
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md flex items-start gap-3 mb-4">
                    <AlertTriangle className="text-yellow-500 mt-0.5 flex-shrink-0" size={18} />
                    <div>
                      <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Admin Section</h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        This section is only visible to administrators. It provides access to training datasets and model management tools.
                      </p>
                    </div>
                  </div>
                  
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Dataset Management</h2>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">Training Datasets</h3>
                          <p className="text-sm text-muted-foreground">
                            Upload and manage datasets for model training
                          </p>
                        </div>
                        
                        <Button
                          variant="outline"
                          onClick={() => navigate("/admin/datasets")}
                          className="flex items-center gap-2"
                        >
                          <Wand2 size={16} />
                          Manage Datasets
                        </Button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">Model Management</h3>
                          <p className="text-sm text-muted-foreground">
                            Train, evaluate and deploy CNN models
                          </p>
                        </div>
                        
                        <Button
                          variant="outline"
                          onClick={() => navigate("/admin/models")}
                          className="flex items-center gap-2"
                        >
                          <BarChart2 size={16} />
                          Manage Models
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Detection;
