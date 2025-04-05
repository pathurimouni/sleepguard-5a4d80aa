
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
      className="glass-panel p-6 w-full max-w-md mx-auto bg-gradient-to-br from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 shadow-md"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
          <Mic size={32} />
        </div>
        
        <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">Microphone Access Required</h2>
        
        <p className="text-slate-600 dark:text-slate-300">
          To detect sleep apnea patterns, we need access to your microphone to analyze breathing sounds.
        </p>
        
        <div className="bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg w-full border border-amber-100 dark:border-amber-900/50">
          <div className="flex items-start space-x-2">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              Your audio is processed entirely on your device. No recordings are stored or sent to any server unless you explicitly choose to save them.
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full gap-3 mt-2">
          <ActionButton
            variant="outline"
            size="md"
            className="sm:flex-1 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onSkip}
            icon={<MicOff size={18} />}
          >
            Use Simulation
          </ActionButton>
          
          <ActionButton
            variant="primary"
            size="md"
            className="sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600"
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
