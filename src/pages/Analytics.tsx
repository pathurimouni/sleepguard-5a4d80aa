import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  BarChart2, FileDown, ChevronDown, ChevronUp, FileText, 
  Calendar, Clock, AlertTriangle, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/utils/auth";
import { supabase } from "@/integrations/supabase/client";
import { DetectionSession, DetectionEvent } from "@/integrations/supabase/customTypes";

interface SessionWithEvents {
  session: DetectionSession;
  events: DetectionEvent[];
}

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [sessions, setSessions] = useState<DetectionSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionWithEvents | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          toast.error("You must be logged in to view analytics");
          navigate("/login");
          return;
        }
        
        setUser(currentUser);
        
        await fetchSessions(currentUser.id, timeRange);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  useEffect(() => {
    if (user) {
      fetchSessions(user.id, timeRange);
    }
  }, [timeRange, user]);
  
  const fetchSessions = async (userId: string, range: 'week' | 'month' | 'all') => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('detection_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });
      
      if (range === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        query = query.gte('start_time', lastWeek.toISOString());
      } else if (range === 'month') {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        query = query.gte('start_time', lastMonth.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching sessions:", error);
        toast.error("Failed to load sessions");
        return;
      }
      
      setSessions(data || []);
    } catch (error) {
      console.error("Error in fetchSessions:", error);
      toast.error("Failed to fetch sessions");
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadSessionDetails = async (sessionId: string) => {
    try {
      setIsLoadingSession(true);
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('detection_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        toast.error("Failed to load session details");
        return;
      }
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('detection_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      
      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        toast.error("Failed to load session events");
        return;
      }
      
      setSelectedSession({
        session: sessionData,
        events: eventsData || []
      });
    } catch (error) {
      console.error("Error in loadSessionDetails:", error);
      toast.error("Failed to load session details");
    } finally {
      setIsLoadingSession(false);
    }
  };
  
  const exportSessionData = async (sessionId: string) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('detection_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        toast.error("Failed to export session data");
        return;
      }
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('detection_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      
      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        toast.error("Failed to export session events");
        return;
      }
      
      const exportData = {
        session: sessionData,
        events: eventsData || [],
        exported_at: new Date().toISOString(),
        user_id: user.id
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `apnea_session_${sessionId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast.success("Session data exported successfully");
    } catch (error) {
      console.error("Error exporting session data:", error);
      toast.error("Failed to export session data");
    }
  };
  
  const calculateOverallStats = () => {
    if (sessions.length === 0) return null;
    
    const totalDuration = sessions.reduce((sum, session) => 
      sum + (session.duration || 0), 0);
    
    const totalApneaEvents = sessions.reduce((sum, session) => 
      sum + session.apnea_count, 0);
    
    const avgSeverityScore = sessions.reduce((sum, session) => 
      sum + session.severity_score, 0) / sessions.length;
    
    const totalNormalEvents = sessions.reduce((sum, session) => 
      sum + session.normal_count, 0);
    
    const totalEvents = totalApneaEvents + totalNormalEvents;
    const apneaRate = totalEvents > 0 
      ? (totalApneaEvents / totalEvents) * 100 
      : 0;
    
    return {
      totalSessions: sessions.length,
      totalDuration,
      totalApneaEvents,
      avgSeverityScore,
      apneaRate
    };
  };
  
  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return "N/A";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [
      hours > 0 ? `${hours}h` : "",
      minutes > 0 ? `${minutes}m` : "",
      `${secs}s`
    ].filter(Boolean).join(" ");
  };
  
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  const formatTime = (dateString: string): string => {
    return format(new Date(dateString), "h:mm a");
  };
  
  const getSeverityText = (score: number): string => {
    if (score < 30) return "Mild";
    if (score < 60) return "Moderate";
    return "Severe";
  };
  
  const getSeverityColor = (score: number): string => {
    if (score < 30) return "text-green-500";
    if (score < 60) return "text-yellow-500";
    return "text-red-500";
  };
  
  const renderSessions = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (sessions.length === 0) {
      return (
        <div className="text-center py-8">
          <BarChart2 className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
          <h3 className="text-lg font-medium mb-1">No Sessions Found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Start a detection session to track your sleep apnea patterns
          </p>
          <Button
            onClick={() => navigate("/detection")}
          >
            Start Detection
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {sessions.map(session => (
          <Card 
            key={session.id} 
            className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            onClick={() => loadSessionDetails(session.id)}
          >
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {formatDate(session.start_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatTime(session.start_time)}
                  </span>
                </div>
              </div>
              
              <div className="mt-2 md:mt-0 md:text-right">
                <div className="text-sm mb-1">
                  Duration: <span className="font-medium">{formatDuration(session.duration)}</span>
                </div>
                <div className="flex items-center gap-2 justify-start md:justify-end">
                  <span className={`text-sm font-medium ${getSeverityColor(session.severity_score)}`}>
                    {getSeverityText(session.severity_score)}
                  </span>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {session.apnea_count} events
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };
  
  const renderSessionDetails = () => {
    if (!selectedSession) return null;
    
    const { session, events } = selectedSession;
    const apneaEvents = events.filter(e => e.label === 'apnea');
    const totalEvents = events.length;
    const apneaRate = totalEvents > 0 
      ? (apneaEvents.length / totalEvents) * 100 
      : 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">
                Session Details
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatDate(session.start_time)} at {formatTime(session.start_time)}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSession(null)}
            >
              Back to Sessions
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
              <p className="text-muted-foreground text-xs mb-1">Duration</p>
              <p className="text-xl font-semibold">{formatDuration(session.duration)}</p>
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
              <p className="text-muted-foreground text-xs mb-1">Apnea Events</p>
              <p className="text-xl font-semibold">{session.apnea_count}</p>
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
              <p className="text-muted-foreground text-xs mb-1">Apnea Rate</p>
              <p className="text-xl font-semibold">
                {apneaRate.toFixed(1)}%
              </p>
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
              <p className="text-muted-foreground text-xs mb-1">Severity Score</p>
              <p className={`text-xl font-semibold ${getSeverityColor(session.severity_score)}`}>
                {session.severity_score.toFixed(1)}
              </p>
            </div>
          </div>
          
          <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Severity Level</h3>
              <span className={`text-sm font-medium ${getSeverityColor(session.severity_score)}`}>
                {getSeverityText(session.severity_score)}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full ${
                  session.severity_score < 30 
                    ? 'bg-green-500' 
                    : session.severity_score < 60 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, session.severity_score)}%` }}
              />
            </div>
          </div>
          
          {events.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Event Timeline</h3>
              <div className="w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-md relative overflow-hidden">
                {events.map((event, index) => {
                  const isApnea = event.label === 'apnea';
                  const position = (index / Math.max(events.length - 1, 1)) * 100;
                  const confidence = event.confidence * 100;
                  
                  return (
                    <div 
                      key={event.id}
                      className={`absolute w-2 h-full ${isApnea ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ 
                        left: `${position}%`, 
                        opacity: confidence / 100,
                        width: `${Math.max(3, confidence / 10)}px`
                      }}
                      title={`${event.label} (${confidence.toFixed(0)}%)`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Session Start</span>
                <span>Session End</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No events recorded for this session
            </div>
          )}
          
          <Separator className="my-6" />
          
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => exportSessionData(session.id)}
              className="flex items-center gap-2"
            >
              <FileDown size={16} />
              Export Session Data
            </Button>
          </div>
        </Card>
        
        {events.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Detection Events</h3>
            
            <Accordion type="single" collapsible className="w-full">
              {events.map((event, index) => (
                <AccordionItem key={event.id} value={event.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-3 h-3 rounded-full ${
                          event.label === 'apnea' ? 'bg-red-500' : 'bg-green-500'
                        }`} 
                      />
                      <span className="font-medium">
                        {event.label === 'apnea' ? 'Apnea Event' : 'Normal Breathing'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), "h:mm:ss a")}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-6 pt-2 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
                          <p className="text-sm">{format(new Date(event.timestamp), "MMM d, yyyy h:mm:ss a")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                          <p className="text-sm">{(event.confidence * 100).toFixed(1)}%</p>
                        </div>
                        {event.duration !== null && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Duration</p>
                            <p className="text-sm">{formatDuration(event.duration)}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Confidence Level</p>
                        <Progress 
                          value={event.confidence * 100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        )}
      </motion.div>
    );
  };
  
  const renderOverallStats = () => {
    const stats = calculateOverallStats();
    
    if (!stats) return null;
    
    return (
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Overall Statistics</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
            <p className="text-muted-foreground text-xs mb-1">Sessions</p>
            <p className="text-xl font-semibold">{stats.totalSessions}</p>
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
            <p className="text-muted-foreground text-xs mb-1">Total Hours</p>
            <p className="text-xl font-semibold">{(stats.totalDuration / 3600).toFixed(1)}</p>
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
            <p className="text-muted-foreground text-xs mb-1">Apnea Events</p>
            <p className="text-xl font-semibold">{stats.totalApneaEvents}</p>
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
            <p className="text-muted-foreground text-xs mb-1">Avg. Severity</p>
            <p className={`text-xl font-semibold ${getSeverityColor(stats.avgSeverityScore)}`}>
              {stats.avgSeverityScore.toFixed(1)}
            </p>
          </div>
        </div>
      </Card>
    );
  };
  
  return (
    <PageTransition>
      <div className="page-container pt-8 md:pt-16 pb-24">
        <div className="page-content">
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl font-bold mb-2"
            >
              Sleep Analytics
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Review and analyze your sleep apnea detection history
            </motion.p>
          </div>
          
          {selectedSession ? (
            renderSessionDetails()
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {renderOverallStats()}
              
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Detection Sessions</h2>
                
                <div className="flex space-x-2">
                  <Button
                    variant={timeRange === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant={timeRange === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('month')}
                  >
                    Month
                  </Button>
                  <Button
                    variant={timeRange === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange('all')}
                  >
                    All
                  </Button>
                </div>
              </div>
              
              {renderSessions()}
              
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate("/detection")}
                  className="flex items-center gap-2"
                >
                  <FileText size={16} />
                  Start New Session
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Analytics;
