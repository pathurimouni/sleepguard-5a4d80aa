
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Moon, Settings, Info, Menu, X, LogOut, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentUser, signOut } from "@/utils/auth";

interface NavbarProps {
  appName?: string;
}

const Navbar: React.FC<NavbarProps> = ({ appName = "Sleep Apnea Detector" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  const isActive = (path: string) => location.pathname === path;
  
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    
    checkAuth();
    
    // Close menu when route changes
    setIsOpen(false);
  }, [location.pathname]);
  
  const handleLogout = async () => {
    await signOut();
    setUser(null);
    navigate("/login");
  };

  const navItems = [
    { id: "home", icon: <Home size={20} />, label: "Home", path: "/" },
    { id: "tracking", icon: <Moon size={20} />, label: "Tracking", path: "/tracking" },
    { id: "analysis", icon: <BarChart2 size={20} />, label: "Analysis", path: "/analysis" },
    { id: "settings", icon: <Settings size={20} />, label: "Settings", path: "/settings" },
    { id: "about", icon: <Info size={20} />, label: "About", path: "/about" },
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const MobileNav = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b">
        <div 
          className="flex items-center" 
          onClick={() => navigate("/")}
        >
          <h1 className="text-lg font-semibold">{appName}</h1>
        </div>
        <button 
          onClick={toggleMenu} 
          className="p-2 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden absolute w-full bg-background/95 backdrop-blur-sm shadow-lg z-50"
          >
            <div className="px-2 py-3 flex flex-col space-y-1">
              {navItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    navigate(item.path);
                    closeMenu();
                  }}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-md text-sm transition-colors",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
                  )}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </motion.button>
              ))}
              
              {user && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="flex items-center px-4 py-3 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground mt-2 text-red-500"
                >
                  <span className="mr-3"><LogOut size={20} /></span>
                  Logout
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  const DesktopNav = () => (
    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
      <div 
        className="flex items-center cursor-pointer" 
        onClick={() => navigate("/")}
      >
        <h1 className="text-xl font-semibold">{appName}</h1>
      </div>

      <div className="flex space-x-1">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm transition-colors",
              isActive(item.path)
                ? "bg-primary text-primary-foreground font-medium"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </motion.button>
        ))}
        
        {user && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex items-center px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-red-500"
          >
            <span className="mr-2"><LogOut size={20} /></span>
            Logout
          </motion.button>
        )}
      </div>
    </div>
  );

  return (
    <nav className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-sm border-b">
      {isMobile ? <MobileNav /> : <DesktopNav />}
    </nav>
  );
};

export default Navbar;
