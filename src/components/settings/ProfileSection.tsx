
import React, { useState } from "react";
import { UserRound, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/utils/auth";
import { updateProfile, User } from "@/utils/auth";

interface ProfileSectionProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ user, setUser }) => {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Update user profile with avatar URL
      const { error: updateError } = await updateProfile({ 
        avatarUrl: urlData.publicUrl 
      });
      
      if (updateError) {
        throw updateError;
      }
      
      // Update local user state with new avatar
      setUser(prev => prev ? { ...prev, avatarUrl: urlData.publicUrl } : prev);
      
      toast.success('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Error uploading avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {user?.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt="Profile" 
            className="w-24 h-24 rounded-full object-cover border-2 border-primary" 
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <UserRound size={40} className="text-slate-400" />
          </div>
        )}
        
        <label 
          htmlFor="avatar-upload" 
          className="absolute bottom-0 right-0 p-1 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/80 transition-colors"
        >
          <Upload size={16} />
        </label>
        
        <input 
          type="file"
          id="avatar-upload"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploadingAvatar}
          className="hidden"
        />
      </div>
      
      <div className="text-center">
        <h3 className="font-medium">{user?.username || user?.email || 'User'}</h3>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>
      
      {uploadingAvatar && (
        <div className="text-sm text-primary animate-pulse">
          Uploading...
        </div>
      )}
    </div>
  );
};

export default ProfileSection;
