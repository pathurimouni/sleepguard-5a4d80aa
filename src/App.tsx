import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Index from "@/pages/Index";
import About from "@/pages/About";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import Tracking from "@/pages/Tracking";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import BreathingAnalysis from "@/pages/BreathingAnalysis";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminLogin from "@/pages/AdminLogin";
import AdminSignup from "@/pages/AdminSignup";
import Detection from "@/pages/Detection";
import Analytics from "@/pages/Analytics";
import AdminDatasets from "@/pages/AdminDatasets";
import AdminModels from "@/pages/AdminModels";

function App() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/breathing-analysis" element={<BreathingAnalysis />} />
          
          {/* Add new routes for detection and analytics */}
          <Route path="/detection" element={<Detection />} />
          <Route path="/analytics" element={<Analytics />} />
          
          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route path="/admin/datasets" element={<AdminDatasets />} />
          <Route path="/admin/models" element={<AdminModels />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
