
import React, { useState, useRef } from 'react';
import { Upload, Clock, Activity, CheckCircle } from 'lucide-react';
import { getCurrentUser } from '@/utils/auth';
import { uploadBreathingRecording } from '@/utils/recordingService';
import { toast } from 'sonner';

interface RecordingUploaderProps {
  onUploadComplete: () => void;
}

const RecordingUploader: React.FC<RecordingUploaderProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an audio file
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      
      setSelectedFile(file);
      
      // Create object URL for the audio file
      const objectUrl = URL.createObjectURL(file);
      
      // Load the audio to get duration
      if (audioRef.current) {
        audioRef.current.src = objectUrl;
        audioRef.current.onloadedmetadata = () => {
          if (audioRef.current) {
            // Convert duration from seconds to minutes
            const durationInMinutes = Math.ceil(audioRef.current.duration / 60);
            setRecordingDuration(durationInMinutes);
          }
        };
      }
    }
  };

  const simulateProgress = () => {
    // Start with 10% immediately to show progress
    setUploadProgress(10);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 300);
    
    return interval;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Simulate progress immediately
      const progressInterval = simulateProgress();
      
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast.error('You must be logged in to upload recordings');
        clearInterval(progressInterval);
        setIsUploading(false);
        return;
      }
      
      const result = await uploadBreathingRecording(
        currentUser.id,
        selectedFile,
        recordingDuration
      );
      
      // Finish progress to 100%
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Short delay to show 100% before resetting
      setTimeout(() => {
        if (result) {
          toast.success('Recording uploaded successfully');
          setSelectedFile(null);
          setRecordingDuration(0);
          setUploadProgress(0);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          onUploadComplete();
        } else {
          toast.error('Failed to upload recording');
        }
        setIsUploading(false);
      }, 500);
      
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast.error('An error occurred during upload');
      setUploadProgress(0);
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-panel p-6 space-y-4">
      <div className="flex items-center mb-2">
        <Upload size={20} className="mr-2 text-primary" />
        <h3 className="font-semibold text-lg">Upload Breathing Recording</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Upload an audio recording of your breathing during sleep to analyze for sleep apnea.
      </p>
      
      <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center">
        <input
          type="file"
          id="recording-file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
        />
        
        {selectedFile ? (
          <div className="space-y-3">
            <div className="bg-primary/10 rounded-md p-3 text-primary-foreground">
              <p className="font-medium">{selectedFile.name}</p>
              <div className="flex items-center justify-center text-sm mt-1">
                <Clock size={14} className="mr-1" />
                <span>{recordingDuration} minutes</span>
              </div>
            </div>
            
            {isUploading && (
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-md py-2 text-sm"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={isUploading}
              >
                Change File
              </button>
              
              <button
                className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm flex items-center justify-center"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    {uploadProgress === 100 ? (
                      <>
                        <CheckCircle size={14} className="mr-1" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Activity size={14} className="mr-1 animate-pulse" />
                        <span>Uploading... {uploadProgress}%</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Upload size={14} className="mr-1" />
                    <span>Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <Upload size={40} className="text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              Drag and drop your audio file here or click to browse
            </p>
            <button
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </button>
          </div>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>Supported formats: MP3, WAV, M4A</p>
        <p>Maximum file size: 50MB</p>
      </div>
      
      {/* Hidden audio element to get duration */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default RecordingUploader;
