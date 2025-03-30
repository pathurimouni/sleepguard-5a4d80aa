
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, Database, Activity, Settings, FileText, 
  BarChart2, Award, LogOut
} from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/utils/auth";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminRecordingsView from "@/components/admin/AdminRecordingsView";

interface AdminDashboardProps {
  user?: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRecordings: 0,
    totalApneaDetected: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        
        if (!session.session) {
          toast.error("Not authenticated");
          navigate("/admin/login");
          return;
        }
        
        // Check admin role
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.session.user.id)
          .single();
          
        if (error || !roles || roles.role !== 'admin') {
          toast.error("Insufficient permissions");
          navigate("/");
          return;
        }
        
        setIsAdmin(true);
        fetchDashboardStats();
        setupRealtimeSubscription();
      } catch (error) {
        console.error("Admin check error:", error);
        toast.error("Authentication error");
        navigate("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [navigate]);

  const setupRealtimeSubscription = () => {
    // Setup realtime subscription for profiles table
    const profilesChannel = supabase
      .channel('public:profiles:changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        fetchDashboardStats();
      })
      .subscribe();
      
    // Setup subscription for recordings table
    const recordingsChannel = supabase
      .channel('public:breathing_recordings:changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'breathing_recordings' 
      }, () => {
        fetchDashboardStats();
      })
      .subscribe();
      
    // Setup subscription for analysis table
    const analysisChannel = supabase
      .channel('public:apnea_analysis:changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'apnea_analysis' 
      }, () => {
        fetchDashboardStats();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(recordingsChannel);
      supabase.removeChannel(analysisChannel);
    };
  };

  const fetchDashboardStats = async () => {
    try {
      // Get total users count
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get total recordings count
      const { count: recordingCount, error: recordingError } = await supabase
        .from('breathing_recordings')
        .select('*', { count: 'exact', head: true });
      
      // Get total apnea detections
      const { count: apneaCount, error: apneaError } = await supabase
        .from('apnea_analysis')
        .select('*', { count: 'exact', head: true })
        .eq('is_apnea', true);
      
      if (userError || recordingError || apneaError) {
        console.error("Error fetching stats:", userError || recordingError || apneaError);
        return;
      }
      
      setStats({
        totalUsers: userCount || 0,
        totalRecordings: recordingCount || 0,
        totalApneaDetected: apneaCount || 0,
      });
    } catch (error) {
      console.error("Stats fetch error:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out from admin panel");
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-breathe text-primary">
          Loading admin panel...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold"
          >
            Admin Dashboard
          </motion.h1>
          
          <Button 
            variant="destructive" 
            onClick={handleLogout}
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Users className="mr-2 text-primary" size={20} />
                Users
              </CardTitle>
              <CardDescription>Total registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Database className="mr-2 text-primary" size={20} />
                Recordings
              </CardTitle>
              <CardDescription>Total breathing recordings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.totalRecordings}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Activity className="mr-2 text-primary" size={20} />
                Apnea Events
              </CardTitle>
              <CardDescription>Total apnea detections</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.totalApneaDetected}</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-6">
              <TabsTrigger value="overview" className="flex items-center">
                <BarChart2 size={16} className="mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center">
                <Users size={16} className="mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="recordings" className="flex items-center">
                <FileText size={16} className="mr-2" />
                Recordings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center">
                <Award size={16} className="mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings size={16} className="mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard Overview</CardTitle>
                  <CardDescription>
                    Welcome to the SleepGuard admin panel. Manage users, view recordings, and access analytics.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Use the tabs above to navigate to different sections of the admin panel.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-accent/30 p-4 rounded-md">
                      <h3 className="font-semibold mb-2 flex items-center">
                        <Users size={16} className="mr-2" />
                        User Management
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        View, edit and manage user accounts, assign roles and permissions.
                      </p>
                    </div>
                    
                    <div className="bg-accent/30 p-4 rounded-md">
                      <h3 className="font-semibold mb-2 flex items-center">
                        <FileText size={16} className="mr-2" />
                        Recordings Management
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Browse all user recordings, view analysis results, and manage data.
                      </p>
                    </div>
                    
                    <div className="bg-accent/30 p-4 rounded-md">
                      <h3 className="font-semibold mb-2 flex items-center">
                        <Award size={16} className="mr-2" />
                        Analytics & Reports
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Access detailed statistics and generate reports on sleep apnea data.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="users">
              <AdminUserManagement />
            </TabsContent>
            
            <TabsContent value="recordings">
              <AdminRecordingsView />
            </TabsContent>
            
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics & Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    This section will provide analytics dashboards and reporting tools.
                  </p>
                  <div className="p-4 border border-dashed rounded-md flex items-center justify-center h-60">
                    <p className="text-muted-foreground">Analytics dashboard coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Configure admin panel settings and preferences.
                  </p>
                  <div className="p-4 border border-dashed rounded-md flex items-center justify-center h-60">
                    <p className="text-muted-foreground">Settings panel coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;
