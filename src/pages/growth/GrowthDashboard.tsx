import React, { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Zap,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  XCircle,
  Copy,
  ClipboardCheck,
  Search,
  MousePointerClick,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ── Interfaces ───────────────────────────────────────────────────────────────

interface AgentRunAction {
  index: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
  reasoning: string;
  isCarryOver?: boolean;
}

interface SearchConsoleData {
  topQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  topPages: { page: string; clicks: number; impressions: number; ctr: number; position: number }[];
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number;
  error?: string;
}

interface AgentRun {
  id: string;
  createdAt: { toDate: () => Date };
  period: { start: string; end: string };
  summary?: string;
  highlights?: string[];
  concerns?: string[];
  actions: AgentRunAction[];
  searchConsole?: SearchConsoleData;
}

interface AgentTask {
  id: string;
  runId: string;
  actionIndex: number;
  status: 'queued' | 'executing' | 'done' | 'failed' | 'ignored' | 'cowork_ready';
  result?: string;
  error?: string;
  coworkPrompt?: string;
}

interface AgentKnowledge {
  id: string;
  topic: string;
  fact: string;
  source?: string;
  confidence?: string;
  createdAt?: { toDate: () => Date };
}

// ── Style maps ───────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high:   { label: 'High',   className: 'bg-red-50 text-red-700 border-red-200' },
  medium: { label: 'Medium', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  low:    { label: 'Low',    className: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const CHANNEL_CLASS: Record<string, string> = {
  seo:        'bg-purple-50 text-purple-700',
  ads:        'bg-yellow-50 text-yellow-800',
  content:    'bg-teal-50 text-teal-700',
  conversion: 'bg-indigo-50 text-indigo-700',
  technical:  'bg-gray-100 text-gray-700',
  other:      'bg-slate-100 text-slate-600',
};

const STATUS_CONFIG = {
  queued:       { label: 'Queued',       icon: Clock,          className: 'text-amber-600 bg-amber-50' },
  executing:    { label: 'Executing',    icon: Loader2,        className: 'text-blue-600 bg-blue-50', spin: true },
  done:         { label: 'Done',         icon: CheckCircle2,   className: 'text-emerald-600 bg-emerald-50' },
  failed:       { label: 'Failed',       icon: XCircle,        className: 'text-red-600 bg-red-50' },
  ignored:      { label: 'Ignored',      icon: XCircle,        className: 'text-slate-400 bg-slate-50' },
  cowork_ready: { label: 'Needs Cowork', icon: ClipboardCheck, className: 'text-orange-600 bg-orange-50' },
};

const EXECUTOR_URL = 'https://pattaya-rent-a-car-rebuild-700448424476.us-west1.run.app/api/growth/generate-prompt';
const BACKEND_URL  = 'https://pattaya-rent-a-car-rebuild-700448424476.us-west1.run.app';

// ── Component ────────────────────────────────────────────────────────────────

export default function GrowthDashboard() {
  const [runs, setRuns]                   = useState<AgentRun[]>([]);
  const [activeRunId, setActiveRunId]     = useState<string | null>(null);
  const [tasks, setTasks]                 = useState<Record<number, AgentTask>>({});
  const [knowledge, setKnowledge]         = useState<AgentKnowledge[]>([]);
  const [loading, setLoading]             = useState(true);
  const [approvingIndex, setApprovingIndex] = useState<number | null>(null);
  const [pasteResults, setPasteResults]   = useState<Record<number, string>>({});
  const [submittingResult, setSubmittingResult] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex]     = useState<number | null>(null);
  const [expandedKnowledge, setExpandedKnowledge] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Load last 3 runs + knowledge
  useEffect(() => {
    async function load() {
      try {
        const runsSnap = await getDocs(
          query(collection(db, 'agent_runs'), orderBy('createdAt', 'desc'), limit(3))
        );
        const runDocs = runsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AgentRun[];
        setRuns(runDocs);
        if (runDocs.length > 0) setActiveRunId(runDocs[0].id);

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

  // Live task subscription for active run
  useEffect(() => {
    if (!activeRunId) return;
    const q = query(collection(db, 'agent_tasks'), where('runId', '==', activeRunId));
    const unsub = onSnapshot(q, snap => {
      const taskMap: Record<number, AgentTask> = {};
      snap.docs.forEach(d => {
        const t = { id: d.id, ...d.data() } as AgentTask;
        taskMap[t.actionIndex] = t;
      });
      setTasks(taskMap);
    });
    return unsub;
  }, [activeRunId]);

  // Reset task state when switching run tabs
  const handleSelectRun = useCallback((runId: string) => {
    setActiveRunId(runId);
    setTasks({});
    setPasteResults({});
    setApprovingIndex(null);
  }, []);

  const activeRun = runs.find(r => r.id === activeRunId) ?? null;

  const handleApprove = useCallback(async (action: AgentRunAction) => {
    if (!activeRunId) return;
    setApprovingIndex(action.index);
    try {
      const taskId = `${activeRunId}-${action.index}`;
      await setDoc(doc(db, 'agent_tasks', taskId), {
        runId: activeRunId,
        actionIndex: action.index,
        action: action.action,
        channel: action.category,
        priority: action.priority,
        status: 'queued',
        approvedAt: serverTimestamp(),
      });
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');
      fetch(EXECUTOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ taskId }),
      }).catch(err => console.error('Executor call failed:', err));
    } catch (err: any) {
      console.error('Approve failed:', err);
    } finally {
      setApprovingIndex(null);
    }
  }, [activeRunId]);

  const handleIgnore = useCallback(async (action: AgentRunAction) => {
    if (!activeRunId) return;
    try {
      await setDoc(doc(db, 'agent_tasks', `${activeRunId}-${action.index}`), {
        runId: activeRunId,
        actionIndex: action.index,
        action: action.action,
        channel: action.category,
        priority: action.priority,
        status: 'ignored',
        approvedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Ignore failed:', err);
    }
  }, [activeRunId]);

  const handleCopyPrompt = useCallback((action: AgentRunAction, prompt: string) => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopiedIndex(action.index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }, []);

  const handleSubmitResult = useCallback(async (action: AgentRunAction) => {
    if (!activeRunId) return;
    const result = pasteResults[action.index]?.trim();
    if (!result) return;
    setSubmittingResult(action.index);
    try {
      const taskId = `${activeRunId}-${action.index}`;
      await updateDoc(doc(db, 'agent_tasks', taskId), {
        status: 'done', result, executedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'agent_knowledge'), {
        topic: action.action.slice(0, 80),
        category: action.category,
        content: result,
        fact: result.slice(0, 300),
        source: 'cowork-execution',
        confidence: 'high',
        runId: activeRunId,
        createdAt: serverTimestamp(),
      });
      setPasteResults(prev => { const n = { ...prev }; delete n[action.index]; return n; });
    } catch (err) {
      console.error('Submit result failed:', err);
    } finally {
      setSubmittingResult(null);
    }
  }, [activeRunId, pasteResults]);

  const handleRunNow = useCallback(async () => {
    setRunningAnalysis(true);
    setAnalysisError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/api/growth/run-now`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Analysis failed');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setAnalysisError(err.message || 'Unknown error');
    } finally {
      setRunningAnalysis(false);
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const gsc = activeRun?.searchConsole;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Growth Agent</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Growth Dashboard</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-slate-500">On-demand marketing analysis — last 7 days of data.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunNow}
            disabled={runningAnalysis}
            className="h-7 text-xs gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            {runningAnalysis ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {runningAnalysis ? 'Analysing…' : 'Run Analysis Now'}
          </Button>
          {analysisError && <span className="text-xs text-red-600">{analysisError}</span>}
        </div>
      </div>

      {/* Run tabs */}
      {!loading && runs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {runs.map((run, i) => {
            const ts = run.createdAt?.toDate?.();
            const label = ts ? format(ts, 'd MMM, HH:mm') : `Run ${runs.length - i}`;
            const isActive = run.id === activeRunId;
            return (
              <button
                key={run.id}
                onClick={() => handleSelectRun(run.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors',
                  isActive
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700'
                )}
              >
                <RotateCcw size={10} />
                {i === 0 ? 'Latest' : label}
                {i > 0 && <span className="opacity-60 font-normal">— {label}</span>}
              </button>
            );
          })}
          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 w-28 bg-slate-100 animate-pulse rounded-full" />
          ))}
        </div>
      )}

      {/* Summary card */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="h-4 bg-slate-50 animate-pulse rounded w-1/3 mb-3" />
          <div className="h-3 bg-slate-50 animate-pulse rounded w-full mb-2" />
          <div className="h-3 bg-slate-50 animate-pulse rounded w-3/4" />
        </div>
      ) : activeRun ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Analysis — {activeRun.period.start} to {activeRun.period.end}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {activeRun.createdAt?.toDate
                    ? `Run ${format(activeRun.createdAt.toDate(), 'EEE d MMM yyyy, HH:mm')}`
                    : 'Recent run'}
                </p>
              </div>
            </div>
          </div>
          {activeRun.summary && (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
              {activeRun.summary}
            </p>
          )}
          {(activeRun.highlights?.length || activeRun.concerns?.length) ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              {activeRun.highlights?.length ? (
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Highlights</p>
                  <ul className="space-y-1">
                    {activeRun.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <CheckCircle2 size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {activeRun.concerns?.length ? (
                <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1.5">Concerns</p>
                  <ul className="space-y-1">
                    {activeRun.concerns.map((c, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <AlertCircle size={11} className="text-amber-500 mt-0.5 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : !loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center gap-3 text-slate-400">
          <Zap size={32} className="opacity-20" />
          <p className="text-sm font-medium">No analysis runs yet.</p>
          <Button size="sm" onClick={handleRunNow} disabled={runningAnalysis} className="bg-violet-600 hover:bg-violet-700 text-white mt-1">
            {runningAnalysis ? <Loader2 size={12} className="animate-spin mr-1.5" /> : <Zap size={12} className="mr-1.5" />}
            Run First Analysis
          </Button>
        </div>
      ) : null}

      {/* Search Console panel */}
      {(loading || gsc) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Search size={14} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Google Search Console{activeRun ? ` — ${activeRun.period.start} to ${activeRun.period.end}` : ''}
            </span>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-3 bg-slate-50 animate-pulse rounded" />)}
            </div>
          ) : gsc?.error ? (
            <div className="px-6 py-5 flex items-center gap-2 text-red-600">
              <AlertCircle size={14} />
              <p className="text-xs">GSC error: {gsc.error}</p>
            </div>
          ) : gsc ? (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <MousePointerClick size={12} className="text-emerald-600" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clicks</p>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{gsc.totalClicks.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Eye size={12} className="text-blue-500" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impressions</p>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{gsc.totalImpressions.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <TrendingUp size={12} className="text-purple-500" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Position</p>
                  </div>
                  <p className="text-xl font-bold text-slate-800">{gsc.avgPosition}</p>
                </div>
              </div>
              {gsc.topQueries.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Top Queries</p>
                  <div className="rounded-lg border border-slate-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Query</th>
                          <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clicks</th>
                          <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impr</th>
                          <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">CTR</th>
                          <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {gsc.topQueries.slice(0, 10).map((q, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-2 text-slate-700 font-medium max-w-[240px] truncate">{q.query}</td>
                            <td className="px-3 py-2 text-right text-slate-600 font-mono">{q.clicks}</td>
                            <td className="px-3 py-2 text-right text-slate-400 font-mono">{q.impressions.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-slate-400 font-mono">{(q.ctr * 100).toFixed(1)}%</td>
                            <td className="px-4 py-2 text-right font-mono">
                              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold',
                                q.position <= 3 ? 'bg-emerald-50 text-emerald-700' :
                                q.position <= 10 ? 'bg-amber-50 text-amber-700' :
                                'bg-slate-100 text-slate-500'
                              )}>
                                {q.position}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Recommended Actions{activeRun ? ` — ${activeRun.period.start} to ${activeRun.period.end}` : ''}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{activeRun?.actions.length ?? 0} actions</span>
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
        ) : !activeRun || activeRun.actions.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
            <AlertCircle size={28} className="opacity-20" />
            <p className="text-sm font-medium">No actions — run an analysis first.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activeRun.actions.map(action => {
              const task = tasks[action.index];
              const statusCfg = task ? STATUS_CONFIG[task.status] : null;
              const StatusIcon = statusCfg?.icon;
              const isApproving = approvingIndex === action.index;
              const priorityCfg = PRIORITY_CONFIG[action.priority] ?? PRIORITY_CONFIG.low;

              return (
                <div
                  key={action.index}
                  className={cn('px-6 py-5 transition-colors', task && task.status !== 'ignored' ? 'bg-slate-50/60' : 'hover:bg-slate-50/50')}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                      <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border', priorityCfg.className)}>
                        {priorityCfg.label}
                      </span>
                      {action.isCarryOver && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 text-center">
                          carry-over
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold mb-1', task?.status === 'ignored' ? 'text-slate-400 line-through' : 'text-slate-900')}>
                        {action.action}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">{action.reasoning}</p>

                      {task?.result && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                          <p className="text-xs text-emerald-800 leading-relaxed">{task.result}</p>
                        </div>
                      )}
                      {task?.error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                          <p className="text-xs text-red-700 leading-relaxed">{task.error}</p>
                        </div>
                      )}

                      {task?.status === 'cowork_ready' && task.coworkPrompt && (
                        <div className="mt-3 space-y-2">
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">Cowork Prompt</span>
                              <button
                                onClick={() => handleCopyPrompt(action, task.coworkPrompt!)}
                                className="flex items-center gap-1 text-[10px] font-bold text-orange-700 hover:text-orange-900 transition-colors"
                              >
                                {copiedIndex === action.index ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                                {copiedIndex === action.index ? 'Copied!' : 'Copy prompt'}
                              </button>
                            </div>
                            <pre className="text-xs text-orange-900 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">{task.coworkPrompt}</pre>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paste Cowork result here</p>
                            <textarea
                              className="w-full h-24 text-xs p-2.5 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-slate-300 text-slate-700 placeholder:text-slate-300 bg-white"
                              placeholder="Paste the result from your Cowork session..."
                              value={pasteResults[action.index] ?? ''}
                              onChange={e => setPasteResults(prev => ({ ...prev, [action.index]: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleSubmitResult(action)}
                              disabled={!pasteResults[action.index]?.trim() || submittingResult === action.index}
                            >
                              {submittingResult === action.index
                                ? <Loader2 size={11} className="animate-spin mr-1" />
                                : <CheckCircle2 size={11} className="mr-1" />}
                              Save Result to Memory
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full', CHANNEL_CLASS[action.category] ?? 'bg-slate-100 text-slate-600')}>
                        {action.category}
                      </span>

                      {task ? (
                        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold', statusCfg?.className)}>
                          {StatusIcon && <StatusIcon size={11} className={(statusCfg as any)?.spin ? 'animate-spin' : ''} />}
                          {statusCfg?.label}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleApprove(action)}
                            disabled={isApproving}
                          >
                            {isApproving ? <Loader2 size={11} className="animate-spin mr-1" /> : <ThumbsUp size={11} className="mr-1" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            onClick={() => handleIgnore(action)}
                            disabled={isApproving}
                          >
                            <ThumbsDown size={11} className="mr-1" />
                            Ignore
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Knowledge base */}
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
                        <span className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded',
                          entry.confidence === 'high' ? 'bg-emerald-50 text-emerald-600' :
                          entry.confidence === 'medium' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        )}>
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
