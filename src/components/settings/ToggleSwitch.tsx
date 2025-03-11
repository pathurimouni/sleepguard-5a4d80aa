
import React from "react";

interface ToggleSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, label, checked, onChange }) => {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="flex items-center space-x-2">
        <span>{label}</span>
      </label>
      <div className="relative inline-flex">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`block h-6 w-10 rounded-full transition-colors ${
            checked ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
          }`}
        />
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
          onClick={() => onChange(!checked)}
        />
      </div>
    </div>
  );
};

export default ToggleSwitch;
