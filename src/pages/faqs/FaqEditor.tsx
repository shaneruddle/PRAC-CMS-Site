import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Globe, ArrowLeft, Loader2 } from 'lucide-react';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { LanguageSwitcher, LANGUAGES } from '@/components/editor/LanguageSwitcher';
import { FAQ, Translation } from '@/types';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  "Booking & Cancellation",
  "Delivery & Pickup",
  "Documents & Requirements",
  "Insurance & Damage",
  "Payment",
  "During Your Rental"
];

export default function FaqEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  
  const [formData, setFormData] = useState<Partial<FAQ>>({
    category: CATEGORIES[0],
    status: 'draft',
    displayOrder: 0,
    translations: LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang.code]: {} }), {}),
  });

  useEffect(() => {
    if (id) {
      async function fetchFaq() {
        try {
          const docSnap = await getDoc(doc(db, 'faqs', id!));
          if (docSnap.exists()) {
            setFormData(docSnap.data() as FAQ);
          } else {
            navigate('/faqs');
          }
        } catch (error) {
          toast.error('Error loading FAQ');
        } finally {
          setLoading(false);
        }
      }
      fetchFaq();
    }
  }, [id, navigate]);

  const handleTranslationChange = (field: keyof Translation, value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [currentLang]: {
          ...(prev.translations?.[currentLang] || {}),
          [field]: value
        }
      }
    }));
  };

  const saveFaq = async (statusOverride?: 'draft' | 'published') => {
    setSaving(true);
    const status = statusOverride || formData.status;
    const finalId = id || Math.random().toString(36).substring(2, 11);

    try {
      const data = {
        ...formData,
        status,
        updatedAt: serverTimestamp(),
        createdAt: id ? formData.createdAt : serverTimestamp()
      };
      await setDoc(doc(db, 'faqs', finalId), data);
      
      if (status === 'published') {
        await setDoc(doc(collection(db, 'deploy_triggers')), {
          triggeredAt: serverTimestamp(),
          triggeredBy: auth.currentUser?.email,
          status: 'queued',
          changedCollection: 'faqs',
          changedDocId: finalId
        });
        toast.success('FAQ published and deploy triggered');
      } else {
        toast.success('FAQ saved as draft');
      }
      
      if (!id) navigate(`/faqs/${finalId}`);
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center">LOADING FAQ...</div>;

  const currentTranslation = formData.translations?.[currentLang] || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md py-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/faqs')} className="hover:bg-white shadow-sm border border-transparent hover:border-slate-200 transition-all">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Support & Help</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {id ? 'Edit FAQ Item' : 'Create New FAQ'}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">
              {id ? `Reference ID: ${id}` : 'Adding to technical support center'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => saveFaq('draft')} disabled={saving} className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm font-bold text-[11px] uppercase tracking-widest px-4 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
            Save Draft
          </Button>
          <Button onClick={() => saveFaq('published')} disabled={saving} className="bg-blue-600 hover:bg-blue-700 shadow-md font-bold text-[11px] uppercase tracking-widest px-6 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Globe className="mr-2 h-3 w-3" />}
            Publish to Help Center
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">FAQ content</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <LanguageSwitcher selected={currentLang} onSelect={setCurrentLang} />
              
              <div className="space-y-6 pt-2">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Public Question ({currentLang})</Label>
                  <Input 
                    value={currentTranslation.question || ''} 
                    onChange={(e) => handleTranslationChange('question', e.target.value)}
                    placeholder="Enter customer question..."
                    className="text-lg font-bold bg-slate-50/50 border-slate-200 focus:bg-white transition-all h-12"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Detailed Answer ({currentLang})</Label>
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-50">
                    <RichTextEditor 
                      content={currentTranslation.answer || ''}
                      onChange={(val) => handleTranslationChange('answer', val)}
                      placeholder="Explain the answer in detail..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-3 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Categorization</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Topic Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                    <SelectTrigger className="bg-white border-slate-200 font-semibold text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs font-medium">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Global Priority</Label>
                  <Input 
                    type="number" 
                    value={formData.displayOrder} 
                    onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) }))}
                    className="font-bold text-xs"
                  />
                  <p className="text-[10px] text-zinc-400 font-medium">Lower numbers appear first on the list.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Status info</span>
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium uppercase">Current Status</span>
                  <Badge variant={formData.status === 'published' ? 'default' : 'outline'} className={cn(
                    "text-[9px] uppercase tracking-widest",
                    formData.status === 'published' ? "bg-emerald-500" : "text-slate-400 border-slate-200"
                  )}>
                    {formData.status}
                  </Badge>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  Changing status to published will trigger a static site rebuild across all marketing subdomains.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
