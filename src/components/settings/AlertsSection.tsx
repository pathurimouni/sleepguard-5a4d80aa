
import React, { useState } from "react";
import { Bell, Music } from "lucide-react";
import ToggleSwitch from "./ToggleSwitch";
import { UserSettings } from "@/utils/storage";

interface AlertsSectionProps {
  settings: UserSettings;
  handleAlertTypeChange: (alertType: keyof UserSettings["alertTypes"], checked: boolean) => void;
  handleRingtoneChange: (ringtone: string) => void;
}

const AlertsSection: React.FC<AlertsSectionProps> = ({ 
  settings, 
  handleAlertTypeChange,
  handleRingtoneChange
}) => {
  const [showRingtones, setShowRingtones] = useState(false);

  const availableRingtones = [
    { id: "ringtone-1", name: "Classic Beep", src: "/sounds/classic-beep.mp3" },
    { id: "ringtone-2", name: "Soft Bell", src: "/sounds/soft-bell.mp3" },
    { id: "ringtone-3", name: "Alert Chime", src: "/sounds/alert-chime.mp3" },
  ];

  const playRingtone = (src: string) => {
    const audio = new Audio(src);
    audio.play();
  };

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
          onChange={(checked) => {
            handleAlertTypeChange("sound", checked);
            setShowRingtones(checked);
          }}
        />

        {showRingtones && settings.alertTypes.sound && (
          <div className="mt-2 ml-6 space-y-2">
            <div className="flex items-center mb-2">
              <Music size={16} className="mr-2 text-muted-foreground" />
              <p className="text-sm font-medium">Select Ringtone</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
              {availableRingtones.map((ringtone) => (
                <div key={ringtone.id} className="flex items-center justify-between mb-2 last:mb-0">
                  <label htmlFor={ringtone.id} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={ringtone.id}
                      name="ringtone"
                      checked={settings.ringtone === ringtone.src}
                      onChange={() => handleRingtoneChange(ringtone.src)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{ringtone.name}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => playRingtone(ringtone.src)}
                    className="text-xs text-primary hover:underline"
                  >
                    Play
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsSection;
