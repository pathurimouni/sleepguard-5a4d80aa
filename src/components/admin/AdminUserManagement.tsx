import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchAllUsers, fetchUserRecordings } from "@/utils/adminApi";
import { Progress } from "@/components/ui/progress";
import StatusCard from "@/components/StatusCard";
import { supabase } from "@/integrations/supabase/client";

const AdminUserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userRecordings, setUserRecordings] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);

  useEffect(() => {
    loadUsers();
    
    // Set up realtime subscription for profiles table
    const profilesChannel = supabase
      .channel('admin-profiles-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        loadUsers();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = async (user: any) => {
    setSelectedUser(user);
    setLoadingRecordings(true);
    
    try {
      const recordings = await fetchUserRecordings(user.id);
      setUserRecordings(recordings);
    } catch (error) {
      console.error("Error fetching user recordings:", error);
      toast.error("Failed to fetch user recordings");
    } finally {
      setLoadingRecordings(false);
    }
  };

  const getInitials = (username: string) => {
    if (!username) return "U";
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <User className="mr-2" size={20} />
            User Management
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search" 
              placeholder="Search users..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="text-center text-muted-foreground">Loading users...</div>
              <Progress value={50} className="w-full" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No users found
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={user.avatar_url} alt={user.username} />
                      <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.username}</p>
                      <p className="text-sm truncate opacity-80">ID: {user.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-xl">
            {selectedUser ? `User Details: ${selectedUser.username}` : "Select a user to view details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedUser ? (
            <div className="text-center py-12 text-muted-foreground">
              Select a user from the list to view their details
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.username} />
                  <AvatarFallback>{getInitials(selectedUser.username)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.username}</h3>
                  <p className="text-muted-foreground">User ID: {selectedUser.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusCard
                  title="Total Recordings"
                  value={userRecordings.length.toString()}
                  icon={<User size={18} />}
                />
                <StatusCard
                  title="Apnea Detected Recordings"
                  value={userRecordings.filter(rec => 
                    rec.apnea_analysis && rec.apnea_analysis.some((a: any) => a.is_apnea)
                  ).length.toString()}
                  icon={<User size={18} />}
                />
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Recordings History</h3>
                {loadingRecordings ? (
                  <div className="py-4 text-center">
                    <Progress value={70} className="w-full mb-2" />
                    <p className="text-muted-foreground">Loading recordings...</p>
                  </div>
                ) : userRecordings.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground border border-dashed rounded-md">
                    No recordings found for this user
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {userRecordings.map((recording) => (
                      <div key={recording.id} className="p-3 border rounded-md">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">Recording ID: {recording.id.substring(0, 8)}...</p>
                            <p className="text-sm text-muted-foreground">
                              Date: {new Date(recording.recording_date).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">Duration: {recording.duration}s</p>
                            <p className={`text-sm ${
                              recording.apnea_analysis && recording.apnea_analysis.some((a: any) => a.is_apnea)
                                ? "text-red-500"
                                : "text-green-500"
                            }`}>
                              {recording.apnea_analysis && recording.apnea_analysis.some((a: any) => a.is_apnea)
                                ? "Apnea Detected"
                                : "No Apnea"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserManagement;
