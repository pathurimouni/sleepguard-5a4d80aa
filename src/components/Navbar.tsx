
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Menu, X, Home, Activity, BarChart2, Settings, Info, LogOut, Shield } from 'lucide-react';
import { User } from '@/utils/auth';
import { getCurrentUser, signOut } from '@/utils/auth';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import SleepGuardLogo from './SleepGuardLogo';

interface NavbarProps {
  appName?: string;
  user?: User;
}

const Navbar: React.FC<NavbarProps> = ({ appName = 'SleepGuard' }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };
  
  // Update auth state when route changes
  useEffect(() => {
    const checkAuth = async () => {
      const userData = await getCurrentUser();
      setIsAuthenticated(!!userData);
      setUser(userData);
    };
    
    checkAuth();
  }, [location.pathname]);
  
  // Check if current path is an auth page
  const isAuthPage = ['/login', '/register', '/admin/login', '/admin/signup'].includes(location.pathname);
  
  // Don't show navbar on auth pages
  if (isAuthPage) {
    return null;
  }
  
  // Check if current path is an admin page
  const isAdminPage = location.pathname.startsWith('/admin/');
  
  const navLinks = [
    { to: '/', icon: <Home size={20} />, label: 'Home' },
    { to: '/tracking', icon: <Activity size={20} />, label: 'Tracking' },
    { to: '/analysis', icon: <BarChart2 size={20} />, label: 'Analysis' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
    { to: '/about', icon: <Info size={20} />, label: 'About' },
  ];
  
  const adminNavLinks = [
    { to: '/admin/dashboard', icon: <Shield size={20} />, label: 'Admin Dashboard' },
  ];
  
  // Use the appropriate nav links based on whether we're on an admin page
  const displayNavLinks = isAdminPage ? adminNavLinks : navLinks;
  
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and app name */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <SleepGuardLogo size="sm" withText={true} />
            </Link>
          </div>
          
          {/* Desktop nav links */}
          <div className="hidden md:flex space-x-2 items-center">
            {isAuthenticated && (
              <>
                {displayNavLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="mr-2">{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
                
                {/* Show admin dashboard link for admins when not on admin pages */}
                {!isAdminPage && user?.isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-amber-500 hover:bg-accent hover:text-amber-600"
                  >
                    <Shield size={20} className="mr-2" />
                    Admin
                  </Link>
                )}
                
                {/* Show exit admin link when on admin pages */}
                {isAdminPage && (
                  <Link
                    to="/"
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-blue-500 hover:bg-accent hover:text-blue-600"
                  >
                    <Home size={20} className="mr-2" />
                    Exit Admin
                  </Link>
                )}
                
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-rose-500 hover:bg-accent hover:text-rose-600"
                >
                  <LogOut size={20} className="mr-2" />
                  Logout
                </button>
              </>
            )}
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-accent transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-accent transition-colors mr-2"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {isAuthenticated && (
              <button
                onClick={toggleMobileMenu}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {displayNavLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              
              {/* Show admin dashboard link for admins when not on admin pages */}
              {!isAdminPage && user?.isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors text-amber-500 hover:bg-accent hover:text-amber-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield size={20} className="mr-2" />
                  Admin Dashboard
                </Link>
              )}
              
              {/* Show exit admin link when on admin pages */}
              {isAdminPage && (
                <Link
                  to="/"
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors text-blue-500 hover:bg-accent hover:text-blue-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home size={20} className="mr-2" />
                  Exit Admin
                </Link>
              )}
              
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex w-full items-center px-3 py-2 rounded-md text-base font-medium transition-colors text-rose-500 hover:bg-accent hover:text-rose-600"
              >
                <LogOut size={20} className="mr-2" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
