
import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/utils/auth";

const Logout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await signOut();
    
    if (error) {
      toast.error(error);
    } else {
      // Remove user from local storage
      localStorage.removeItem("sleepguard-user");
      toast.success("Logged out successfully");
      navigate("/login");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-primary/10 transition-colors"
    >
      <LogOut size={16} />
      <span>Logout</span>
    </button>
  );
};

export default Logout;
