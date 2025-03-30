
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, KeyRound, LogIn, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUp } from "@/utils/auth";
import { supabase } from "@/utils/auth";
import SleepGuardLogo from "@/components/SleepGuardLogo";

const AdminSignup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Basic validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }
    
    if (!adminCode) {
      setError("Admin registration code is required");
      setIsLoading(false);
      return;
    }
    
    try {
      // First verify the admin code - in a real app, this would be a secure verification
      // For now we'll just use a simple check
      if (adminCode !== "SLEEP2024ADMIN") {
        setError("Invalid admin registration code");
        setIsLoading(false);
        return;
      }
      
      // Sign up the user
      const { user, error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        toast.error(signUpError);
        setError(signUpError);
        setIsLoading(false);
        return;
      }
      
      if (user) {
        // Add the admin role to the user
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([
            { user_id: user.id, role: 'admin' }
          ]);
          
        if (roleError) {
          toast.error("Failed to set admin role. Please contact support.");
          console.error("Error setting admin role:", roleError);
        } else {
          toast.success("Admin account created successfully!");
        }
        
        navigate("/admin/login");
      } else {
        toast.success("Account created! Please check your email for confirmation.");
        navigate("/admin/login");
      }
    } catch (err: any) {
      console.error("Admin signup error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="page-container flex items-center justify-center min-h-screen py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 max-w-md w-full"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mb-4"
            >
              <SleepGuardLogo size="lg" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-2"
            >
              Admin Registration
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground"
            >
              Create a new administrator account
            </motion.p>
          </div>
          
          <form 
            onSubmit={handleAdminSignup}
            className="space-y-6"
          >
            {error && (
              <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm mb-1">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Mail size={16} />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="Enter admin email"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <KeyRound size={16} />
                  </span>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Create a password"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <KeyRound size={16} />
                  </span>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="adminCode" className="block text-sm mb-1">
                  Admin Registration Code
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <ShieldAlert size={16} />
                  </span>
                  <Input
                    id="adminCode"
                    type="text"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="pl-10"
                    placeholder="Enter admin registration code"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Creating Account..."
                ) : (
                  <>
                    <LogIn size={16} className="mr-2" />
                    Create Admin Account
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>Already have an admin account? <Link to="/admin/login" className="text-primary hover:underline">Admin Login</Link></p>
              <p className="mt-2">Regular user? <Link to="/login" className="text-primary hover:underline">User Login</Link></p>
            </div>
          </form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default AdminSignup;
