import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Zap,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AgentWeek {
  id: string;
  weekId: string;
  status: 'collected' | 'analysed';
  createdAt?: { toDate: () => Date };
  analysedAt?: { toDate: () => Date };
  summary?: string;
}

interface AgentAction {
  id: string;
  weekId: string;
  priority: number;
  action: string;
  rationale: string;
  channel: string;
  outcome?: string;
  createdAt?: { toDate: () => Date };
}

interface AgentKnowledge {
  id: string;
  topic: string;
  fact: string;
  source?: string;
  confidence?: string;
  createdAt?: { toDate: () => Date };
}

const PRIORITY_LABEL: Record<number, string> = { 1: 'Critical', 2: 'High', 3: 'Medium' };
const PRIORITY_CLASS: Record<number, string> = {
  1: 'bg-red-50 text-red-700 border-red-200',
  2: 'bg-orange-50 text-orange-700 border-orange-200',
  3: 'bg-blue-50 text-blue-700 border-blue-200',
};
const CHANNEL_CLASS: Record<string, string> = {
  seo: 'bg-purple-50 text-purple-700',
  google_ads: 'bg-yellow-50 text-yellow-800',
  social: 'bg-pink-50 text-pink-700',
  content: 'bg-teal-50 text-teal-700',
  ux: 'bg-indigo-50 text-indigo-700',
};

export default function GrowthDashboard() {
  const [weeks, setWeeks] = useState<AgentWeek[]>([]);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [knowledge, setKnowledge] = useState<AgentKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKnowledge, setExpandedKnowledge] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const weeksSnap = await getDocs(
          query(collection(db, 'agent_weeks'), orderBy('createdAt', 'desc'), limit(8))
        );
        const weekDocs = weeksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AgentWeek[];
        setWeeks(weekDocs);

        const latestAnalysed = weekDocs.find(w => w.status === 'analysed');
        if (latestAnalysed) {
          const actionsSnap = await getDocs(
            query(
              collection(db, 'agent_actions'),
              where('weekId', '==', latestAnalysed.weekId),
              orderBy('priority', 'asc')
            )
          );
          setActions(actionsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AgentAction[]);
        }

        const knowledgeSnap = await getDocs(
          query(collection(db, 'agent_knowledge'), orderBy('createdAt', 'desc'), limit(20))
        );
        setKnowledge(knowledgeSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AgentKnowledge[]);
      } catch (err) {
        console.error('GrowthDashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const latestAnalysed = weeks.find(w => w.status === 'analysed');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Growth Agent</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Growth Dashboard</h1>
        </div>
        <p className="text-sm text-slate-500">AI-generated actions from weekly marketing data analysis. Runs every Monday 07:30 BKK.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 w-24 bg-slate-100 animate-pulse rounded-full" />)
          : weeks.map(week => (
              <div key={week.id} className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border', week.status === 'analysed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                {week.status === 'analysed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {week.weekId}
              </div>
            ))
        }
      </div>

      {latestAnalysed && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Latest Analysis — {latestAnalysed.weekId}</p>
                <p className="text-sm font-semibold text-slate-800">
                  {latestAnalysed.analysedAt ? `Analysed ${format(latestAnalysed.analysedAt.toDate(), 'EEE d MMM yyyy, HH:mm')}` : 'Recently analysed'}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold uppercase tracking-widest">Analysed</Badge>
          </div>
          {latestAnalysed.summary && (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{latestAnalysed.summary}</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Recommended Actions{latestAnalysed ? ` — ${latestAnalysed.weekId}` : ''}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{actions.length} actions</span>
        </div>
        {loading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-5">
                <div className="h-4 bg-slate-50 animate-pulse rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-50 animate-pulse rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : actions.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
            <AlertCircle size={28} className="opacity-20" />
            <p className="text-sm font-medium">No actions yet — analysis runs Monday 07:30 BKK.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {actions.map(action => (
              <div key={action.id} className="px-6 py-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-4">
                  <span className={cn('shrink-0 mt-0.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border', PRIORITY_CLASS[action.priority] ?? 'bg-slate-50 text-slate-600 border-slate-200')}>
                    P{action.priority} {PRIORITY_LABEL[action.priority] ?? ''}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 mb-1">{action.action}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{action.rationale}</p>
                  </div>
                  <span className={cn('shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full', CHANNEL_CLASS[action.channel] ?? 'bg-slate-100 text-slate-600')}>
                    {action.channel.replace('_', ' ')}
                  </span>
                </div>
                {action.outcome && (
                  <div className="mt-3 ml-[72px] flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-[11px] text-slate-500 font-medium">{action.outcome}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Agent Knowledge Base</span>
          </div>
          <button onClick={() => setExpandedKnowledge(v => !v)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
            {expandedKnowledge ? 'Show less' : `Show all ${knowledge.length}`}
            {expandedKnowledge ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
        {loading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="h-3 bg-slate-50 animate-pulse rounded w-1/3 mb-2" />
                <div className="h-4 bg-slate-50 animate-pulse rounded w-full" />
              </div>
            ))}
          </div>
        ) : knowledge.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 gap-2">
            <BookOpen size={24} className="opacity-20" />
            <p className="text-sm font-medium">No knowledge entries yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {(expandedKnowledge ? knowledge : knowledge.slice(0, 5)).map(entry => (
              <div key={entry.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.topic}</span>
                      {entry.confidence && (
                        <span className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded', entry.confidence === 'high' ? 'bg-emerald-50 text-emerald-600' : entry.confidence === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500')}>
                          {entry.confidence}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{entry.fact}</p>
                    {entry.source && <p className="text-[10px] text-slate-400 mt-1">Source: {entry.source}</p>}
                  </div>
                  {entry.createdAt && (
                    <span className="shrink-0 text-[10px] font-mono text-slate-300">{format(entry.createdAt.toDate(), 'MMM d')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
