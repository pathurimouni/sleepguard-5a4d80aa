
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Moon, Settings, Sun, Info, Activity } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const navItems = [
    { path: "/", icon: <Home size={20} />, label: "Home" },
    { path: "/tracking", icon: <Activity size={20} />, label: "Track" },
    { path: "/settings", icon: <Settings size={20} />, label: "Settings" },
    { path: "/about", icon: <Info size={20} />, label: "About" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed bottom-0 md:top-0 md:bottom-auto left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t md:border-b border-slate-200 dark:border-slate-800 px-4 py-2 md:py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {!isMobile && (
          <Link to="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Activity className="h-6 w-6 text-primary" />
            </motion.div>
            <span className="font-medium text-lg">SleepGuard</span>
          </Link>
        )}

        <div className={`flex items-center ${isMobile ? 'justify-around w-full' : 'space-x-1'}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative px-3 py-2 rounded-full flex flex-col md:flex-row items-center ${
                isMobile ? 'justify-center flex-1 max-w-[80px]' : 'justify-start'
              } transition-colors ${
                location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {location.pathname === item.path && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-secondary rounded-full -z-10"
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}
              {item.icon}
              <span className={`${isMobile ? 'text-xs mt-1' : 'ml-2 text-sm'}`}>
                {item.label}
              </span>
            </Link>
          ))}

          {!isMobile && (
            <button
              onClick={toggleDarkMode}
              className="p-2 ml-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Toggle dark mode"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isDarkMode ? "dark" : "light"}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </motion.div>
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
