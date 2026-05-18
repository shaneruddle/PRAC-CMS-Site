import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Edit, Trash2, BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { VehicleGuide } from '@/types';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function VehicleGuideList() {
  const [guides, setGuides] = useState<VehicleGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchGuides = async () => {
    try {
      const q = query(collection(db, 'vehicle_guides'), orderBy('displayOrder', 'asc'));
      const snap = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, 'vehicle_guides'));
      setGuides(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VehicleGuide[]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load vehicle guides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuides(); }, []);

  const handleDelete = async (slug: string) => {
    if (!window.confirm('Delete this vehicle guide?')) return;
    try {
      await deleteDoc(doc(db, 'vehicle_guides', slug));
      setGuides(guides.filter(g => g.slug !== slug));
      toast.success('Vehicle guide removed');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Content</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vehicle Guides</h1>
          </div>
          <p className="text-sm text-slate-500">Manage SEO vehicle guide pages for the marketing site.</p>
        </div>
        <Link to="/vehicle-guides/new" className={cn(buttonVariants({ variant: 'default' }), "bg-blue-600 hover:bg-blue-700 shadow-sm")}>
          <Plus className="mr-2 h-4 w-4" /> Add New Guide
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4 px-6 w-24">Image</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Make & Model</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Category</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Featured Cars</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4 px-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <TableRow key={i} className="border-b border-slate-50 last:border-0">
                  <TableCell colSpan={6} className="p-6">
                    <div className="h-10 bg-slate-50 animate-pulse rounded w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : guides.length > 0 ? (
              guides.map((guide) => (
                <TableRow key={guide.slug} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="w-14 h-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      {guide.heroImage ? (
                        <img src={guide.heroImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                          <BookOpen size={16} />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 uppercase text-xs tracking-tight">{guide.make} {guide.model}</span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5">{guide.year ? guide.year + ' • ' : ''}{guide.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded capitalize">{guide.category}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                      guide.status === 'published' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {guide.status}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-xs text-slate-500">{guide.featuredCarIds?.length || 0} linked</span>
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={() => navigate(`/vehicle-guides/${guide.slug}`)}>
                        <Edit size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50 hover:text-red-500" onClick={() => handleDelete(guide.slug)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <BookOpen size={32} strokeWidth={1} />
                    <div>
                      <p className="font-bold text-sm text-slate-600">No vehicle guides yet</p>
                      <p className="text-xs mt-1">Create your first guide to populate the marketing site.</p>
                    </div>
                    <Link to="/vehicle-guides/new" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), "bg-blue-600 hover:bg-blue-700 mt-2")}>
                      <Plus className="mr-1.5 h-3 w-3" /> Create First Guide
                    </Link>
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
