
import React from "react";
import { Bell } from "lucide-react";
import ToggleSwitch from "./ToggleSwitch";
import { UserSettings } from "@/utils/storage";

interface AlertsSectionProps {
  settings: UserSettings;
  handleAlertTypeChange: (alertType: keyof UserSettings["alertTypes"], checked: boolean) => void;
}

const AlertsSection: React.FC<AlertsSectionProps> = ({ settings, handleAlertTypeChange }) => {
  return (
    <div>
      <div className="flex items-center mb-4">
        <Bell size={20} className="mr-2 text-primary" />
        <h2 className="text-xl font-semibold">Alerts</h2>
      </div>

      <div className="space-y-4">
        <ToggleSwitch 
          id="onScreen" 
          label="On-Screen Alerts" 
          checked={settings.alertTypes.onScreen}
          onChange={(checked) => handleAlertTypeChange("onScreen", checked)}
        />

        <ToggleSwitch 
          id="vibration" 
          label="Vibration" 
          checked={settings.alertTypes.vibration}
          onChange={(checked) => handleAlertTypeChange("vibration", checked)}
        />

        <ToggleSwitch 
          id="sound" 
          label="Sound" 
          checked={settings.alertTypes.sound}
          onChange={(checked) => handleAlertTypeChange("sound", checked)}
        />
      </div>
    </div>
  );
};

export default AlertsSection;
