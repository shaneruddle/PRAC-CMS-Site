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
import { Plus, MoreVertical, Edit, Trash2, Car as CarIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Car } from '@/types';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function CarList() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCars = async () => {
    try {
      const q = query(collection(db, 'cars'), orderBy('displayOrder', 'asc'));
      const snap = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, 'cars'));
      setCars(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Car[]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load cars');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCars(); }, []);

  const handleDelete = async (slug: string) => {
    if (!window.confirm('Delete this car?')) return;
    try {
      await deleteDoc(doc(db, 'cars', slug));
      setCars(cars.filter(c => c.slug !== slug));
      toast.success('Car removed');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Fleet</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fleet Management</h1>
          </div>
          <p className="text-sm text-slate-500">Manage rental cars, their specifications, and public availability.</p>
        </div>
        <Link to="/cars/new" className={cn(buttonVariants({ variant: 'default' }), "bg-blue-600 hover:bg-blue-700 shadow-sm")}>
          <Plus className="mr-2 h-4 w-4" /> Add New Vehicle
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4 px-6 w-24">Vehicle</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Make & Model</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Category</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">CMS Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Availability</TableHead>
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
            ) : cars.length > 0 ? (
              cars.map((car) => (
                <TableRow key={car.slug} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="w-14 h-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      {car.images?.[0] ? (
                        <img src={car.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                          <CarIcon size={16} />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 uppercase text-xs tracking-tight">{car.make} {car.model}</span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5">{car.year} • {car.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded capitalize">{car.category}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                      car.status === 'published' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {car.status}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant={car.available ? 'outline' : 'destructive'} className={cn(
                      "text-[10px] font-bold uppercase py-0.5 h-auto",
                      car.available ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "bg-red-50 text-red-600 border-red-100"
                    )}>
                      {car.available ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => navigate(`/cars/${car.slug}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit Vehicle"
                       >
                        <Edit size={16} />
                       </button>
                       <button 
                        onClick={() => handleDelete(car.slug!)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete vehicle"
                       >
                        <Trash2 size={16} />
                       </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <CarIcon size={32} className="mb-2 opacity-20" />
                    <p className="text-sm font-medium">Your fleet is empty.</p>
                    <p className="text-xs mt-1">Start by adding your first rental car.</p>
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
