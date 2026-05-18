import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/sonner';

export function AdminLayout() {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
          <div className="w-32 h-4 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300" style={{ 
        marginLeft: collapsed ? '64px' : '256px',
      }}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-30">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard</span>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <h2 className="text-sm font-semibold text-slate-800">Overview</h2>
          </div>

          <div className="flex items-center gap-6">
            {/* Language Switcher Mock */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button className="px-3 py-1 text-[10px] font-bold bg-white text-blue-600 rounded shadow-sm border border-slate-200">EN</button>
              <button className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700">TH</button>
              <button className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700">RU</button>
              <button className="px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700">ZH</button>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-200"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">{user.email?.split('@')[0] || 'Admin User'}</p>
                <p className="text-[10px] text-slate-400 leading-none">{user.email}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 font-bold text-xs ring-2 ring-white">
                {user.email?.[0].toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <div className="p-8 max-w-7xl mx-auto min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
      
      <Toaster position="top-right" richColors />
    </div>
  );
}
