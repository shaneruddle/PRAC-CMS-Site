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
  getDoc,
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
  FileText,
  X,
  Pencil,
  Save,
  BarChart2,
  ArrowUp,
  ArrowDown,
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
  skill_name?: string | null;
}

const SKILLS_REGISTRY = [
  { name: 'pattaya-rentacar-location-page',        category: 'content',    description: 'SEO area landing pages',              status: 'active'  as const },
  { name: 'pattaya-rentacar-vehicle-guide',         category: 'content',    description: 'Vehicle / fleet SEO guides',           status: 'active'  as const },
  { name: 'pattaya-car-rental-google-ads-optimizer',category: 'ads',        description: 'Google Ads optimisation',              status: 'active'  as const },
  { name: 'pattaya-seo-onpage',                     category: 'seo',        description: 'On-page fixes (meta, schema, titles)', status: 'active'  as const },
  { name: 'pattaya-conversion',                     category: 'conversion', description: 'Booking flow & CRO',                   status: 'planned' as const },
  { name: 'pattaya-technical',                      category: 'technical',  description: 'Technical fixes',                      status: 'active'  as const },
];

interface SearchConsoleData {
  topQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  topPages: { page: string; clicks: number; impressions: number; ctr: number; position: number }[];
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number;
  error?: string;
}

interface Ga4Channel {
  channel: string;
  sessions: number;
  newUsers: number;
  bounceRate: number;
  engagementRate: number;
}

interface Ga4Page {
  pagePath: string;
  sessions: number;
  pageViews: number;
  bounceRate: number;
}

