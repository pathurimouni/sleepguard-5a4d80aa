
// Define interfaces for our data structures
export interface SleepSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  apneaEvents: ApneaEvent[];
  duration?: number; // in minutes
}

export interface ApneaEvent {
  id: string;
  timestamp: Date;
  duration: number; // in seconds
  type: 'breathing_pause' | 'movement' | 'unknown';
  severity: 'mild' | 'moderate' | 'severe';
}

export interface UserSettings {
  alertTypes: {
    onScreen: boolean;
    vibration: boolean;
    sound: boolean;
  };
  ringtone: string;
  detectionMode: 'manual' | 'auto';
  sensitivity: number; // 1-10 scale
  dataRetentionDays: number;
  schedule: {
    startTime: string;
    endTime: string;
    weekdays: boolean[]; // Sunday to Saturday
  };
}

// Default settings
export const defaultSettings: UserSettings = {
  alertTypes: {
    onScreen: true,
    vibration: true,
    sound: false,
  },
  ringtone: "/sounds/classic-beep.mp3",
  detectionMode: 'manual',
  sensitivity: 5,
  dataRetentionDays: 30,
  schedule: {
    startTime: '22:00',
    endTime: '07:00',
    weekdays: [true, true, true, true, true, true, true], // All days enabled by default
  },
};

// Storage keys
const SESSIONS_KEY = 'sleep-apnea-sessions';
const SETTINGS_KEY = 'sleep-apnea-settings';
const CURRENT_SESSION_KEY = 'sleep-apnea-current-session';

// Helper functions
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Save and retrieve sessions
export const saveSleepSession = (session: SleepSession): void => {
  const sessions = getSleepSessions();
  sessions.push(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

export const getSleepSessions = (): SleepSession[] => {
  const sessionsJson = localStorage.getItem(SESSIONS_KEY);
  if (!sessionsJson) return [];
  
  try {
    const sessions = JSON.parse(sessionsJson);
    // Convert string dates back to Date objects
    return sessions.map((session: any) => ({
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined,
      apneaEvents: session.apneaEvents.map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Error parsing sleep sessions', error);
    return [];
  }
};

export const deleteAllSessions = (): void => {
  localStorage.removeItem(SESSIONS_KEY);
};

// Save and retrieve settings
export const saveUserSettings = (settings: UserSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getUserSettings = (): UserSettings => {
  const settingsJson = localStorage.getItem(SETTINGS_KEY);
  if (!settingsJson) return defaultSettings;
  
  try {
    const savedSettings = JSON.parse(settingsJson);
    // Ensure ringtone field exists even in older saved settings
    if (!savedSettings.ringtone) {
      savedSettings.ringtone = defaultSettings.ringtone;
    }
    return savedSettings;
  } catch (error) {
    console.error('Error parsing user settings', error);
    return defaultSettings;
  }
};

// Current session management
export const startNewSession = (): SleepSession => {
  const session: SleepSession = {
    id: generateId(),
    startTime: new Date(),
    apneaEvents: [],
  };
  
  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  return session;
};

export const getCurrentSession = (): SleepSession | null => {
  const sessionJson = localStorage.getItem(CURRENT_SESSION_KEY);
  if (!sessionJson) return null;
  
  try {
    const session = JSON.parse(sessionJson);
    return {
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined,
      apneaEvents: session.apneaEvents.map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      })),
    };
  } catch (error) {
    console.error('Error parsing current session', error);
    return null;
  }
};

export const addApneaEvent = (event: Omit<ApneaEvent, 'id'>): void => {
  const session = getCurrentSession();
  if (!session) return;
  
  const newEvent: ApneaEvent = {
    ...event,
    id: generateId(),
  };
  
  session.apneaEvents.push(newEvent);
  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
};

export const endCurrentSession = (): SleepSession | null => {
  const session = getCurrentSession();
  if (!session) return null;
  
  session.endTime = new Date();
  session.duration = (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60);
  
  saveSleepSession(session);
  localStorage.removeItem(CURRENT_SESSION_KEY);
  
  return session;
};
