
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sliders, Bell, Trash2, Database, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import ActionButton from "@/components/ActionButton";
import { UserSettings, getUserSettings, saveUserSettings, defaultSettings, deleteAllSessions } from "@/utils/storage";
import TimeRangePicker from "@/components/TimeRangePicker";
import WeekdaySelector from "@/components/WeekdaySelector";

const Settings = () => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const userSettings = getUserSettings();
    setSettings(userSettings);
  }, []);

  const handleChange = (field: keyof UserSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleAlertTypeChange = (alertType: keyof UserSettings["alertTypes"], checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      alertTypes: {
        ...prev.alertTypes,
        [alertType]: checked,
      },
    }));
    setIsDirty(true);
  };

  const handleScheduleChange = (startTime: string, endTime: string) => {
    setSettings((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        startTime,
        endTime,
      },
    }));
    setIsDirty(true);
  };

  const handleWeekdayChange = (weekday: number, checked: boolean) => {
    const updatedWeekdays = [...settings.schedule.weekdays];
    updatedWeekdays[weekday] = checked;
    
    setSettings((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        weekdays: updatedWeekdays,
      },
    }));
    setIsDirty(true);
  };

  const saveSettings = () => {
    try {
      saveUserSettings(settings);
      setIsDirty(false);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handleDeleteAllData = () => {
    if (window.confirm("Are you sure you want to delete all your sleep data? This cannot be undone.")) {
      try {
        deleteAllSessions();
        toast.success("All sleep data has been deleted");
      } catch (error) {
        console.error("Error deleting data:", error);
        toast.error("Failed to delete sleep data");
      }
    }
  };

  const resetToDefaults = () => {
    if (window.confirm("Reset all settings to default values?")) {
      setSettings(defaultSettings);
      setIsDirty(true);
    }
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
              Settings
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Customize your sleep tracking experience
            </motion.p>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center mb-4">
                <Bell size={20} className="mr-2 text-primary" />
                <h2 className="text-xl font-semibold">Alerts</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="onScreen" className="flex items-center space-x-2">
                    <span>On-Screen Alerts</span>
                  </label>
                  <div className="relative inline-flex">
                    <input
                      type="checkbox"
                      id="onScreen"
                      checked={settings.alertTypes.onScreen}
                      onChange={(e) => handleAlertTypeChange("onScreen", e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`block h-6 w-10 rounded-full transition-colors ${
                        settings.alertTypes.onScreen ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                    <div
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        settings.alertTypes.onScreen ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="vibration" className="flex items-center space-x-2">
                    <span>Vibration</span>
                  </label>
                  <div className="relative inline-flex">
                    <input
                      type="checkbox"
                      id="vibration"
                      checked={settings.alertTypes.vibration}
                      onChange={(e) => handleAlertTypeChange("vibration", e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`block h-6 w-10 rounded-full transition-colors ${
                        settings.alertTypes.vibration ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                    <div
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        settings.alertTypes.vibration ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="sound" className="flex items-center space-x-2">
                    <span>Sound</span>
                  </label>
                  <div className="relative inline-flex">
                    <input
                      type="checkbox"
                      id="sound"
                      checked={settings.alertTypes.sound}
                      onChange={(e) => handleAlertTypeChange("sound", e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`block h-6 w-10 rounded-full transition-colors ${
                        settings.alertTypes.sound ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                    <div
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        settings.alertTypes.sound ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center mb-4">
                <Sliders size={20} className="mr-2 text-primary" />
                <h2 className="text-xl font-semibold">Detection</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2">Detection Mode</p>
                  <div className="flex space-x-4">
                    <label
                      htmlFor="manual"
                      className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md border cursor-pointer transition-colors ${
                        settings.detectionMode === "manual"
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        id="manual"
                        name="detectionMode"
                        value="manual"
                        checked={settings.detectionMode === "manual"}
                        onChange={() => handleChange("detectionMode", "manual")}
                        className="sr-only"
                      />
                      <span>Manual</span>
                    </label>
                    <label
                      htmlFor="auto"
                      className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md border cursor-pointer transition-colors ${
                        settings.detectionMode === "auto"
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        id="auto"
                        name="detectionMode"
                        value="auto"
                        checked={settings.detectionMode === "auto"}
                        onChange={() => handleChange("detectionMode", "auto")}
                        className="sr-only"
                      />
                      <span>Auto</span>
                    </label>
                  </div>
                </div>

                {settings.detectionMode === "auto" && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <Clock size={16} className="mr-2 text-primary" />
                        <h3 className="font-medium">Schedule</h3>
                      </div>
                      <TimeRangePicker 
                        startTime={settings.schedule.startTime} 
                        endTime={settings.schedule.endTime}
                        onChange={handleScheduleChange}
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center mb-2">
                        <Calendar size={16} className="mr-2 text-primary" />
                        <h3 className="font-medium">Active Days</h3>
                      </div>
                      <WeekdaySelector 
                        selectedDays={settings.schedule.weekdays}
                        onChange={handleWeekdayChange}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between mb-2">
                    <label htmlFor="sensitivity" className="text-sm">
                      Detection Sensitivity
                    </label>
                    <span className="text-sm font-medium">{settings.sensitivity}</span>
                  </div>
                  <input
                    type="range"
                    id="sensitivity"
                    min="1"
                    max="10"
                    step="1"
                    value={settings.sensitivity}
                    onChange={(e) => handleChange("sensitivity", parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center mb-4">
                <Database size={20} className="mr-2 text-primary" />
                <h2 className="text-xl font-semibold">Data Management</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label htmlFor="dataRetention" className="text-sm">
                      Data Retention Period
                    </label>
                    <span className="text-sm font-medium">{settings.dataRetentionDays} days</span>
                  </div>
                  <input
                    type="range"
                    id="dataRetention"
                    min="7"
                    max="90"
                    step="1"
                    value={settings.dataRetentionDays}
                    onChange={(e) => handleChange("dataRetentionDays", parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <ActionButton
                    variant="destructive"
                    size="md"
                    className="w-full"
                    icon={<Trash2 size={16} />}
                    onClick={handleDeleteAllData}
                  >
                    Delete All Sleep Data
                  </ActionButton>
                </div>
              </div>
            </motion.div>

            <div className="flex justify-between pt-4">
              <ActionButton
                variant="outline"
                size="md"
                onClick={resetToDefaults}
              >
                Reset to Defaults
              </ActionButton>

              <ActionButton
                variant={isDirty ? "primary" : "secondary"}
                size="md"
                onClick={saveSettings}
                disabled={!isDirty}
              >
                Save Settings
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Settings;
