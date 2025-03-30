
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Edit, Trash2, CheckCircle, XCircle, Plus, ShieldAlert, Shield, Users, Database, FileText } from "lucide-react";
import { supabase } from "@/utils/auth";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at?: string;
  is_admin?: boolean;
}

interface RecordingData {
  id: string;
  recording_date: string;
  duration: number;
  analysis_complete: boolean;
  is_apnea?: boolean;
  confidence?: number;
  severity?: string;
}

interface UserAnalytics {
  totalRecordings: number;
  apneaEvents: number;
  averageConfidence: number;
  lastActivity: string;
}

const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userRecordings, setUserRecordings] = useState<RecordingData[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    // Enable realtime subscriptions for user changes
    const channel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      // Get users from profiles table
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profileError) {
        console.error("Error fetching profiles:", profileError);
        toast.error("Failed to load user data");
        return;
      }
      
      // Get admin roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin');
        
      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }
      
      // Match roles with profiles
      const adminIds = roles ? roles.map(role => role.user_id) : [];
      
      // Get auth users data to access emails
      const { data: authResponse, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Error fetching auth users:", authError);
        // Fallback to using normal user data from session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // We'll do our best with available data
          const combinedUsers = profiles ? profiles.map(profile => {
            return {
              id: profile.id,
              username: profile.username || '',
              avatar_url: profile.avatar_url,
              email: 'Email requires admin key',
              created_at: new Date().toISOString(),
              is_admin: adminIds.includes(profile.id)
            };
          }) : [];
          
          setUsers(combinedUsers);
          setIsLoading(false);
          return;
        }
      }
      
      // Convert the users from the Supabase User type to our AuthUser type
      const authUsers = authResponse?.users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at
      })) || [];
      
      // Ensure profiles is never null/undefined before mapping
      const profilesData = profiles || [];
      
      // Combine profile data with auth data and role information
      const combinedUsers = profilesData.map(profile => {
        const authUser = authUsers.find(user => user.id === profile.id);
        return {
          id: profile.id,
          username: profile.username || '',
          avatar_url: profile.avatar_url,
          email: authUser?.email || 'Unknown',
          created_at: authUser?.created_at,
          is_admin: adminIds.includes(profile.id)
        };
      });
      
      setUsers(combinedUsers);
    } catch (error) {
      console.error("Error in user fetch:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setLoadingDetails(true);
    
    try {
      // Fetch user recordings
      const { data: recordings, error: recordingsError } = await supabase
        .from('breathing_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('recording_date', { ascending: false });
        
      if (recordingsError) {
        console.error("Error fetching recordings:", recordingsError);
        toast.error("Failed to load user recordings");
        return;
      }
      
      // Fetch analysis results for each recording
      const recordingsWithAnalysis = await Promise.all(
        recordings.map(async (recording) => {
          const { data: analysis } = await supabase
            .from('apnea_analysis')
            .select('*')
            .eq('recording_id', recording.id)
            .maybeSingle();
            
          return {
            ...recording,
            is_apnea: analysis?.is_apnea,
            confidence: analysis?.confidence,
            severity: analysis?.severity
          };
        })
      );
      
      setUserRecordings(recordingsWithAnalysis);
      
      // Calculate analytics
      const totalRecordings = recordingsWithAnalysis.length;
      const apneaEvents = recordingsWithAnalysis.filter(r => r.is_apnea).length;
      
      // Calculate average confidence if there are any recordings with analysis
      const recordingsWithConfidence = recordingsWithAnalysis.filter(r => r.confidence !== undefined);
      const averageConfidence = recordingsWithConfidence.length 
        ? recordingsWithConfidence.reduce((sum, r) => sum + (r.confidence || 0), 0) / recordingsWithConfidence.length
        : 0;
      
      // Get last activity date
      const lastActivity = recordingsWithAnalysis.length 
        ? new Date(recordingsWithAnalysis[0].recording_date).toLocaleDateString()
        : 'No activity';
      
      setUserAnalytics({
        totalRecordings,
        apneaEvents,
        averageConfidence,
        lastActivity
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser({ ...user });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editingUser.username,
          avatar_url: editingUser.avatar_url || ''
        })
        .eq('id', editingUser.id);
        
      if (error) {
        throw error;
      }
      
      toast.success("User updated successfully");
      setEditingUser(null);
      fetchUsers();
      
      // Update selected user if it was the one edited
      if (selectedUser && selectedUser.id === editingUser.id) {
        setSelectedUser({
          ...selectedUser,
          username: editingUser.username,
          avatar_url: editingUser.avatar_url
        });
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const confirmDeleteUser = (user: UserProfile) => {
    setEditingUser(user);
    setShowDeleteDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!editingUser) return;
    
    try {
      // This will use CASCADE to delete profile and associated data
      const { error } = await supabase.auth.admin.deleteUser(editingUser.id);
      
      if (error) {
        throw error;
      }
      
      toast.success("User deleted successfully");
      setShowDeleteDialog(false);
      setEditingUser(null);
      
      // Clear selected user if it was the one deleted
      if (selectedUser && selectedUser.id === editingUser.id) {
        setSelectedUser(null);
        setUserRecordings([]);
        setUserAnalytics(null);
      }
      
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleToggleAdminRole = (user: UserProfile) => {
    setEditingUser(user);
    setShowRoleDialog(true);
  };

  const confirmRoleChange = async () => {
    if (!editingUser) return;
    
    try {
      if (editingUser.is_admin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.id)
          .eq('role', 'admin');
          
        if (error) throw error;
        toast.success("Admin role removed");
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: editingUser.id,
            role: 'admin'
          });
          
        if (error) throw error;
        toast.success("Admin role granted");
      }
      
      setShowRoleDialog(false);
      setEditingUser(null);
      
      // Update selected user if it was the one modified
      if (selectedUser && selectedUser.id === editingUser.id) {
        setSelectedUser({
          ...selectedUser,
          is_admin: !editingUser.is_admin
        });
      }
      
      fetchUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error("Failed to update user role");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 text-primary" size={20} />
            User Management
          </CardTitle>
          <CardDescription>
            View and manage all users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-6">
            <div className="relative w-full max-w-sm">
              <Input
                type="search"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
            </div>
            
            <Button variant="default">
              <Plus size={16} className="mr-2" />
              Add User
            </Button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse-breathe text-primary">Loading users...</div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow 
                        key={user.id} 
                        className={selectedUser?.id === user.id ? "bg-muted" : ""}
                        onClick={() => handleSelectUser(user)}
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell className="font-medium">{user.username || 'No username'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.is_admin ? (
                            <Badge variant="default" className="bg-green-500">
                              <ShieldAlert size={14} className="mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline">User</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditUser(user);
                              }}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant={user.is_admin ? "destructive" : "default"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAdminRole(user);
                              }}
                            >
                              {user.is_admin ? (
                                <XCircle size={14} />
                              ) : (
                                <Shield size={14} />
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteUser(user);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User size={20} className="mr-2 text-primary" />
              User Details: {selectedUser.username || selectedUser.email}
            </CardTitle>
            <CardDescription>
              Detailed information and analytics for this user
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDetails ? (
              <div className="text-center py-4">
                <div className="animate-pulse-breathe text-primary">Loading user details...</div>
              </div>
            ) : (
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">
                    <Database size={16} className="mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="recordings">
                    <FileText size={16} className="mr-2" />
                    Recordings ({userRecordings.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">User Information</h3>
                      <div className="bg-accent/20 p-3 rounded-md">
                        <p className="text-sm"><span className="font-medium">Username:</span> {selectedUser.username || 'No username'}</p>
                        <p className="text-sm"><span className="font-medium">Email:</span> {selectedUser.email}</p>
                        <p className="text-sm"><span className="font-medium">User ID:</span> {selectedUser.id}</p>
                        <p className="text-sm"><span className="font-medium">Created:</span> {selectedUser.created_at ? formatDate(selectedUser.created_at) : 'Unknown'}</p>
                        <p className="text-sm"><span className="font-medium">Role:</span> {selectedUser.is_admin ? 'Admin' : 'User'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Analytics Summary</h3>
                      {userAnalytics ? (
                        <div className="bg-accent/20 p-3 rounded-md">
                          <p className="text-sm"><span className="font-medium">Total Recordings:</span> {userAnalytics.totalRecordings}</p>
                          <p className="text-sm"><span className="font-medium">Apnea Detected:</span> {userAnalytics.apneaEvents} recordings</p>
                          <p className="text-sm"><span className="font-medium">Detection Confidence (avg):</span> {(userAnalytics.averageConfidence * 100).toFixed(1)}%</p>
                          <p className="text-sm"><span className="font-medium">Last Activity:</span> {userAnalytics.lastActivity}</p>
                        </div>
                      ) : (
                        <div className="bg-accent/20 p-3 rounded-md">
                          <p className="text-muted-foreground">No analytics data available</p>
                        </div>
                      )}
                    </div>
                    
                    {userAnalytics && userAnalytics.totalRecordings > 0 && (
                      <div className="md:col-span-2 space-y-2">
                        <h3 className="text-sm font-medium">Sleep Apnea Rate</h3>
                        <div className="bg-accent/20 p-3 rounded-md">
                          <div className="mb-2">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Apnea detection rate: {((userAnalytics.apneaEvents / userAnalytics.totalRecordings) * 100).toFixed(1)}%</span>
                              <span>{userAnalytics.apneaEvents} of {userAnalytics.totalRecordings} recordings</span>
                            </div>
                            <Progress value={(userAnalytics.apneaEvents / userAnalytics.totalRecordings) * 100} />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Average detection confidence</span>
                              <span>{(userAnalytics.averageConfidence * 100).toFixed(1)}%</span>
                            </div>
                            <Progress value={userAnalytics.averageConfidence * 100} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="recordings">
                  {userRecordings.length === 0 ? (
                    <div className="text-center py-6 border rounded-md">
                      <p className="text-muted-foreground">No recordings found for this user</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Analysis</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Confidence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userRecordings.map((recording) => (
                            <TableRow key={recording.id}>
                              <TableCell>{formatDate(recording.recording_date)}</TableCell>
                              <TableCell>{formatDuration(recording.duration)}</TableCell>
                              <TableCell>
                                {recording.analysis_complete ? (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle size={14} className="mr-1" />
                                    Complete
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-500 text-amber-500">
                                    Processing
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {recording.is_apnea !== undefined ? (
                                  recording.is_apnea ? (
                                    <Badge variant="destructive">
                                      Apnea Detected
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" className="bg-green-500">
                                      Normal
                                    </Badge>
                                  )
                                ) : (
                                  <span className="text-muted-foreground text-sm">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {recording.confidence !== undefined ? 
                                  `${(recording.confidence * 100).toFixed(1)}%` : 
                                  'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close Details
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Edit User Dialog */}
      <Dialog 
        open={!!editingUser && !showDeleteDialog && !showRoleDialog} 
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user profile here.
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">Email</label>
                <Input
                  value={editingUser.email}
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">Username</label>
                <Input
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm">Avatar URL</label>
                <Input
                  value={editingUser.avatar_url || ''}
                  onChange={(e) => setEditingUser({...editingUser, avatar_url: e.target.value})}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="py-4">
              <p className="font-medium">{editingUser.username}</p>
              <p className="text-sm text-muted-foreground">{editingUser.email}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false);
              setEditingUser(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Role Change Dialog */}
      <Dialog 
        open={showRoleDialog} 
        onOpenChange={setShowRoleDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              {editingUser?.is_admin 
                ? "Remove admin privileges from this user?" 
                : "Grant admin privileges to this user?"}
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="py-4">
              <p className="font-medium">{editingUser.username}</p>
              <p className="text-sm text-muted-foreground">{editingUser.email}</p>
              
              <div className="mt-4 p-3 bg-accent/30 rounded-md">
                <p className="text-sm">
                  {editingUser.is_admin 
                    ? "This user currently has administrator privileges. Removing them will restrict access to admin features."
                    : "This will grant the user full administrator privileges, including access to all user data and system settings."}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRoleDialog(false);
              setEditingUser(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant={editingUser?.is_admin ? "destructive" : "default"}
              onClick={confirmRoleChange}
            >
              {editingUser?.is_admin ? "Remove Admin Role" : "Grant Admin Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;
