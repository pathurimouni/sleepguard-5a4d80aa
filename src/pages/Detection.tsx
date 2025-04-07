import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  AlertTriangle, Settings, Loader2, Mic, Square, 
  Download, X, CheckCircle, Wifi, WifiOff, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PageTransition from "@/components/PageTransition";
import ActionButton from "@/components/ActionButton";
import { getCurrentUser } from "@/utils/auth";
import { supabase } from "@/integrations/supabase/client";
import cnnModel from "@/utils/cnnModel";

const Detection: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isApneaDetected, setIsApneaDetected] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [sensitivity, setSensitivity] = useState<number>(0.7);
  const [autoExport, setAutoExport] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isMicBlocked, setIsMicBlocked] = useState<boolean>(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check user auth and online status
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast.error("You must be logged in to access this page");
        navigate("/login");
        return;
      }
      setUser(currentUser);
      
      // Fetch user profile
      await fetchUserProfile();
    };
    
    checkAuth();
    
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);
  
  // Initialize audio context
  useEffect(() => {
    if (!user) return;
    
    const initAudio = async () => {
      try {
        const context = new AudioContext();
        setAudioContext(context);
        
        // Check microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        
      } catch (error: any) {
        console.error("Error initializing audio:", error);
        
        if (error.message.includes('Permission denied')) {
          setIsMicBlocked(true);
          toast.error("Microphone access blocked. Please allow microphone access in your browser settings.");
        } else {
          toast.error("Failed to initialize audio. Please check your microphone and browser settings.");
        }
      }
    };
    
    initAudio();
  }, [user]);
  
  // Fetch user profile
  const fetchUserProfile = async () => {
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load user profile");
      } else {
        setProfile(data);
      }
    }
  };
  
  // Start recording
  const startRecording = useCallback(async () => {
    if (!audioContext || !user) return;
    
    try {
      setIsMicBlocked(false);
      setIsRecording(true);
      setIsAnalyzing(false);
      setIsApneaDetected(false);
      setConfidence(0);
      setRecordingDuration(0);
      setAudioBuffer(null);
      setAudioChunks([]);
      
      // Reset timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Start detection session
      const newSessionId = await cnnModel.createDetectionSession(user.id);
      if (!newSessionId) {
        toast.error("Failed to start detection session");
        setIsRecording(false);
        return;
      }
      setSessionId(newSessionId);
      
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create media recorder
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      setMediaRecorder(recorder);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = async () => {
        clearInterval(timerRef.current);
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Load audio into AudioContext for analysis
        audioContext.decodeAudioData(await audioBlob.arrayBuffer(), (buffer) => {
          setAudioBuffer(buffer);
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          
        }, (error) => {
          console.error("Error decoding audio data:", error);
          toast.error("Failed to decode audio data");
          setIsRecording(false);
        });
      };
      
      recorder.start();
      
    } catch (error: any) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      
      if (error.message.includes('Permission denied')) {
        setIsMicBlocked(true);
        toast.error("Microphone access blocked. Please allow microphone access in your browser settings.");
      } else {
        toast.error("Failed to start recording. Please check your microphone and browser settings.");
      }
    }
  }, [audioContext, user]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsAnalyzing(true);
      
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [mediaRecorder]);
  
  // Analyze audio
  useEffect(() => {
    if (!audioBuffer || !isAnalyzing || !sessionId) return;
    
    const analyze = async () => {
      try {
        const buffer = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Simulate analysis (replace with actual model analysis)
        const result = Math.random();
        const isApnea = result > (1 - sensitivity);
        const newConfidence = isApnea ? result : 0;
        
        setIsApneaDetected(isApnea);
        setConfidence(newConfidence);
        
        // Add detection event
        await cnnModel.addDetectionEvent(sessionId, isApnea, newConfidence);
        
        setIsAnalyzing(false);
        
        if (autoExport) {
          exportAsWav(audioBuffer);
        }
        
      } catch (error) {
        console.error("Error analyzing audio:", error);
        toast.error("Failed to analyze audio");
        setIsAnalyzing(false);
      }
    };
    
    analyze();
  }, [audioBuffer, isAnalyzing, sensitivity, autoExport, sessionId]);
  
  // Finish session and save recording
  const finishSession = async () => {
    if (!sessionId) return;
    
    setIsSaving(true);
    
    try {
      // Calculate session metrics
      const { apnea, normal } = await cnnModel.countApneaEventsForSession(sessionId);
      const totalEvents = apnea + normal;
      const avgConfidence = totalEvents > 0 ? (apnea * confidence) / totalEvents : 0;
      const severityScore = apnea * confidence;
      
      // Finish detection session
      const success = await cnnModel.finishDetectionSession(
        sessionId,
        recordingDuration,
        apnea,
        normal,
        avgConfidence,
        severityScore
      );
      
      if (!success) {
        toast.error("Failed to save detection session");
        return;
      }
      
      toast.success("Detection session saved successfully");
      navigate("/history");
      
    } catch (error) {
      console.error("Error finishing session:", error);
      toast.error("Failed to finish session");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Export audio as WAV
  const exportAsWav = (audioBuffer: AudioBuffer) => {
    // Create a new array with the proper data type
    const wavBuffer = new ArrayBuffer(44 + audioBuffer.length * 2);
    const view = new DataView(wavBuffer);
    
    // Helper function to write strings to the buffer
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + audioBuffer.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, audioBuffer.numberOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * 2, true);
    view.setUint16(32, audioBuffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    
    writeString(view, 36, 'data');
    view.setUint32(40, audioBuffer.length * 2, true);
    
    // Write the PCM samples
    const float32Data = audioBuffer.getChannelData(0);
    for (let i = 0; i < audioBuffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Data[i]));
      view.setInt16(44 + (i * 2), sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }
    
    // Create a blob and download it
    const blob = new Blob([view], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apnea-detection-${new Date().toISOString()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Render
  return (
    <PageTransition>
      <div className="page-container pt-8 md:pt-16 pb-24">
        <div className="page-content">
          <Button
            variant="ghost"
            className="absolute top-4 left-4 md:top-8 md:left-8 rounded-full p-2 hover:bg-secondary/50"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Go back</span>
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold mb-2"
              >
                Real-Time Detection
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground"
              >
                Detect sleep apnea patterns in real-time using your microphone
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 md:mt-0"
            >
              <ActionButton
                variant="secondary"
                onClick={() => setSettingsOpen(true)}
                icon={<Settings size={18} />}
              >
                Settings
              </ActionButton>
            </motion.div>
          </div>
          
          {!isOnline && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-md flex items-start gap-3 mb-6">
              <WifiOff className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-300">No Internet Connection</h3>
                <p className="text-sm text-red-700 dark:text-red-400">
                  Real-time detection requires an active internet connection to analyze audio data.
                </p>
              </div>
            </div>
          )}
          
          {isMicBlocked && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-md flex items-start gap-3 mb-6">
              <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-300">Microphone Access Blocked</h3>
                <p className="text-sm text-red-700 dark:text-red-400">
                  Please allow microphone access in your browser settings to use real-time detection.
                </p>
              </div>
            </div>
          )}
          
          <Card className="p-6 space-y-6">
            <div className="text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                {isRecording || isAnalyzing ? (
                  <Mic className="h-16 w-16 text-primary animate-pulse" />
                ) : (
                  <Mic className="h-16 w-16 text-muted-foreground" />
                )}
                
                {isOnline ? (
                  <div className="absolute top-1 left-1 rounded-full bg-green-500 h-3 w-3 shadow-md"></div>
                ) : (
                  <div className="absolute top-1 left-1 rounded-full bg-red-500 h-3 w-3 shadow-md"></div>
                )}
              </div>
              
              <h2 className="text-2xl font-semibold">
                {isRecording ? "Recording..." : isAnalyzing ? "Analyzing..." : "Ready to Detect"}
              </h2>
              
              <p className="text-muted-foreground">
                {isRecording
                  ? `Recording duration: ${recordingDuration} seconds`
                  : isAnalyzing
                    ? "Analyzing audio data..."
                    : "Click the button below to start real-time detection"}
              </p>
              
              {isApneaDetected && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 rounded-md">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-red-500 flex-shrink-0" size={16} />
                    <div className="text-sm text-red-700 dark:text-red-400">
                      Apnea Detected! Confidence: {(confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="flex justify-center">
              {isRecording ? (
                <ActionButton
                  variant="destructive"
                  size="lg"
                  onClick={stopRecording}
                  icon={<Square size={18} />}
                  disabled={isAnalyzing}
                >
                  Stop Recording
                </ActionButton>
              ) : (
                <ActionButton
                  variant="primary"
                  size="lg"
                  onClick={startRecording}
                  icon={<Mic size={18} />}
                  disabled={!isOnline || isMicBlocked}
                >
                  Start Detection
                </ActionButton>
              )}
            </div>
            
            {audioBuffer && !isRecording && !isAnalyzing && (
              <div className="flex justify-center space-x-4">
                <Button
                  variant="secondary"
                  onClick={finishSession}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Recording"
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => exportAsWav(audioBuffer)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export as WAV
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detection Settings</DialogTitle>
            <DialogDescription>
              Customize the real-time detection sensitivity and export options.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sensitivity">Sensitivity</Label>
              <Slider
                id="sensitivity"
                defaultValue={[sensitivity]}
                max={1}
                step={0.05}
                onValueChange={(value) => setSensitivity(value[0])}
              />
              <p className="text-sm text-muted-foreground">
                Adjust the sensitivity of apnea detection. Higher values may increase false positives.
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-export">Auto Export</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically export recordings as WAV files after analysis.
                </p>
              </div>
              <Switch
                id="auto-export"
                checked={autoExport}
                onCheckedChange={setAutoExport}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default Detection;
