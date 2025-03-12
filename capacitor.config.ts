
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.sleepguard',
  appName: 'SleepGuard',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development, enable local network access and configure live reload
    allowNavigation: ['*'],
    url: 'https://14fac35b-04b4-4b95-a4e2-e9c453a57716.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    // Configure permissions for the app
    Permissions: {
      microphone: 'Always',
    },
    // Prevent screen from sleeping during tracking
    KeepAwake: {
      isEnabled: true
    }
  }
};

export default config;
