
import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, AlertTriangle } from 'lucide-react';
import ActionButton from './ActionButton';

interface MicPermissionRequestProps {
  onRequestPermission: () => void;
  onSkip: () => void;
}

const MicPermissionRequest: React.FC<MicPermissionRequestProps> = ({
  onRequestPermission,
  onSkip
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-panel p-6 w-full max-w-md mx-auto"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Mic size={32} />
        </div>
        
        <h2 className="text-xl font-bold">Microphone Access Required</h2>
        
        <p className="text-muted-foreground">
          To detect sleep apnea patterns, we need access to your microphone to analyze breathing sounds.
        </p>
        
        <div className="bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg w-full">
          <div className="flex items-start space-x-2">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              Your audio is processed entirely on your device. No recordings are stored or sent to any server.
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full gap-3">
          <ActionButton
            variant="outline"
            size="md"
            className="sm:flex-1"
            onClick={onSkip}
            icon={<MicOff size={18} />}
          >
            Use Simulation
          </ActionButton>
          
          <ActionButton
            variant="primary"
            size="md"
            className="sm:flex-1"
            onClick={onRequestPermission}
            icon={<Mic size={18} />}
          >
            Allow Microphone
          </ActionButton>
        </div>
      </div>
    </motion.div>
  );
};

export default MicPermissionRequest;
