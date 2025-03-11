
import React from "react";
import { Database, Trash2 } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import { UserSettings } from "@/utils/storage";

interface DataManagementSectionProps {
  settings: UserSettings;
  handleChange: (field: keyof UserSettings, value: any) => void;
  handleDeleteAllData: () => void;
}

const DataManagementSection: React.FC<DataManagementSectionProps> = ({ 
  settings, 
  handleChange, 
  handleDeleteAllData 
}) => {
  return (
    <div>
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
    </div>
  );
};

export default DataManagementSection;
