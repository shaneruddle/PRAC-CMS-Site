import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FAQ } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  "Booking & Cancellation",
  "Delivery & Pickup",
  "Documents & Requirements",
  "Insurance & Damage",
  "Payment",
  "During Your Rental"
];

export default function FaqList() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const q = query(collection(db, 'faqs'), orderBy('category'), orderBy('displayOrder'));
        const snap = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, 'faqs'));
        setFaqs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FAQ[]);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load FAQs');
      } finally {
        setLoading(false);
      }
    }
    fetchFaqs();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await deleteDoc(doc(db, 'faqs', id));
      setFaqs(faqs.filter(f => f.id !== id));
      toast.success('FAQ deleted');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const groupedFaqs = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = faqs.filter(f => f.category === cat);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Support</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Help Center FAQs</h1>
          </div>
          <p className="text-sm text-slate-500">Manage frequently asked questions and help articles for the public site.</p>
        </div>
        <Link to="/faqs/new" className={cn(buttonVariants({ variant: 'default' }), "bg-blue-600 hover:bg-blue-700 shadow-sm")}>
          <Plus className="mr-2 h-4 w-4" /> New Question
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {CATEGORIES.map(category => (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 shrink-0">{category}</h2>
              <div className="h-[1px] bg-slate-100 flex-1"></div>
            </div>
            
            {groupedFaqs[category]?.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                {groupedFaqs[category].map(faq => (
                  <div key={faq.id} className="flex items-center justify-between p-5 group hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        faq.status === 'published' ? "bg-emerald-500" : "bg-slate-300"
                      )}></div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                          {faq.translations?.en?.question || 'Untitled Question'}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-medium mt-0.5">{faq.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => navigate(`/faqs/${faq.id}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(faq.id!)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 px-4 rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center bg-slate-50/50">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Empty Category</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
