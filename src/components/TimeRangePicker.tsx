
import React from 'react';

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onChange: (startTime: string, endTime: string) => void;
}

const TimeRangePicker: React.FC<TimeRangePickerProps> = ({ 
  startTime, 
  endTime, 
  onChange 
}) => {
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, endTime);
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(startTime, e.target.value);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm mb-1">
            Start Time
          </label>
          <input
            type="time"
            id="startTime"
            value={startTime}
            onChange={handleStartTimeChange}
            className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent"
          />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-sm mb-1">
            End Time
          </label>
          <input
            type="time"
            id="endTime"
            value={endTime}
            onChange={handleEndTimeChange}
            className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tracking will automatically start and stop at these times on selected days.
      </p>
    </div>
  );
};

export default TimeRangePicker;
