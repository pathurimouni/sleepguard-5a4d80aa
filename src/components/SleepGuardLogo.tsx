
import React from 'react';
import { Moon } from 'lucide-react';

interface SleepGuardLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  className?: string;
}

const SleepGuardLogo: React.FC<SleepGuardLogoProps> = ({ 
  size = 'md', 
  withText = true,
  className = '' 
}) => {
  const sizeMap = {
    sm: { logo: 24, text: 'text-lg' },
    md: { logo: 32, text: 'text-xl' },
    lg: { logo: 48, text: 'text-2xl' },
    xl: { logo: 64, text: 'text-3xl' }
  };
  
  const selectedSize = sizeMap[size];
  
  return (
    <div className={`flex items-center ${className}`}>
      <div className="bg-primary/10 rounded-full p-2 flex items-center justify-center">
        <Moon
          size={selectedSize.logo}
          className="text-primary"
          fill="rgba(var(--primary), 0.2)"
        />
      </div>
      
      {withText && (
        <div className={`ml-3 font-bold ${selectedSize.text}`}>
          <span className="text-primary">Sleep</span>
          <span className="text-slate-600 dark:text-slate-300">Guard</span> {/* Changed from default text color to slate for light/dark modes */}
        </div>
      )}
    </div>
  );
};

export default SleepGuardLogo;
