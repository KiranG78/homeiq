import { Outlet, NavLink } from 'react-router-dom';
import { Home, List, MessageSquare, PlusCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  return (
    <div className="flex h-screen bg-background text-foreground dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary tracking-tight">HomeIQ</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <NavLink
            to="/appliances"
            className={({ isActive }) =>
              cn("flex items-center gap-3 px-3 py-2 rounded-md transition-colors", 
                 isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-primary/5 text-gray-400 hover:text-foreground")
            }
          >
            <List className="w-5 h-5" />
            My Appliances
          </NavLink>
          
          <NavLink
            to="/appliances/add"
            className={({ isActive }) =>
              cn("flex items-center gap-3 px-3 py-2 rounded-md transition-colors", 
                 isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-primary/5 text-gray-400 hover:text-foreground")
            }
          >
            <PlusCircle className="w-5 h-5" />
            Add Appliance
          </NavLink>
          
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              cn("flex items-center gap-3 px-3 py-2 rounded-md transition-colors", 
                 isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-primary/5 text-gray-400 hover:text-foreground")
            }
          >
            <MessageSquare className="w-5 h-5" />
            Ask AI
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn("flex items-center gap-3 px-3 py-2 rounded-md transition-colors mt-8", 
                 isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-primary/5 text-gray-400 hover:text-foreground")
            }
          >
            <Home className="w-5 h-5" />
            Home Profile
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
