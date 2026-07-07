import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { Home, List, MessageSquare, PlusCircle, LayoutDashboard, User, Sparkles, Bot, Bell, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../api/client';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { to: '/features', icon: Sparkles, label: 'Getting Started' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scan', icon: ({ className }: { className?: string }) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
  ), label: 'Smart Scan' },
  { to: '/vault', icon: ({ className }: { className?: string }) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"/><path d="M18 21V10l-6-6H6a2 2 0 0 0-2 2v15"/></svg>
  ), label: 'My Vault' },
  { to: '/chat', icon: Bot, label: 'Ask AI' },
];

export default function Layout() {
  const location = useLocation();
  const [userName, setUserName] = useState<string>("User");

  useEffect(() => {
    client.get('/profile/')
      .then(res => {
        if (res.data && res.data.full_name) {
          setUserName(res.data.full_name);
        }
      })
      .catch(err => console.error("Error fetching user profile", err));
  }, []);

  // Helper to determine if a route is active
  const checkIsActive = (path: string) => {
    return path === '/' 
      ? location.pathname === '/' 
      : path === '/appliances' 
        ? location.pathname === '/appliances'
        : (location.pathname === path || location.pathname.startsWith(path + '/'));
  };

  return (
    <div className="flex h-[100dvh] bg-background text-foreground relative overflow-hidden">
      
      {/* Animated Breathing Background */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-1/4 -right-1/4 w-3/4 h-3/4 bg-cyan-500/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute -bottom-1/4 -left-1/4 w-3/4 h-3/4 bg-purple-500/10 rounded-full blur-[120px]"
        />
      </div>

      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex w-64 border-r border-border/40 bg-card/40 backdrop-blur-xl flex-col relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="p-6">
          <Link to="/">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent tracking-tighter hover:opacity-80 transition-opacity cursor-pointer">
              HomeIQ
            </h1>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 relative">
          {NAV_ITEMS.map((item) => {
            const isReallyActive = checkIsActive(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group z-10", 
                  isReallyActive ? "text-primary font-medium" : "text-gray-400 hover:text-gray-200"
                )}
              >
                {isReallyActive && (
                  <motion.div
                    layoutId="active-nav-desktop"
                    className="absolute inset-0 bg-primary/10 rounded-lg -z-10 border border-primary/20 shadow-[0_0_12px_rgba(14,165,233,0.15)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5", isReallyActive ? "text-primary" : "group-hover:text-gray-200")} />
                <span className="relative z-10">{item.label}</span>
              </NavLink>
            );
          })}

          {/* Home Profile removed from here */}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col relative z-0">
        
        {/* App Bar */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 md:px-8 py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.1)] relative">
          <div className="flex items-center gap-2 md:hidden">
            <Link to="/">
              <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent tracking-tighter hover:opacity-80 transition-opacity cursor-pointer">
                HomeIQ
              </h1>
            </Link>
          </div>
          
          {/* Centered pill */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs md:text-sm font-medium shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Command Center Online
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <NavLink to="/profile" className="flex items-center gap-3 pl-4 hover:opacity-80 transition-opacity">
              <div className="flex flex-col items-end hidden md:flex">
                <span className="text-sm font-medium text-gray-200">{userName}</span>
                <span className="text-xs text-gray-500">Homeowner</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold shadow-[0_0_12px_rgba(14,165,233,0.4)]">
                {userName.charAt(0).toUpperCase()}
              </div>
            </NavLink>
          </div>
        </header>

        <div className="p-4 pb-24 md:p-8 flex-1 max-w-6xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card/80 backdrop-blur-2xl border-t border-border/40 pb-safe">
        <div className="flex items-center justify-around p-2">
          {NAV_ITEMS.map((item) => {
            const isReallyActive = checkIsActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors z-10",
                  isReallyActive ? "text-primary" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {isReallyActive && (
                  <motion.div
                    layoutId="active-nav-mobile"
                    className="absolute inset-0 bg-primary/10 rounded-xl -z-10 border border-primary/20"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
