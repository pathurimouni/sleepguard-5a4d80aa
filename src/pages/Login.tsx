
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, KeyRound, LogIn } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import ActionButton from "@/components/ActionButton";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we have Supabase credentials
      if (!supabaseUrl || !supabaseAnonKey) {
        // Fallback to mock login if Supabase is not configured
        console.log("Supabase not configured, using mock login");
        
        setTimeout(() => {
          if (username.trim() && password.trim()) {
            localStorage.setItem("sleepguard-user", JSON.stringify({ username }));
            toast.success("Login successful (mock mode)!");
            navigate("/");
          } else {
            toast.error("Please enter both username and password");
          }
          setIsLoading(false);
        }, 1000);
        
        return;
      }
      
      // Use Supabase authentication
      const { error } = await supabase.auth.signInWithPassword({
        email: username, // Assuming username is an email
        password,
      });
      
      if (error) {
        console.error("Supabase auth error:", error);
        toast.error(error.message || "Authentication failed");
        setError(error.message);
      } else {
        toast.success("Login successful!");
        
        // Store user info
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          localStorage.setItem("sleepguard-user", JSON.stringify({ 
            username: user.email,
            id: user.id 
          }));
        }
        
        navigate("/");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Connection error. Please try again.");
      setError("Connection failed. Please check your internet connection.");
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
              <User size={36} className="text-primary" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-2"
            >
              Welcome to SleepGuard
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground"
            >
              Monitor your sleep patterns and detect apnea events
            </motion.p>
          </div>
          
          <form 
            onSubmit={handleLogin}
            className="space-y-6"
          >
            {error && (
              <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm mb-1">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User size={16} />
                  </span>
                  <input
                    id="username"
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full py-2 pl-10 pr-3 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent"
                    placeholder="Enter your email"
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
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2 pl-10 pr-3 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <ActionButton
                onClick={handleLogin}
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
                icon={isLoading ? undefined : <LogIn size={16} />}
              >
                {isLoading ? "Logging in..." : "Login"}
              </ActionButton>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>Don't have an account? <button type="button" className="text-primary hover:underline" onClick={() => toast.info("Registration feature coming soon!")}>Sign up</button></p>
            </div>
            
            {!supabaseUrl && (
              <div className="mt-4 p-3 text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-md">
                Supabase connection not configured. Running in mock mode.
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Login;
