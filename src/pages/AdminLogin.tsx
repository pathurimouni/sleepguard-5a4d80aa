
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, LogIn, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/utils/auth";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Check if admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.session.user.id)
          .single();
          
        if (roles && roles.role === 'admin') {
          navigate("/admin/dashboard");
        } else {
          // Not an admin, redirect to home
          navigate("/");
        }
      }
    };
    
    checkSession();
  }, [navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        toast.error(signInError.message);
        setError(signInError.message);
        setIsLoading(false);
        return;
      }
      
      if (data.user) {
        // Check if the user has admin role
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();
          
        if (rolesError || !roles || roles.role !== 'admin') {
          // Not an admin
          toast.error("Access denied: Insufficient permissions");
          await supabase.auth.signOut();
          setError("This account does not have administrator privileges");
          setIsLoading(false);
          return;
        }
        
        // Admin login successful
        toast.success("Admin login successful!");
        navigate("/admin/dashboard");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      toast.error("Login failed. Please try again.");
      setError("An unexpected error occurred during login");
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
              className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4"
            >
              <ShieldAlert size={36} className="text-primary" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-2"
            >
              Admin Access
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground"
            >
              Restricted area - Administrator login only
            </motion.p>
          </div>
          
          <form 
            onSubmit={handleAdminLogin}
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
                  Admin Email
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
                    placeholder="Enter admin password"
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
                  "Verifying..."
                ) : (
                  <>
                    <LogIn size={16} className="mr-2" />
                    Admin Login
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>Not an administrator? <a href="/login" className="text-primary hover:underline">Regular login</a></p>
            </div>
          </form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default AdminLogin;
