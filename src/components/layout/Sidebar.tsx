import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  MapPin,
  BookOpen,
  HelpCircle,
  Hotel,
  Image as ImageIcon,
  CloudUpload,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Blog Posts', path: '/blog' },
  { icon: MapPin, label: 'Locations', path: '/locations' },
  { icon: BookOpen, label: 'Vehicle Guides', path: '/vehicle-guides' },
  { icon: Hotel, label: "Hotels", path: "/hotels" },
  { icon: HelpCircle, label: 'FAQs', path: '/faqs' },
  { icon: ImageIcon, label: 'Media Library', path: '/media' },
  { icon: CloudUpload, label: 'Deploys', path: '/deploys' },
];

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-zinc-900 border-r border-zinc-800 transition-all duration-300 z-50 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className={cn("flex items-center gap-3 border-b border-zinc-800 shrink-0 h-16 transition-all duration-300 overflow-hidden", collapsed ? "px-4 justify-center" : "px-6")}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">P</div>
        {!collapsed && (
          <div className="leading-tight truncate">
            <h1 className="text-white font-semibold text-sm">Pattaya Rent A Car</h1>
            <p className="text-[10px] uppercase tracking-wider opacity-60 text-zinc-400 font-bold">CMS Dashboard</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative group",
              isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
              collapsed && "justify-center px-0 h-10"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={cn("shrink-0", isActive ? "text-blue-400" : "")} />
                {!collapsed && <span className="font-medium truncate">{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50 shadow-xl">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center h-8 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-zinc-700"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full flex items-center gap-3 justify-start text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg h-9 text-sm font-medium transition-colors",
            collapsed && "justify-center px-0"
          )}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
