
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Edit, Trash2, CheckCircle, XCircle, Plus, ShieldAlert, Shield } from "lucide-react";
import { supabase } from "@/utils/auth";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
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
  DialogTrigger,
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

interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at?: string;
  is_admin?: boolean;
}

const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

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
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Error fetching auth users:", authError);
      }
      
      // Combine profile data with auth data and role information
      const combinedUsers = profiles?.map(profile => {
        const authUser = authUsers?.find(user => user.id === profile.id);
        return {
          ...profile,
          email: authUser?.email || 'Unknown',
          created_at: authUser?.created_at,
          is_admin: adminIds.includes(profile.id)
        };
      });
      
      setUsers(combinedUsers || []);
    } catch (error) {
      console.error("Error in user fetch:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
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
      fetchUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error("Failed to update user role");
    }
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
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
                    <TableRow key={user.id}>
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
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant={user.is_admin ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleToggleAdminRole(user)}
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
                            onClick={() => confirmDeleteUser(user)}
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
      </CardContent>
    </Card>
  );
};

export default AdminUserManagement;
