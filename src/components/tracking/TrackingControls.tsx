
import React from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";
import ActionButton from "../ActionButton";

interface TrackingControlsProps {
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  isUploading: boolean;
}

const TrackingControls: React.FC<TrackingControlsProps> = ({
  isTracking,
  startTracking,
  stopTracking,
  isUploading
}) => {
  return (
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
          disabled={isUploading}
        >
          {isUploading ? "Saving..." : "Stop Tracking"}
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
  );
};

export default TrackingControls;
