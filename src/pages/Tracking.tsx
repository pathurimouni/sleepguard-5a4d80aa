
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, RefreshCw } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import BreathingVisualizer from "@/components/BreathingVisualizer";
import { useTrackingSession } from "@/hooks/useTrackingSession";
import TrackingStatusDisplay from "@/components/tracking/TrackingStatusDisplay";
import TrackingControls from "@/components/tracking/TrackingControls";
import MicPermissionHandler from "@/components/tracking/MicPermissionHandler";

const Tracking = () => {
  const {
    isTracking,
    elapsedTime,
    apneaStatus,
    currentEvents,
    detectionMode,
    setDetectionMode,
    micPermission,
    setMicPermission,
    isScheduled,
    isUploading,
    detectedSoundEvents,
    startTracking,
    stopTracking,
    initializeDetectionSystem,
  } = useTrackingSession();

  const [showMicPermission, setShowMicPermission] = useState<boolean>(true);

  useEffect(() => {
    if (micPermission !== null) {
      setShowMicPermission(false);
    }
  }, [micPermission]);

  const handleMicPermissionGranted = () => {
    setDetectionMode("real");
    setShowMicPermission(false);
  };

  const handleSimulationMode = () => {
    setDetectionMode("simulation");
    setShowMicPermission(false);
  };

  return (
    <PageTransition>
      <div className="page-container pt-8 md:pt-24 pb-24">
        <div className="page-content">
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold mb-2"
            >
              Sleep Tracking
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Monitor your breathing patterns in real-time
            </motion.p>
          </div>

          {showMicPermission ? (
            <MicPermissionHandler
              onPermissionGranted={handleMicPermissionGranted}
              onSimulationMode={handleSimulationMode}
              detectionMode={detectionMode}
              setDetectionMode={setDetectionMode}
              setMicPermission={setMicPermission}
              micPermission={micPermission}
            />
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-panel p-6 mb-6"
              >
                <TrackingStatusDisplay
                  elapsedTime={elapsedTime}
                  isTracking={isTracking}
                  isScheduled={isScheduled}
                  currentEvents={currentEvents}
                  micPermission={micPermission}
                  detectionMode={detectionMode}
                  isUploading={isUploading}
                />

                <BreathingVisualizer 
                  isTracking={isTracking} 
                  status={apneaStatus} 
                  detectedEvents={detectedSoundEvents}
                />
              </motion.div>

              <TrackingControls
                isTracking={isTracking}
                startTracking={() => startTracking(false)}
                stopTracking={stopTracking}
                isUploading={isUploading}
              />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 text-center text-sm text-muted-foreground"
              >
                <p>Place your device nearby while you sleep</p>
                <p>The microphone will be used to detect breathing patterns</p>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Tracking;
