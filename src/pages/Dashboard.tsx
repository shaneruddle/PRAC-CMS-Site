import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  FileText, 
  Car, 
  MapPin, 
  Clock, 
  Plus, 
  ArrowRight,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    blogCount: { total: 0, published: 0 },
    carCount: { total: 0, published: 0 },
    locationCount: { total: 0, published: 0 },
    lastDeploy: null as any
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const fetchBlogs = getDocs(collection(db, 'blog_posts')).catch(e => handleFirestoreError(e, OperationType.LIST, 'blog_posts'));
        const fetchCars = getDocs(collection(db, 'cars')).catch(e => handleFirestoreError(e, OperationType.LIST, 'cars'));
        const fetchLocations = getDocs(collection(db, 'locations')).catch(e => handleFirestoreError(e, OperationType.LIST, 'locations'));
        const fetchDeploys = getDocs(query(collection(db, 'deploy_triggers'), orderBy('triggeredAt', 'desc'), limit(1))).catch(e => handleFirestoreError(e, OperationType.LIST, 'deploy_triggers'));

        const [blogSnap, carSnap, locationSnap, deploySnap] = await Promise.all([
          fetchBlogs,
          fetchCars,
          fetchLocations,
          fetchDeploys
        ]);

        const getStats = (snap: any) => {
          const docs = snap.docs.map((doc: any) => doc.data());
          return {
            total: docs.length,
            published: docs.filter((d: any) => d.status === 'published').length
          };
        };

        setStats({
          blogCount: getStats(blogSnap),
          carCount: getStats(carSnap),
          locationCount: getStats(locationSnap),
          lastDeploy: deploySnap.docs[0]?.data() || null
        });

        // Simulating recent activity
        const activity = [
          ...blogSnap.docs.map(d => ({ ...d.data() as any, id: d.id, type: 'blog' })),
          ...carSnap.docs.map(d => ({ ...d.data() as any, id: d.id, type: 'car' })),
          ...locationSnap.docs.map(d => ({ ...d.data() as any, id: d.id, type: 'location' }))
        ].sort((a: any, b: any) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).slice(0, 10);
        
        setRecentActivity(activity);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const statCards = [
    { label: 'Blog Posts', stats: stats.blogCount, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', link: '/blog' },
    { label: 'Cars', stats: stats.carCount, icon: Car, color: 'text-green-600', bg: 'bg-green-100', link: '/cars' },
    { label: 'Locations', stats: stats.locationCount, icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-100', link: '/locations' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back, {user?.displayName || user?.email?.split('@')[0]}</h1>
        <p className="text-sm text-slate-500">Here's what's happening with your content today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Blog Stats */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Blog Content</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full font-bold">{stats.blogCount.total} Posts</span>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl font-bold text-slate-900">{stats.blogCount.published}</h3>
            <span className="text-xs text-slate-500 mb-1">Published</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-1000" 
              style={{ width: `${stats.blogCount.total > 0 ? (stats.blogCount.published / stats.blogCount.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Fleet Stats */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Fleet</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] rounded-full font-bold">{stats.carCount.total} Cars</span>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl font-bold text-slate-900">{stats.carCount.published}</h3>
            <span className="text-xs text-slate-500 mb-1">Available Now</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-1000" 
              style={{ width: `${stats.carCount.total > 0 ? (stats.carCount.published / stats.carCount.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Location Stats */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Locations</span>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] rounded-full font-bold">{stats.locationCount.total} Areas</span>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl font-bold text-slate-900">{stats.locationCount.published}</h3>
            <span className="text-xs text-slate-500 mb-1">Active Pages</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-amber-400 h-full transition-all duration-1000" 
              style={{ width: `${stats.locationCount.total > 0 ? (stats.locationCount.published / stats.locationCount.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Deploy Stats (Dark) */}
        <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 shadow-sm text-white">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Last Deploy</span>
            <span className={cn(
              "flex items-center gap-1 text-[10px] font-bold",
              stats.lastDeploy?.status === 'deployed' ? "text-emerald-400" : "text-amber-400"
            )}>
              {stats.lastDeploy?.status === 'building' ? '● Building' : '● Live'}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <h3 className="text-xl font-mono">
              {stats.lastDeploy?.triggeredAt ? format(stats.lastDeploy.triggeredAt.toDate(), 'HH:mm') : '--:--'}
            </h3>
            <span className="text-xs text-zinc-500 mb-1">
              {stats.lastDeploy?.triggeredAt ? format(stats.lastDeploy.triggeredAt.toDate(), 'MMM d, yyyy') : 'Never'}
            </span>
          </div>
          <button className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
            {stats.lastDeploy?.status === 'building' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            REBUILD SITE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-0">
        {/* Activity Feed */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">Recent Activity</h4>
            <Link to="/logs" className="text-[11px] font-semibold text-blue-600 hover:underline">View Log</Link>
          </div>
          <div className="flex-1 p-4 space-y-4">
            {loading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-lg border border-slate-100" />)
            ) : recentActivity.length > 0 ? (
              recentActivity.map((item, i) => (
                <div key={i} className={cn(
                  "flex items-start gap-4 p-3 transition-colors",
                  i === 0 ? "bg-slate-50 rounded-lg border border-slate-100" : "bg-white hover:bg-slate-50 border-b border-slate-100 last:border-0"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded flex items-center justify-center shrink-0 text-white",
                    item.type === 'blog' ? "bg-blue-500" : item.type === 'car' ? "bg-emerald-500" : "bg-amber-500"
                  )}>
                    {item.type === 'blog' && <FileText size={16} />}
                    {item.type === 'car' && <Car size={16} />}
                    {item.type === 'location' && <MapPin size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {i === 0 ? 'Latest edit: ' : ''}
                      <span className={cn(i === 0 && "font-bold")}>{item.translations?.en?.title || item.translations?.en?.question || item.make + ' ' + item.model || item.name || 'Untitled Content'}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 uppercase tracking-tight">
                      {item.type} • {item.status} • {item.updatedAt ? format(item.updatedAt.toDate(), 'h:mm a') : 'Just now'}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase",
                    item.status === 'published' ? "text-emerald-500" : "text-slate-400"
                  )}>
                    {item.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                  <Clock size={20} />
                </div>
                <p className="text-sm text-slate-400">No activity recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6 flex flex-col min-h-0">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/blog/new" className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors">
                <Plus size={20} />
                <span className="text-[11px] font-bold">New Post</span>
              </Link>
              <Link to="/media" className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                <ImageIcon size={20} />
                <span className="text-[11px] font-bold">Media</span>
              </Link>
              <Link to="/cars" className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                <Car size={20} />
                <span className="text-[11px] font-bold">Manage Cars</span>
              </Link>
              <button 
                onClick={() => window.open('https://pattayarentacar.com', '_blank')}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ArrowRight size={20} />
                <span className="text-[11px] font-bold">View Site</span>
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col min-h-0">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Site Status</h4>
            <div className="flex-1 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-3 border border-emerald-100">
                <RefreshCw size={24} className={cn(stats.lastDeploy?.status === 'building' && "animate-spin")} />
              </div>
              <p className="text-xs font-bold text-slate-900">Production is Synced</p>
              <p className="text-[10px] text-slate-400 mt-2 max-w-[180px]">
                Marketing site is current with all published Firestore documents.
              </p>
              <div className="w-full mt-6 space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 uppercase tracking-widest">System Health</span>
                  <span className="text-emerald-500 uppercase tracking-widest">OK</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
