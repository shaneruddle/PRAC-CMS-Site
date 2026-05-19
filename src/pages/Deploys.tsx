import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
import { RefreshCw, CheckCircle2, XCircle, Clock, Play } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DeployTrigger } from '@/types';
import { cn } from '@/lib/utils';

export default function Deploys() {
  const [deploys, setDeploys] = useState<DeployTrigger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'deploy_triggers'), 
      orderBy('triggeredAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DeployTrigger[];
      setDeploys(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deploy_triggers');
    });

    return () => unsubscribe();
  }, []);

  const triggerManualDeploy = async () => {
    try {
      const functions = getFunctions(undefined, 'asia-southeast1');
      const manualDeployFn = httpsCallable(functions, 'manualDeploy');
      await manualDeployFn({});
      toast.success('Deploy triggered successfully');
    } catch (error) {
      console.error('Deploy trigger failed:', error);
      toast.error('Failed to trigger deploy');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed': return <CheckCircle2 className="text-green-500 h-4 w-4" />;
      case 'failed': return <XCircle className="text-red-500 h-4 w-4" />;
      case 'building': return <RefreshCw className="text-blue-500 h-4 w-4 animate-spin" />;
      case 'queued': return <Clock className="text-slate-400 h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded">CI/CD Pipeline</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Deployment Engine</h1>
          </div>
          <p className="text-sm text-slate-500">Real-time tracking of static site builds and marketing site synchronization.</p>
        </div>
        <Button onClick={triggerManualDeploy} className="bg-slate-900 hover:bg-slate-800 shadow-md font-bold text-[11px] uppercase tracking-widest h-10 px-6">
          <Play className="mr-2 h-3.5 w-3.5 fill-current" /> Initialize Global Rebuild
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Build History (Last 50 Events)</span>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-200">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-[10px] font-bold text-slate-600 uppercase">System Ready</span>
             </div>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-slate-50/30">
            <TableRow className="border-b border-slate-100/50 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4 px-6">Timestamp</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Trigger Actor</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Mutation Context</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4 px-6 text-right">Operational Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i} className="border-b border-slate-50">
                  <TableCell colSpan={4} className="p-6">
                    <div className="h-4 bg-slate-50 animate-pulse rounded w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : deploys.length > 0 ? (
              deploys.map((deploy) => (
                <TableRow key={deploy.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-xs">
                        {deploy.triggeredAt ? format(deploy.triggeredAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {deploy.triggeredAt ? format(deploy.triggeredAt.toDate(), 'HH:mm:ss') : 'Processing'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded truncate max-w-[150px] inline-block">
                      {deploy.triggeredBy}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight capitalize">{deploy.changedCollection}</span>
                      <span className="text-[9px] font-mono text-slate-400 truncate max-w-[180px]">{deploy.changedDocId}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {getStatusIcon(deploy.status)}
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        deploy.status === 'deployed' ? "text-emerald-600" :
                        deploy.status === 'failed' ? "text-red-600" :
                        deploy.status === 'building' ? "text-blue-600" : "text-slate-400"
                      )}>
                        {deploy.status}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw size={32} className="mb-2 opacity-20" />
                    <p className="text-sm font-medium">Pipeline history is clean.</p>
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
