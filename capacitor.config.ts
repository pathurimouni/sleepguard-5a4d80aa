
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.sleepguard',
  appName: 'SleepGuard',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development, enable local network access
    allowNavigation: ['*'],
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
