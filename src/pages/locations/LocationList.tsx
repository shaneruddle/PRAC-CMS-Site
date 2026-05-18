import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Location } from '@/types';
import { cn } from '@/lib/utils';

export default function LocationList() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const q = query(collection(db, 'locations'), orderBy('displayOrder', 'asc'));
        const snap = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, 'locations'));
        setLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Location[]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded">Locations</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Coverage Areas</h1>
          </div>
          <p className="text-sm text-slate-500">Manage SEO landing pages for Pattaya area clusters and delivery zones.</p>
        </div>
        <Link to="/locations/new" className={cn(buttonVariants({ variant: 'default' }), "bg-blue-600 hover:bg-blue-700 shadow-sm")}>
          <Plus className="mr-2 h-4 w-4" /> New Location
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((loc) => (
          <Card key={loc.id} className="group hover:border-blue-200 transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                  <MapPin className="text-slate-400 group-hover:text-blue-500 transition-colors" size={20} />
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                  loc.status === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                )}>
                  {loc.status}
                </div>
              </div>
              <CardTitle className="mt-4 text-slate-900 font-bold uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                {loc.translations?.en?.name || loc.slug}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-[11px] font-medium text-slate-500">
                <div className="flex justify-between pb-1 border-b border-slate-50">
                  <span className="uppercase tracking-widest text-[9px] text-slate-400">Slug path</span>
                  <span className="font-mono">/location/{loc.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="uppercase tracking-widest text-[9px] text-slate-400">Display Order</span>
                  <span>{loc.displayOrder}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Link to={`/locations/${loc.slug}`} className={cn(buttonVariants({ variant: 'outline' }), "w-full text-xs font-bold uppercase tracking-widest py-2 h-auto hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all")}>
                Configure Page <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
