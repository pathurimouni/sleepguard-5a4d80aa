
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, KeyRound, LogIn } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import ActionButton from "@/components/ActionButton";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simple mock login - in a real app, this would validate against a backend
    setTimeout(() => {
      if (username.trim() && password.trim()) {
        // Store login state in localStorage
        localStorage.setItem("sleepguard-user", JSON.stringify({ username }));
        toast.success("Login successful!");
        navigate("/");
      } else {
        toast.error("Please enter both username and password");
      }
      setIsLoading(false);
    }, 1000);
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
          
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleLogin}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User size={16} />
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full py-2 pl-10 pr-3 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent"
                    placeholder="Enter your username"
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
              <p>Don't have an account? <button type="button" className="text-primary hover:underline" onClick={() => toast.info("Registration feature coming soon!")}>Sign up</button></p>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Login;
