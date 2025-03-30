
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, KeyRound, LogIn, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import ActionButton from "@/components/ActionButton";
import { signUp } from "@/utils/auth";
import SleepGuardLogo from "@/components/SleepGuardLogo";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
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
    
    const { user, error } = await signUp(email, password);
    
    setIsLoading(false);
    
    if (error) {
      toast.error(error);
      setError(error);
    } else {
      toast.success("Account created! Please check your email for confirmation.");
      
      // Note: In a real production app, you might want to redirect to a verification page
      // But for development, we can navigate to login
      navigate("/login");
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
              Create Account
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground"
            >
              Join SleepGuard and monitor your sleep patterns
            </motion.p>
          </div>
          
          <form 
            onSubmit={handleRegister}
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
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full py-2 pl-10 pr-3 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <ActionButton
                onClick={handleRegister}
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
                icon={isLoading ? undefined : <LogIn size={16} />}
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </ActionButton>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="mb-2 flex items-center justify-center">
                  <ShieldAlert size={16} className="mr-1 text-amber-500" />
                  <span>Are you an administrator?</span>
                </p>
                <Link to="/admin/signup" className="text-primary hover:underline flex items-center justify-center">
                  <span>Admin Registration</span>
                </Link>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default Register;
