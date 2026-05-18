
import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { FileText, Car, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Logs() {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const [blogSnap, carSnap, locationSnap] = await Promise.all([
          getDocs(collection(db, 'blog_posts')).catch(e => handleFirestoreError(e, OperationType.LIST, 'blog_posts')),
          getDocs(collection(db, 'cars')).catch(e => handleFirestoreError(e, OperationType.LIST, 'cars')),
          getDocs(collection(db, 'locations')).catch(e => handleFirestoreError(e, OperationType.LIST, 'locations'))
        ]);

        const all = [
          ...blogSnap.docs.map(d => ({ ...d.data() as any, id: d.id, type: 'blog' })),
          ...carSnap.docs.map(d => ({ ...d.data() as any, id: d.id, type: 'car' })),
          ...locationSnap.docs.map(d => ({ ...d.data() as any, id: d.id, type: 'location' }))
        ].sort((a: any, b: any) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).slice(0, 50);

        setActivity(all);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">Audit</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity Logs</h1>
        </div>
        <p className="text-sm text-slate-500">History of content updates and system modifications across all collections.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
        <Table>
          <TableHeader className="bg-slate-50/50 text-[10px] uppercase font-bold tracking-wider text-slate-400">
            <TableRow className="border-b border-slate-100">
              <TableHead className="py-4 px-6">Timestamp</TableHead>
              <TableHead className="py-4">Entity Type</TableHead>
              <TableHead className="py-4">Item Identity</TableHead>
              <TableHead className="py-4 px-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i} className="border-b border-slate-50">
                  <TableCell colSpan={4} className="p-8"><div className="h-4 bg-slate-50 animate-pulse rounded w-full" /></TableCell>
                </TableRow>
              ))
            ) : activity.length > 0 ? (
              activity.map((item, i) => (
                <TableRow key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{item.updatedAt ? format(item.updatedAt.toDate(), 'MMM d, yyyy') : 'Recently'}</span>
                      <span className="text-[10px] font-mono text-slate-400">{item.updatedAt ? format(item.updatedAt.toDate(), 'HH:mm:ss') : '--:--'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                       <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center shrink-0 text-white",
                        item.type === 'blog' ? "bg-blue-500" : item.type === 'car' ? "bg-emerald-500" : "bg-amber-500"
                      )}>
                        {item.type === 'blog' && <FileText size={12} />}
                        {item.type === 'car' && <Car size={12} />}
                        {item.type === 'location' && <MapPin size={12} />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">{item.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{item.translations?.en?.title || item.translations?.en?.name || (item.make + ' ' + item.model) || item.slug}</span>
                      <span className="text-[9px] font-mono text-slate-400">{item.id || item.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-widest",
                      item.status === 'published' ? "text-emerald-500" : "text-slate-400"
                    )}>
                      {item.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <Clock size={32} className="mb-2 opacity-20" />
                    <p className="text-sm">No activity records found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
