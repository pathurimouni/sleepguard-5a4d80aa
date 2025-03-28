import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Tracking from "./pages/Tracking";
import Settings from "./pages/Settings";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import BreathingAnalysis from "./pages/BreathingAnalysis";
import Navbar from "./components/Navbar";
import { supabase, getCurrentUser, User } from "./utils/auth";

const queryClient = new QueryClient();

// Authentication wrapper component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        setIsAuthenticated(!!userData);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          const userData = await getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    );
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-breathe text-primary">
          Loading SleepGuard...
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const childrenWithProps = React.cloneElement(children, { user, setUser });
  return childrenWithProps;
};

// Admin route protection
const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        if (!userData) {
          setIsAdmin(false);
          return;
        }
        
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.id)
          .eq('role', 'admin')
          .single();
          
        setIsAdmin(!!roles);
      } catch (error) {
        console.error("Admin check error:", error);
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          const userData = await getCurrentUser();
          setUser(userData);
          
          if (userData) {
            const { data: roles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userData.id)
              .eq('role', 'admin')
              .single();
              
            setIsAdmin(!!roles);
          } else {
            setIsAdmin(false);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      }
    );
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-breathe text-primary">
          Verifying admin privileges...
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  const childrenWithProps = React.cloneElement(children, { user });
  return childrenWithProps;
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        await supabase.auth.getSession();
        setIsLoading(false);
      } catch (error) {
        console.error("Session check error:", error);
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-breathe text-primary">
          Loading SleepGuard...
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Navbar appName="SleepGuard" />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/tracking" element={
                <ProtectedRoute>
                  <Tracking />
                </ProtectedRoute>
              } />
              <Route path="/analysis" element={
                <ProtectedRoute>
                  <BreathingAnalysis />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/about" element={
                <ProtectedRoute>
                  <About />
                </ProtectedRoute>
              } />
              
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
