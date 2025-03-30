import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Moon, Activity, BarChart2, Stethoscope } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import StatusCard from "@/components/StatusCard";
import ActionButton from "@/components/ActionButton";
import SleepGuardLogo from "@/components/SleepGuardLogo";
import { SleepSession, getCurrentSession, getSleepSessions } from "@/utils/storage";
import { getUserRecordings, getRecordingAnalysis } from "@/utils/recordingService";
import { getCurrentUser } from "@/utils/auth";

const Index = () => {
  const [recentSessions, setRecentSessions] = useState<SleepSession[]>([]);
  const [currentSession, setCurrentSession] = useState<SleepSession | null>(null);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    avgDuration: 0,
    avgEvents: 0,
  });
  const [latestApneaStatus, setLatestApneaStatus] = useState<{
    hasApnea: boolean;
    severity: string;
    eventsPerHour: number;
  } | null>(null);
  const [isLoadingApnea, setIsLoadingApnea] = useState(true);

  useEffect(() => {
    const sessions = getSleepSessions().sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    ).slice(0, 5);
    
    setRecentSessions(sessions);
    setCurrentSession(getCurrentSession());
    
    if (sessions.length > 0) {
      const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      const totalEvents = sessions.reduce((sum, session) => sum + session.apneaEvents.length, 0);
      
      setSessionStats({
        total: sessions.length,
        avgDuration: Math.round(totalDuration / sessions.length),
        avgEvents: Math.round(totalEvents / sessions.length),
      });
    }
    
    loadLatestApneaStatus();
  }, []);

  const loadLatestApneaStatus = async () => {
    try {
      setIsLoadingApnea(true);
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        setIsLoadingApnea(false);
        return;
      }
      
      const recordings = await getUserRecordings(currentUser.id);
      
      if (recordings.length === 0) {
        setIsLoadingApnea(false);
        return;
      }
      
      const completedRecordings = recordings.filter(r => r.analysis_complete);
      
      if (completedRecordings.length === 0) {
        setIsLoadingApnea(false);
        return;
      }
      
      const latestRecording = completedRecordings[0];
      const analysis = await getRecordingAnalysis(latestRecording.id);
      
      if (analysis) {
        setLatestApneaStatus({
          hasApnea: analysis.is_apnea,
          severity: analysis.severity,
          eventsPerHour: analysis.events_per_hour
        });
      }
    } catch (error) {
      console.error("Error loading apnea status:", error);
    } finally {
      setIsLoadingApnea(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'moderate':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'mild':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    }
  };

  return (
    <PageTransition>
      <div className="page-container pt-8 md:pt-24 pb-24">
        <div className="page-content">
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex justify-center mb-4"
            >
              <SleepGuardLogo size="xl" />
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground"
            >
              Your personal sleep apnea detection assistant
            </motion.p>
          </div>

          {latestApneaStatus && !isLoadingApnea && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-6 mb-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <Stethoscope size={20} className="mr-2 text-primary" />
                    <h2 className="text-xl font-semibold">Latest Breathing Analysis</h2>
                  </div>
                  <p className="text-muted-foreground mt-1 mb-3">
                    Based on your most recent breathing recording
                  </p>
                </div>
                
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${getSeverityColor(latestApneaStatus.severity)}`}>
                  {latestApneaStatus.severity.charAt(0).toUpperCase() + latestApneaStatus.severity.slice(1)}
                  {' '}
                  ({latestApneaStatus.eventsPerHour} events/hour)
                </div>
              </div>
              
              <div className="mt-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                <Link to="/analysis" className="flex-1">
                  <button className="w-full bg-primary text-primary-foreground rounded-md py-2 px-4 text-sm font-medium flex items-center justify-center">
                    <BarChart2 size={16} className="mr-2" />
                    View Analysis
                  </button>
                </Link>
                <Link to="/tracking" className="flex-1">
                  <button className="w-full bg-slate-200 dark:bg-slate-700 rounded-md py-2 px-4 text-sm font-medium flex items-center justify-center">
                    <Moon size={16} className="mr-2" />
                    Start Tracking
                  </button>
                </Link>
              </div>
            </motion.div>
          )}

          {currentSession ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-6 mb-8 text-center"
            >
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 mb-4">
                Active Session
              </span>
              <h2 className="text-2xl font-semibold mb-4">Sleep tracking in progress</h2>
              <p className="text-muted-foreground mb-6">
                Started at {formatDate(currentSession.startTime)}
              </p>
              <Link to="/tracking">
                <ActionButton variant="primary" size="lg">
                  Continue Tracking
                </ActionButton>
              </Link>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-8 flex flex-col items-center"
            >
              <Link to="/tracking">
                <ActionButton 
                  variant="primary" 
                  size="lg"
                  icon={<Activity size={18} />}
                >
                  Start Tracking
                </ActionButton>
              </Link>
            </motion.div>
          )}

          <div className="mb-8">
            <h3 className="section-title">Statistics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatusCard
                title="Total Sessions"
                value={sessionStats.total}
                icon={<Moon size={18} />}
              />
              <StatusCard
                title="Avg. Duration"
                value={formatDuration(sessionStats.avgDuration)}
                icon={<Clock size={18} />}
              />
              <StatusCard
                title="Avg. Events"
                value={sessionStats.avgEvents}
                icon={<Activity size={18} />}
              />
            </div>
          </div>

          <div>
            <h3 className="section-title">Recent Sessions</h3>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <motion.div
                    key={session.id}
                    whileHover={{ y: -2 }}
                    className="glass-panel glass-panel-hover p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{formatDate(session.startTime)}</div>
                        <div className="text-sm text-muted-foreground">
                          Duration: {formatDuration(session.duration)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-primary">
                          {session.apneaEvents.length} {session.apneaEvents.length === 1 ? 'event' : 'events'}
                        </div>
                        <BarChart2 size={16} className="text-muted-foreground" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-panel p-8 text-center">
                <p className="text-muted-foreground">No sessions recorded yet</p>
                <p className="text-sm mt-2">Start tracking your sleep to see data here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Index;
