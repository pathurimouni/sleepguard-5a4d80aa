
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, KeyRound, LogIn, Mail } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import ActionButton from "@/components/ActionButton";
import { signIn, supabase } from "@/utils/auth";

const Login = () => {
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
        navigate("/");
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          navigate("/");
        }
      }
    );
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const { user, error } = await signIn(email, password);
      
      if (error) {
        toast.error(error);
        setError(error);
      } else if (user) {
        // Store user info
        localStorage.setItem("sleepguard-user", JSON.stringify({ 
          username: user.email,
          id: user.id 
        }));
        
        toast.success("Login successful!");
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
                <label htmlFor="email" className="block text-sm mb-1">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Mail size={16} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                type="submit"
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
              <p>Don't have an account? <Link to="/register" className="text-primary hover:underline">Sign up</Link></p>
            </div>
          </form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Login;
