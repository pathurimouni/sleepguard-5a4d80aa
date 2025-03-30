
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

const BreathingAnalysis = () => {
  const [recordings, setRecordings] = useState<BreathingRecording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<BreathingRecording | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ApneaAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserRecordings();
  }, []);

  useEffect(() => {
    // Reset cancellation state when selecting a new recording
    setIsCanceled(false);
    
    if (selectedRecording && selectedRecording.analysis_complete) {
      loadAnalysisResult(selectedRecording.id);
    } else if (selectedRecording && !isCanceled) {
      // If analysis is not complete, poll every 5 seconds
      const interval = setInterval(() => {
        checkAnalysisCompletion(selectedRecording.id);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [selectedRecording, isCanceled]);

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
      
      // Select the most recent recording if available
      if (userRecordings.length > 0) {
        setSelectedRecording(userRecordings[0]);
      }
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
    setSelectedRecording(recording);
    setAnalysisResult(null);
    setIsCanceled(false);
  };

  const handleUploadComplete = () => {
    loadUserRecordings();
  };
  
  const handleCancelAnalysis = () => {
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
                <RecordingUploader onUploadComplete={handleUploadComplete} />
                
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
                      <div className="glass-panel p-12 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Analyzing Recording</h3>
                        <p className="text-muted-foreground mb-6">
                          Our CNN model is analyzing your breathing patterns. This may take a few minutes.
                        </p>
                        <Button 
                          variant="destructive" 
                          onClick={handleCancelAnalysis}
                          className="flex items-center gap-2"
                        >
                          <X size={16} />
                          Cancel Analysis
                        </Button>
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