interface Ga4Data {
  period: { startDate: string; endDate: string };
  channels: Ga4Channel[];
  topPages: Ga4Page[];
  totals: { sessions: number; newUsers: number };
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
  content?: string;
  source?: string;
  confidence?: string;
  category?: string;
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


const DEFAULT_BRIEFING = `# PRAC Cowork Briefing

**Purpose:** This document brings Claude up to speed on the Pattaya Rent a Car technical setup before a task is given. Read this file in full, confirm you understand it, then wait for the task prompt. Once done, reply with: **"Briefing read. Ready for task."** I will then follow up with the specific task prompt.

---

## Business
Pattaya Rent a Car (pattayarentacar.com) — car rental in Pattaya, Thailand. Owner: Shane Ruddle. Timezone: GMT+7.

---

## Repos

### PRAC-Marketing-Site
- **Live site:** www.pattayarentacar.com
- **GitHub:** github.com/shaneruddle/PRAC-Marketing-Site
- **Stack:** React / TypeScript
- **Important:** Most content lives in Firebase/Firestore — NOT in repo files. The repo is the frontend shell only.

### Pattaya-Rent-a-Car-Rebuild-
- **GitHub:** github.com/shaneruddle/Pattaya-Rent-a-Car-Rebuild-
- **What:** Backend API / Cloud Run service. Growth agent, server routes. NOT the public site.
- **Stack:** Node.js / TypeScript / Express
- **Deploy:** Push to main → Cloud Build → Cloud Run (us-west1). Fully automatic.

### PRAC-CMS-Site
- **Live site:** admin-pattayarentacar.web.app
- **GitHub:** github.com/shaneruddle/PRAC-CMS-Site
- **What:** Internal admin dashboard. Only touch this for admin UI changes.
- **Deploy:** Push to main → Firebase Hosting. Fully automatic.

---

## Firebase / Firestore

**Project ID:** pattaya-rent-a-car-rebuild

### Content collections (marketing site)
- \`blog_posts\` — blog articles
- \`faqs\` — FAQ entries
- \`hotels\` — hotel listings
- \`locations\` — location/area landing pages (Jomtien, Naklua, Pratumnak, etc.)
- \`vehicle_guides\` — vehicle and fleet category guides

### Growth agent collections
- \`agent_runs\` — on-demand analysis runs
- \`agent_tasks\` — approved tasks
- \`agent_knowledge\` — task results / feedback stored after completion
- \`agent_config\` — configuration (including this briefing)

---

## Task type → Where to work

| Task | Where |
|------|-------|
| New location/area page | Write doc to \`locations\` in Firestore |
| New vehicle guide | Write doc to \`vehicle_guides\` in Firestore |
| New blog post | Write doc to \`blog_posts\` in Firestore |
| On-page SEO (meta, schema, hreflang) | PRAC-Marketing-Site repo |
| Conversion / booking flow / UX | PRAC-Marketing-Site repo |
| Technical fixes (redirects, speed, crawl) | PRAC-Marketing-Site repo |
| Google Ads | Google Ads UI via browser — no repo |
| Backend / API / growth agent | Pattaya-Rent-a-Car-Rebuild- repo |
| Admin dashboard UI | PRAC-CMS-Site repo (rare) |

**Rule: content goes into Firestore first. Only touch a repo when a code or template change is also required.**

---

## Code conventions
- Match the style of the existing file exactly — do not impose a new pattern
- React functional components with hooks only — no class components
- TypeScript throughout
- Minimal diffs — change only what the task requires

---

## Deployment rules
- Never cross-deploy CMS and marketing site
- After any deploy, verify the change is live before reporting done
- Cloud Run deploys take ~3 min; Firebase Hosting deploys take ~1 min

---

Once you have read and understood everything above, reply with: **"Briefing read. Ready for task."**
`;

function DeltaBadge({ delta, inverse = false }: { delta: { value: number; pct: number } | null; inverse?: boolean }) {
  if (!delta || delta.value === 0) return <span className="text-[10px] text-slate-300 font-mono">—</span>;
  const positive = inverse ? delta.value < 0 : delta.value > 0;
  return (
    <span className={cn('flex items-center gap-0.5 text-[10px] font-bold', positive ? 'text-emerald-600' : 'text-red-500')}>
      {positive ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
      {Math.abs(delta.pct)}%
    </span>
  );
}

function CoworkBriefingModal({ onClose }: { onClose: () => void }) {
  const [content, setContent]     = useState<string>('');
  const [editing, setEditing]     = useState(false);
  const [editText, setEditText]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [copied, setCopied]       = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'agent_config', 'cowork_briefing'));
        const text = snap.exists() ? snap.data().content : DEFAULT_BRIEFING;
        setContent(text);
        setEditText(text);
      } catch {
        setContent(DEFAULT_BRIEFING);
        setEditText(DEFAULT_BRIEFING);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'agent_config', 'cowork_briefing'), {
        content: editText,
        updatedAt: serverTimestamp(),
      });
      setContent(editText);
      setEditing(false);
    } catch (err) {
      console.error('Save briefing failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-violet-600" />
            <span className="text-sm font-bold text-slate-800">Cowork Briefing</span>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-violet-50 text-violet-600 px-2 py-0.5 rounded">paste first</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest gap-1.5"
            >
              {copied ? <CheckCircle2 size={11} className="text-emerald-600" /> : <Copy size={11} />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            {editing ? (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Save
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest gap-1.5"
              >
                <Pencil size={11} />
                Edit
              </Button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-3 bg-slate-100 animate-pulse rounded" />)}
            </div>
          ) : editing ? (
            <textarea
              className="w-full h-full min-h-[500px] text-xs font-mono p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-violet-300 text-slate-700 bg-slate-50 leading-relaxed"
              value={editText}
              onChange={e => setEditText(e.target.value)}
            />
          ) : (
            <pre className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">{content}</pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <p className="text-[11px] text-slate-400">Paste this into a new Cowork chat before your task prompt. Claude will confirm it has read the briefing, then you follow up with the specific task.</p>
        </div>
      </div>
    </div>
  );
}

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
  const [briefingOpen, setBriefingOpen]       = useState(false);
  const [ga4, setGa4]                         = useState<Ga4Data | null>(null);
  const [ga4Loading, setGa4Loading]           = useState(true);
  const [ga4Error, setGa4Error]               = useState<string | null>(null);
  const [gscTab, setGscTab]                   = useState<'queries' | 'pages'>('queries');
  const [kbSearch, setKbSearch]               = useState('');
  const [ignoringIndex, setIgnoringIndex]     = useState<number | null>(null);
  const [retryingIndex, setRetryingIndex]     = useState<number | null>(null);

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

        // knowledge loaded via live subscription below
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

  // Live subscription to agent_knowledge
  useEffect(() => {
    const q = query(collection(db, 'agent_knowledge'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, snap => {
      setKnowledge(snap.docs.map(d => ({ id: d.id, ...d.data() })) as AgentKnowledge[]);
    });
    return unsub;
  }, []);


  // Fetch GA4 data once on mount — rolling 28-day window, not per-run
  useEffect(() => {
    async function fetchGa4() {
      try {
        const user = auth.currentUser;
        if (!user) { setGa4Loading(false); return; }
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/api/ga4/performance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`GA4 HTTP ${res.status}`);
        const data: Ga4Data = await res.json();
        setGa4(data);
      } catch (err: any) {
        setGa4Error(err.message || 'GA4 unavailable');
      } finally {
        setGa4Loading(false);
      }
    }
    fetchGa4();
  }, []);

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

  const handleIgnore = useCallback((action: AgentRunAction) => {
    setIgnoringIndex(action.index);
  }, []);

  const handleIgnoreWithReason = useCallback(async (action: AgentRunAction, reason: string) => {
    if (!activeRunId) return;
    try {
      await setDoc(doc(db, 'agent_tasks', `${activeRunId}-${action.index}`), {
        runId: activeRunId,
        actionIndex: action.index,
        action: action.action,
        channel: action.category,
        priority: action.priority,
        status: 'ignored',
        ignoreReason: reason,
        ignoredAt: serverTimestamp(),
      });
      // Feed into knowledge so the agent stops recommending it
      await addDoc(collection(db, 'agent_knowledge'), {
        topic: `Ignored: ${action.action.slice(0, 60)}`,
        category: action.category,
        content: `Action was ignored. Reason: ${reason}. Full action: ${action.action}`,
        fact: `Ignored (${reason}): ${action.action.slice(0, 200)}`,
        source: 'ignored-action',
        confidence: 'medium',
        runId: activeRunId,
        createdAt: serverTimestamp(),
      });
      setIgnoringIndex(null);
    } catch (err) {
      console.error('Ignore failed:', err);
    }
  }, [activeRunId]);

  const handleRetry = useCallback(async (action: AgentRunAction) => {
    if (!activeRunId) return;
    setRetryingIndex(action.index);
    try {
      const taskId = `${activeRunId}-${action.index}`;
      await updateDoc(doc(db, 'agent_tasks', taskId), {
        status: 'queued',
        error: null,
        retryAt: serverTimestamp(),
      });
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');
      fetch(EXECUTOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ taskId }),
      }).catch(err => console.error('Retry executor call failed:', err));
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setRetryingIndex(null);
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

  // Week-over-week deltas: compare active run to the immediately previous run
  const prevRun = runs.find(r => r.id !== activeRunId);
  const prevGsc = prevRun?.searchConsole;
  const computeDelta = (curr: number, prev: number | undefined) => {
    if (prev === undefined || prev === 0) return null;
    const diff = curr - prev;
    return { value: diff, pct: Math.round((diff / prev) * 100) };
  };
  const clicksDelta      = gsc && prevGsc ? computeDelta(gsc.totalClicks, prevGsc.totalClicks) : null;
  const impressionsDelta = gsc && prevGsc ? computeDelta(gsc.totalImpressions, prevGsc.totalImpressions) : null;
  const positionDelta    = gsc && prevGsc ? computeDelta(gsc.avgPosition, prevGsc.avgPosition) : null;

  // Carry-over aging: count how many of the other loaded runs also flagged this action
  const carryOverWeeks = (actionText: string) =>
    runs.filter(r => r.id !== activeRunId && r.actions.some(a => a.isCarryOver && a.action === actionText)).length + 1;

  // Knowledge search filter
  const filteredKnowledge = kbSearch.trim()
    ? knowledge.filter(e =>
        e.topic?.toLowerCase().includes(kbSearch.toLowerCase()) ||
        e.fact?.toLowerCase().includes(kbSearch.toLowerCase()) ||
        e.content?.toLowerCase().includes(kbSearch.toLowerCase()) ||
        e.category?.toLowerCase().includes(kbSearch.toLowerCase())
      )
    : knowledge;

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
          {/* Platform logos */}
          <div className="flex items-center gap-2 mt-2">
            {[
              { name: 'Google Analytics 4',    url: 'https://cdn.simpleicons.org/googleanalytics' },
              { name: 'Google Search Console', url: 'https://cdn.simpleicons.org/googlesearchconsole' },
              { name: 'Bing Webmaster Tools',  url: 'https://cdn.simpleicons.org/microsoftbing' },
              { name: 'Firebase Enquiries',    url: 'https://cdn.simpleicons.org/firebase' },
              { name: 'DataForSEO Rankings',    url: 'https://cdn.simpleicons.org/dataforseo' },
            ].map(p => (
              <div key={p.name} title={p.name} className="w-7 h-7 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden p-1">
                <img src={p.url} alt={p.name} className="w-full h-full object-contain" />
              </div>
            ))}
          </div>
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBriefingOpen(true)}
            className="h-7 text-xs gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <FileText size={12} />
            Cowork Briefing
          </Button>
          {analysisError && <span className="text-xs text-red-600">{analysisError}</span>}
        </div>
      </div>

      {briefingOpen && <CoworkBriefingModal onClose={() => setBriefingOpen(false)} />}

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
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-slate-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Google Search Console{activeRun ? ` — ${activeRun.period.start} to ${activeRun.period.end}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setGscTab('queries')}
                className={cn('text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md transition-colors', gscTab === 'queries' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600')}
              >
                Queries
              </button>
              <button
                onClick={() => setGscTab('pages')}
                className={cn('text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md transition-colors', gscTab === 'pages' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600')}
              >
                Pages
              </button>
            </div>
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
              {gscTab === 'queries' && gsc.topQueries.length > 0 && (
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
              {gscTab === 'pages' && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Top Pages</p>
                  {(!gsc.topPages || gsc.topPages.length === 0) ? (
                    <p className="text-xs text-slate-400">No page data in this run.</p>
                  ) : (
                    <div className="rounded-lg border border-slate-100 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Page</th>
                            <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clicks</th>
                            <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impr</th>
                            <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">CTR</th>
                            <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {gsc.topPages.slice(0, 10).map((p, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2 text-slate-700 font-medium max-w-[240px] truncate" title={p.page}>{p.page}</td>
                              <td className="px-3 py-2 text-right text-slate-600 font-mono">{p.clicks}</td>
                              <td className="px-3 py-2 text-right text-slate-400 font-mono">{p.impressions.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right text-slate-400 font-mono">{(p.ctr * 100).toFixed(1)}%</td>
                              <td className="px-4 py-2 text-right font-mono">
                                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold',
                                  p.position <= 3 ? 'bg-emerald-50 text-emerald-700' :
                                  p.position <= 10 ? 'bg-amber-50 text-amber-700' :
                                  'bg-slate-100 text-slate-500'
                                )}>
                                  {p.position}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}


      {/* GA4 Panel — rolling 28-day window */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Google Analytics 4{ga4 ? ` — ${ga4.period.startDate} to ${ga4.period.endDate}` : ''}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-300">28-day rolling</span>
        </div>
        {ga4Loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-3 bg-slate-50 animate-pulse rounded" />)}
          </div>
        ) : ga4Error ? (
          <div className="px-6 py-5 flex items-center gap-2 text-red-600">
            <AlertCircle size={14} />
            <p className="text-xs">GA4 error: {ga4Error}</p>
          </div>
        ) : ga4 ? (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sessions</p>
                <p className="text-xl font-bold text-slate-800">{ga4.totals.sessions.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New Users</p>
                <p className="text-xl font-bold text-slate-800">{ga4.totals.newUsers.toLocaleString()}</p>
              </div>
            </div>
            {ga4.channels.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sessions by Channel</p>
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Channel</th>
                        <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sessions</th>
                        <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">New Users</th>
                        <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bounce</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {ga4.channels.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2 text-slate-700 font-medium">{c.channel}</td>
                          <td className="px-3 py-2 text-right text-slate-600 font-mono">{c.sessions.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-slate-400 font-mono">{c.newUsers.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-mono">
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold',
                              c.bounceRate < 0.4 ? 'bg-emerald-50 text-emerald-700' :
                              c.bounceRate < 0.7 ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-600'
                            )}>
                              {(c.bounceRate * 100).toFixed(0)}%
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
                      {action.isCarryOver && (() => {
                        const wks = carryOverWeeks(action.action);
                        return (
                          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 text-center">
                            {wks > 1 ? `${wks}w carry-over` : 'carry-over'}
                          </span>
                        );
                      })()}
                      {action.skill_name && (
                        <span title={`Cowork skill: ${action.skill_name}`} className="text-[9px] font-bold tracking-wide px-2 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-200 text-center truncate max-w-[90px]">
                          {action.skill_name.replace('pattaya-', '')}
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
                        <div className="flex flex-col items-end gap-1">
                          <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold', statusCfg?.className)}>
                            {StatusIcon && <StatusIcon size={11} className={(statusCfg as any)?.spin ? 'animate-spin' : ''} />}
                            {statusCfg?.label}
                          </div>
                          {task.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[9px] font-bold uppercase tracking-widest border-slate-200 text-slate-500 hover:text-slate-700 gap-1"
                              onClick={() => handleRetry(action)}
                              disabled={retryingIndex === action.index}
                            >
                              {retryingIndex === action.index
                                ? <Loader2 size={9} className="animate-spin" />
                                : <RotateCcw size={9} />}
                              Retry
                            </Button>
                          )}
                        </div>
                      ) : ignoringIndex === action.index ? (
                        <div className="flex flex-col gap-1.5 items-end">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Why ignore?</p>
                          <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                            {[
                              { value: 'already_done', label: 'Already done' },
                              { value: 'not_relevant',  label: 'Not relevant' },
                              { value: 'too_risky',     label: 'Too risky' },
                              { value: 'defer',         label: 'Defer' },
                            ].map(r => (
                              <button
                                key={r.value}
                                onClick={() => handleIgnoreWithReason(action, r.value)}
                                className="text-[9px] font-bold px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                              >
                                {r.label}
                              </button>
                            ))}
                            <button
                              onClick={() => setIgnoringIndex(null)}
                              className="text-[9px] font-bold px-2 py-0.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
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

      {/* Skills registry */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Zap size={14} className="text-slate-500" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Cowork Skills</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SKILLS_REGISTRY.map(skill => (
            <div key={skill.name} className={cn('rounded-lg border p-3', skill.status === 'active' ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50')}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded', skill.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600')}>
                  {skill.status === 'active' ? 'Active' : 'Planned'}
                </span>
                <span className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded', CHANNEL_CLASS[skill.category] ?? 'bg-slate-100 text-slate-600')}>
                  {skill.category}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 mb-0.5">{skill.name.replace('pattaya-', '')}</p>
              <p className="text-[11px] text-slate-500">{skill.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge base */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-slate-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Agent Knowledge Base</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                type="text"
                placeholder="Search…"
                value={kbSearch}
                onChange={e => setKbSearch(e.target.value)}
                className="pl-6 pr-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-300 w-36 text-slate-700 placeholder:text-slate-300"
              />
            </div>
            <button onClick={() => setExpandedKnowledge(v => !v)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">
              {expandedKnowledge ? 'Show less' : `Show all ${knowledge.length}`}
              {expandedKnowledge ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
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
            {(expandedKnowledge ? filteredKnowledge : filteredKnowledge.slice(0, 5)).map(entry => (
              <div key={entry.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-700">{entry.topic}</span>
                      {entry.confidence && (
                        <span className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded',
                          entry.confidence === 'high' ? 'bg-emerald-50 text-emerald-600' :
                          entry.confidence === 'medium' ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        )}>
                          {entry.confidence}
                        </span>
                      )}
                      {entry.category && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {entry.category}
                        </span>
                      )}
                    </div>
                    {/* Summary */}
                    <p className="text-xs font-medium text-slate-500 bg-slate-50 rounded px-2.5 py-1.5 mb-2 leading-relaxed border-l-2 border-slate-200">
                      {entry.fact}
                    </p>
                    {/* Full report */}
                    {entry.content && entry.content.length > (entry.fact?.length ?? 0) && (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                    )}
                    {entry.source && <p className="text-[10px] text-slate-400 mt-2">Source: {entry.source}</p>}
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
