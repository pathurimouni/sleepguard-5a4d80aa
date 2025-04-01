
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Upload, BarChart2, Loader2, X } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import RecordingUploader from '@/components/RecordingUploader';
import RecordingsList from '@/components/RecordingsList';
import ApneaResults from '@/components/ApneaResults';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/utils/auth';
import { 
  getUserRecordings, 
  getRecordingAnalysis, 
  BreathingRecording, 
  ApneaAnalysis 
} from '@/utils/recordingService';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const BreathingAnalysis = () => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<BreathingRecording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<BreathingRecording | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ApneaAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showUploadPanel, setShowUploadPanel] = useState(true);
  const [analysisPhase, setAnalysisPhase] = useState<'preparing' | 'processing' | 'finalizing' | 'complete'>('preparing');
  
  // Define analysis phases with descriptions
  const analysisPhasesMap = {
    preparing: {
      title: "Preparing Audio Data",
      description: "Converting and preparing the audio data for analysis",
      progressRange: [0, 30]
    },
    processing: {
      title: "Running CNN Analysis",
      description: "Analyzing breathing patterns using deep learning",
      progressRange: [30, 80]
    },
    finalizing: {
      title: "Finalizing Results",
      description: "Calculating statistics and preparing results",
      progressRange: [80, 100]
    },
    complete: {
      title: "Analysis Complete",
      description: "Your results are ready to view",
      progressRange: [100, 100]
    }
  };

  useEffect(() => {
    loadUserRecordings();
  }, []);

  useEffect(() => {
    // Reset cancellation state when selecting a new recording
    setIsCanceled(false);
    
    if (selectedRecording && selectedRecording.analysis_complete) {
      loadAnalysisResult(selectedRecording.id);
    } else if (selectedRecording && !isCanceled) {
      // Start with initial progress and phase
      setAnalysisProgress(10);
      setAnalysisPhase('preparing');
      
      // Simulate analysis progress
      simulateAnalysisProgress();
      
      // If analysis is not complete, poll every 3 seconds (reduced from 5)
      const interval = setInterval(() => {
        checkAnalysisCompletion(selectedRecording.id);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [selectedRecording, isCanceled]);

  // Simulate a realistic analysis progress
  const simulateAnalysisProgress = () => {
    // Clear any existing interval
    if (window.analysisInterval) {
      clearInterval(window.analysisInterval);
    }
    
    // Start with preparing phase
    setAnalysisPhase('preparing');
    setAnalysisProgress(5);
    
    // Create a new interval for progress simulation
    const interval = setInterval(() => {
      setAnalysisProgress(current => {
        let newProgress = current + Math.random() * 3;
        
        // Update phase based on progress
        if (newProgress >= 30 && newProgress < 80) {
          setAnalysisPhase('processing');
        } else if (newProgress >= 80 && newProgress < 100) {
          setAnalysisPhase('finalizing');
        }
        
        // Cap at 95% until actually complete
        return Math.min(95, newProgress);
      });
    }, 300);
    
    // Save the interval ID in the window object
    window.analysisInterval = interval;
    
    return interval;
  };

  const loadUserRecordings = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        toast.error('You must be logged in to view recordings');
        navigate('/login');
        return;
      }
      
      const userRecordings = await getUserRecordings(currentUser.id);
      setRecordings(userRecordings);
      
      // Don't automatically select the most recent recording
      // Instead, show the upload panel by default
      setShowUploadPanel(true);
      
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast.error('Failed to load recordings');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAnalysisCompletion = async (recordingId: string) => {
    try {
      // If canceled, don't check
      if (isCanceled) return;
      
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        return;
      }
      
      const userRecordings = await getUserRecordings(currentUser.id);
      setRecordings(userRecordings);
      
      // Find the recording and check if analysis is complete
      const recording = userRecordings.find(r => r.id === recordingId);
      
      if (recording?.analysis_complete) {
        setSelectedRecording(recording);
        
        // Clear the progress simulation interval
        if (window.analysisInterval) {
          clearInterval(window.analysisInterval);
        }
        
        // Set progress to 100% and phase to complete
        setAnalysisProgress(100);
        setAnalysisPhase('complete');
        
        // Load the actual analysis result
        loadAnalysisResult(recordingId);
      }
    } catch (error) {
      console.error('Error checking analysis completion:', error);
    }
  };

  const loadAnalysisResult = async (recordingId: string) => {
    try {
      setIsLoadingAnalysis(true);
      const analysis = await getRecordingAnalysis(recordingId);
      setAnalysisResult(analysis);
    } catch (error) {
      console.error('Error loading analysis result:', error);
      toast.error('Failed to load analysis result');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleRecordingSelect = (recording: BreathingRecording) => {
    setShowUploadPanel(false);
    setSelectedRecording(recording);
    setAnalysisResult(null);
    setIsCanceled(false);
  };

  const handleUploadComplete = () => {
    loadUserRecordings();
  };
  
  const handleCancelAnalysis = () => {
    // Clear the progress simulation interval
    if (window.analysisInterval) {
      clearInterval(window.analysisInterval);
    }
    
    setIsCanceled(true);
    setSelectedRecording(null);
    toast.info('Analysis monitoring canceled');
  };

  return (
    <PageTransition>
      <div className="page-container pt-8 md:pt-16 pb-24">
        <div className="page-content">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center">
              <Stethoscope className="mr-2 text-primary" size={32} />
              Breathing Analysis
            </h1>
            <p className="text-muted-foreground">
              Upload and analyze your breathing recordings for sleep apnea detection
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                {showUploadPanel && (
                  <RecordingUploader onUploadComplete={(recording) => {
                    handleUploadComplete();
                    if (recording) {
                      setSelectedRecording(recording);
                      setShowUploadPanel(false);
                    }
                  }} />
                )}
                
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">Your Recordings</h3>
                  {!showUploadPanel && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowUploadPanel(true)}
                      className="flex items-center gap-1"
                    >
                      <Upload size={14} />
                      <span>Upload New</span>
                    </Button>
                  )}
                </div>
                
                <RecordingsList 
                  recordings={recordings} 
                  onSelectRecording={handleRecordingSelect}
                  selectedRecordingId={selectedRecording?.id || null}
                />
              </div>
              
              <div className="lg:col-span-2">
                {selectedRecording ? (
                  <>
                    {!selectedRecording.analysis_complete ? (
                      <div className="glass-panel p-8">
                        <div className="text-center mb-6">
                          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                          <h3 className="text-xl font-semibold">{analysisPhasesMap[analysisPhase].title}</h3>
                          <p className="text-muted-foreground mb-4">
                            {analysisPhasesMap[analysisPhase].description}
                          </p>
                        </div>
                        
                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{analysisPhase !== 'complete' ? 'Processing...' : 'Complete'}</span>
                            <span className="font-medium">{Math.round(analysisProgress)}%</span>
                          </div>
                          <Progress value={analysisProgress} className="h-3" />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-2 text-xs text-center mb-4">
                            <div className={`p-2 rounded ${analysisPhase === 'preparing' || analysisPhase === 'processing' || analysisPhase === 'finalizing' || analysisPhase === 'complete' ? 'bg-primary/20 text-primary font-medium' : 'bg-slate-100 dark:bg-slate-800'}`}>
                              Data Preparation
                            </div>
                            <div className={`p-2 rounded ${analysisPhase === 'processing' || analysisPhase === 'finalizing' || analysisPhase === 'complete' ? 'bg-primary/20 text-primary font-medium' : 'bg-slate-100 dark:bg-slate-800'}`}>
                              Pattern Analysis
                            </div>
                            <div className={`p-2 rounded ${analysisPhase === 'finalizing' || analysisPhase === 'complete' ? 'bg-primary/20 text-primary font-medium' : 'bg-slate-100 dark:bg-slate-800'}`}>
                              Results Generation
                            </div>
                          </div>
                          
                          <p className="text-xs text-center text-muted-foreground">
                            Our CNN model is analyzing your breathing patterns for sleep apnea indicators.
                            This may take a few minutes depending on the length of your recording.
                          </p>
                          
                          <div className="flex justify-center">
                            <Button 
                              variant="destructive" 
                              onClick={handleCancelAnalysis}
                              className="flex items-center gap-2"
                              size="sm"
                            >
                              <X size={14} />
                              Cancel Analysis
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : isLoadingAnalysis ? (
                      <div className="glass-panel p-12 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">Loading Results</h3>
                      </div>
                    ) : analysisResult ? (
                      <ApneaResults analysis={analysisResult} />
                    ) : (
                      <div className="glass-panel p-12 text-center">
                        <BarChart2 className="h-12 w-12 text-primary/40 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">No Analysis Available</h3>
                        <p className="text-muted-foreground mt-2">
                          We couldn't find the analysis results for this recording.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="glass-panel p-12 text-center">
                    <BarChart2 className="h-12 w-12 text-primary/40 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">No Recording Selected</h3>
                    <p className="text-muted-foreground mt-2">
                      Select a recording from the list or upload a new one to see the analysis results.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default BreathingAnalysis;
