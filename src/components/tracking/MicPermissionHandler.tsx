
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import MicPermissionRequest from "../MicPermissionRequest";
import { setSensitivity } from "@/utils/apneaDetection";
import { getUserSettings } from "@/utils/storage";

interface MicPermissionHandlerProps {
  onPermissionGranted: () => void;
  onSimulationMode: () => void;
  detectionMode: "real" | "simulation";
  setDetectionMode: (mode: "real" | "simulation") => void;
  setMicPermission: (permission: boolean | null) => void;
  micPermission: boolean | null;
}

const MicPermissionHandler: React.FC<MicPermissionHandlerProps> = ({
  onPermissionGranted,
  onSimulationMode,
  detectionMode,
  setDetectionMode,
  setMicPermission,
  micPermission
}) => {
  const [showPermissionRequest, setShowPermissionRequest] = useState<boolean>(true);

  useEffect(() => {
    const settings = getUserSettings();
    setSensitivity(settings.sensitivity);
    
    if (micPermission === null) {
      checkMicrophonePermission();
    }
  }, [micPermission]);

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (result.state === 'granted') {
        setMicPermission(true);
        setShowPermissionRequest(false);
        onPermissionGranted();
      } else if (result.state === 'denied') {
        setMicPermission(false);
        setDetectionMode("simulation");
        toast.error(
          "Microphone access denied. Using simulation mode.",
          { icon: <AlertTriangle className="h-4 w-4" /> }
        );
        onSimulationMode();
      } else {
        setShowPermissionRequest(true);
      }
    } catch (error) {
      console.error("Error checking microphone permission:", error);
      setShowPermissionRequest(true);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the tracks after getting permission
      
      setMicPermission(true);
      setDetectionMode("real");
      setShowPermissionRequest(false);
      onPermissionGranted();
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      setMicPermission(false);
      setDetectionMode("simulation");
      toast.error("Could not access microphone. Using simulation mode.");
      onSimulationMode();
    }
  };

  const handleSkip = () => {
    setMicPermission(false);
    setDetectionMode("simulation");
    setShowPermissionRequest(false);
    onSimulationMode();
  };

  if (micPermission !== null || !showPermissionRequest) {
    return null;
  }

  return (
    <MicPermissionRequest
      onRequestPermission={handleRequestPermission}
      onSkip={handleSkip}
    />
  );
};

export default MicPermissionHandler;
