
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import ActionButton from "@/components/ActionButton";
import { UserSettings, getUserSettings, saveUserSettings, defaultSettings, deleteAllSessions } from "@/utils/storage";
import { getCurrentUser } from "@/utils/auth";
import { User } from "@/utils/auth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/auth";

// Import components
import ProfileSection from "@/components/settings/ProfileSection";
import AlertsSection from "@/components/settings/AlertsSection";
import DetectionSection from "@/components/settings/DetectionSection";
import DataManagementSection from "@/components/settings/DataManagementSection";

const Settings = () => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const userSettings = getUserSettings();
    setSettings(userSettings);
    
    // Fetch current user data
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Redirect to login if not authenticated
      if (!currentUser) {
        navigate("/login");
      }
    };
    
    fetchUser();
    
    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          navigate("/login");
        }
      }
    );
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

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
  
  const handleRingtoneChange = (ringtone: string) => {
    setSettings((prev) => ({
      ...prev,
      ringtone: ringtone,
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

  // If not authenticated, show minimal loading state
  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading settings...</div>;
  }

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
                <UserRound size={20} className="mr-2 text-primary" />
                <h2 className="text-xl font-semibold">Profile</h2>
              </div>
              
              <ProfileSection user={user} setUser={setUser} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-6"
            >
              <AlertsSection 
                settings={settings} 
                handleAlertTypeChange={handleAlertTypeChange}
                handleRingtoneChange={handleRingtoneChange}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-6"
            >
              <DetectionSection 
                settings={settings}
                handleChange={handleChange}
                handleScheduleChange={handleScheduleChange}
                handleWeekdayChange={handleWeekdayChange}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-panel p-6"
            >
              <DataManagementSection 
                settings={settings}
                handleChange={handleChange}
                handleDeleteAllData={handleDeleteAllData}
              />
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
