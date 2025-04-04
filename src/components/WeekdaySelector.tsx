
import React from 'react';

interface WeekdaySelectorProps {
  selectedDays: boolean[];
  onChange: (index: number, selected: boolean) => void;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WeekdaySelector: React.FC<WeekdaySelectorProps> = ({ selectedDays = [true, true, true, true, true, true, true], onChange }) => {
  // Ensure selectedDays is always a valid array with 7 elements
  const validSelectedDays = Array.isArray(selectedDays) && selectedDays.length === 7 
    ? selectedDays 
    : [true, true, true, true, true, true, true];

  return (
    <div className="flex flex-wrap gap-2 justify-between">
      {weekdays.map((day, index) => (
        <button
          key={day}
          type="button"
          onClick={() => onChange(index, !validSelectedDays[index])}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors
            ${validSelectedDays[index] 
              ? 'bg-primary text-primary-foreground font-medium' 
              : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
            }`}
          aria-pressed={validSelectedDays[index]}
        >
          {day}
        </button>
      ))}
    </div>
  );
};

export default WeekdaySelector;
