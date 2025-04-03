
import React from 'react';
import { BarChart2, Clock, Calendar, FileAudio } from 'lucide-react';
import { BreathingRecording } from '@/utils/recordingTypes';

interface RecordingsListProps {
  recordings: BreathingRecording[];
  onSelectRecording: (recording: BreathingRecording) => void;
  selectedRecordingId: string | null;
}

const RecordingsList: React.FC<RecordingsListProps> = ({ 
  recordings, 
  onSelectRecording, 
  selectedRecordingId 
}) => {
  if (recordings.length === 0) {
    return (
      <div className="glass-panel p-6 text-center text-muted-foreground">
        <FileAudio size={40} className="mx-auto mb-2 opacity-40" />
        <p>No recordings found</p>
        <p className="text-sm mt-1">Upload a breathing recording to see it here</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 space-y-3">
      <h3 className="font-semibold px-2">Your Recordings</h3>
      <div className="max-h-72 overflow-y-auto pr-1">
        {recordings.map((recording) => (
          <div
            key={recording.id}
            className={`p-3 rounded-md cursor-pointer transition-colors ${
              selectedRecordingId === recording.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => onSelectRecording(recording)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">
                  Recording {new Date(recording.recording_date).toLocaleDateString()}
                </div>
                <div className="flex items-center text-xs mt-1">
                  <Clock size={12} className="mr-1" />
                  <span>{recording.duration} minutes</span>
                </div>
              </div>
              <div>
                {recording.analysis_complete ? (
                  <BarChart2 
                    size={16} 
                    className={selectedRecordingId === recording.id 
                      ? 'text-primary-foreground' 
                      : 'text-primary'
                    } 
                  />
                ) : (
                  <div className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 rounded-full">
                    Analyzing
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecordingsList;
