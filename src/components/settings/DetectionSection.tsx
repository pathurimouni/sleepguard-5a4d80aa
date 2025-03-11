
import React from "react";
import { Sliders, Clock, Calendar } from "lucide-react";
import TimeRangePicker from "@/components/TimeRangePicker";
import WeekdaySelector from "@/components/WeekdaySelector";
import { UserSettings } from "@/utils/storage";

interface DetectionSectionProps {
  settings: UserSettings;
  handleChange: (field: keyof UserSettings, value: any) => void;
  handleScheduleChange: (startTime: string, endTime: string) => void;
  handleWeekdayChange: (weekday: number, checked: boolean) => void;
}

const DetectionSection: React.FC<DetectionSectionProps> = ({ 
  settings, 
  handleChange, 
  handleScheduleChange, 
  handleWeekdayChange 
}) => {
  return (
    <div>
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
    </div>
  );
};

export default DetectionSection;
