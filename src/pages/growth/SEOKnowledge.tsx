import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvaluationResult {
  relevance_score: number;
  relevance_notes: string;
  credibility_score: number;
  credibility_notes: string;
  category: string;
  content: string;
  recommendation: 'add' | 'flag' | 'skip';
  recommendation_reason: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  seo_local: 'Local SEO',
  seo_technical: 'Technical SEO',
  seo_content: 'Content SEO',
  seo_links: 'Link Building',
  seo_schema: 'Schema / Structured Data',
  seo_performance: 'Page Performance',
  seo_general: 'General SEO',
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    score >= 5 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={cn('px-2 py-0.5 rounded border text-[11px] font-bold', color)}>
      {score}/10
    </span>
  );
}

function RecommendationBadge({ rec }: { rec: EvaluationResult['recommendation'] }) {
  if (rec === 'add') return (
    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
      <CheckCircle2 size={18} />
      <span className="font-bold text-sm">Recommended: Add to knowledge base</span>
    </div>
  );
  if (rec === 'flag') return (
    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
      <AlertTriangle size={18} />
      <span className="font-bold text-sm">Flagged: Review before adding</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
      <XCircle size={18} />
      <span className="font-bold text-sm">Skip: Not relevant or credible enough</span>
    </div>
  );
}

export default function SEOKnowledge() {
  const [rawText, setRawText] = useState('');
  const [source, setSource] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedCategory, setEditedCategory] = useState('');

  async function evaluate() {
    if (!rawText.trim()) return;
    setEvaluating(true);
    setResult(null);

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      toast.error('VITE_ANTHROPIC_API_KEY not set in environment');
      setEvaluating(false);
      return;
    }

    const systemPrompt = `You are an SEO knowledge evaluator for Pattaya Rent a Car (pattayarentacar.com), a car rental business in Pattaya, Thailand. Your job is to assess raw SEO knowledge pasted from expert sources (tweets, blogs, YouTube notes, forum posts) and determine whether it is relevant and credible enough to add to our AI growth agent's knowledge base.

Our use case: local service business (car rental), Pattaya/Thailand, Thai + expat + tourist market, competing on local SEO, Google Ads, content marketing.

Return ONLY valid JSON with this exact structure:
{
  "relevance_score": <1-10, how applicable to local car rental SEO in Thailand>,
  "relevance_notes": "<brief explanation>",
  "credibility_score": <1-10, how credible/tested this knowledge appears>,
  "credibility_notes": "<brief explanation>",
  "category": "<one of: seo_local, seo_technical, seo_content, seo_links, seo_schema, seo_performance, seo_general>",
  "content": "<distilled key insight(s), 1-3 sentences, written as actionable facts for our business context>",
  "recommendation": "<add|flag|skip>",
  "recommendation_reason": "<one sentence>"
}

Guidelines:
- add: score 7+ on both relevance and credibility
- flag: score 5-6 on either, or strong on one but weak on other
- skip: score <5 on relevance, or clearly untested/anecdotal with score <5 credibility`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: rawText.trim() }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message ?? `API error ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed: EvaluationResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);
      setEditedContent(parsed.content);
      setEditedCategory(parsed.category);
    } catch (err: any) {
      toast.error(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'agent_knowledge'), {
        category: editedCategory,
        content: editedContent,
        source: source.trim() || null,
        relevanceScore: result.relevance_score,
        credibilityScore: result.credibility_score,
        recommendation: result.recommendation,
        addedAt: serverTimestamp(),
      });
      toast.success('Saved to knowledge base');
      setRawText('');
      setSource('');
      setResult(null);
      setEditedContent('');
      setEditedCategory('');
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setResult(null);
    setEditedContent('');
    setEditedCategory('');
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded">Growth Agent</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SEO Knowledge Capture</h1>
        </div>
        <p className="text-sm text-slate-500">
          Paste raw SEO knowledge from experts you follow. Claude evaluates relevance and credibility before it enters the agent's knowledge base.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Raw Input</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            SEO Knowledge <span className="text-slate-400 font-normal">(tweet, blog excerpt, YouTube notes, test results…)</span>
          </label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste the raw SEO knowledge here…"
            rows={8}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 resize-y font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
            <ExternalLink size={12} />
            Source <span className="text-slate-400 font-normal">(optional — URL, name, or handle)</span>
          </label>
          <input
            type="text"
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="e.g. https://twitter.com/… or @seomike or 'Ahrefs blog'"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
          />
        </div>

        <button
          onClick={evaluate}
          disabled={!rawText.trim() || evaluating}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {evaluating ? (
            <><Loader2 size={16} className="animate-spin" /> Evaluating…</>
          ) : (
            <><Brain size={16} /> Evaluate with Claude</>
          )}
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Evaluation Result</span>
          </div>

          <RecommendationBadge rec={result.recommendation} />
          <p className="text-sm text-slate-600 italic">{result.recommendation_reason}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Relevance</span>
                <ScoreBadge score={result.relevance_score} />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{result.relevance_notes}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Credibility</span>
                <ScoreBadge score={result.credibility_score} />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{result.credibility_notes}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Category
            </label>
            <select
              value={editedCategory}
              onChange={e => setEditedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Distilled Content <span className="text-slate-400 font-normal normal-case text-[10px]">(editable — this is what goes into the agent)</span>
            </label>
            <textarea
              value={editedContent}
              onChange={e => setEditedContent(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
            />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={save}
              disabled={saving || !editedContent.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle2 size={16} /> Save to Knowledge Base</>
              )}
            </button>
            <button
              onClick={discard}
              className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
