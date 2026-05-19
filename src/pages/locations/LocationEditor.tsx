import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Globe, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { LanguageSwitcher, LANGUAGES } from '@/components/editor/LanguageSwitcher';
import { Location, Translation, WebsiteCar } from '@/types';
import { cn } from '@/lib/utils';

export default function LocationEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const [websiteCars, setWebsiteCars] = useState<WebsiteCar[]>([]);

  const [formData, setFormData] = useState<Partial<Location>>({
    slug: '',
    status: 'draft',
    translations: LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang.code]: {} }), {}),
    nearbyAreas: [],
    featuredCarIds: [],
    displayOrder: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [locSnap, carsSnap] = await Promise.all([
          getDoc(doc(db, 'locations', slug!)),
          getDocs(query(collection(db, 'website_cars'), orderBy('name')))
        ]);

        if (locSnap.exists()) {
          setFormData(locSnap.data() as Location);
        }
        setWebsiteCars(carsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as WebsiteCar[]);
      } catch (error) {
        toast.error('Error loading data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const handleTranslationChange = (field: keyof Translation, value: any) => {
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

  const handleFAQChange = (index: number, field: 'question' | 'answer', value: string) => {
    const currentFAQs = [...(formData.translations?.[currentLang]?.faqs || [])];
    if (!currentFAQs[index]) currentFAQs[index] = { question: '', answer: '' };
    currentFAQs[index] = { ...currentFAQs[index], [field]: value };
    handleTranslationChange('faqs', currentFAQs);
  };

  const saveLocation = async (statusOverride?: 'draft' | 'published') => {
    setSaving(true);
    const status = statusOverride || formData.status;
    try {
      const data = {
        ...formData,
        status,
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'locations', slug!), data);
      
      if (status === 'published') {
        toast.success('Published! Deploy triggered.');
      } else {
        toast.success('Save successful');
      }
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const currentTranslation = formData.translations?.[currentLang] || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md py-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/locations')} className="hover:bg-white shadow-sm border border-transparent hover:border-slate-200 transition-all">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Regional SEO</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {currentTranslation.name || slug} Area Edition
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">
              {slug ? `Routing Path: /locations/${slug}` : 'Configuring new delivery zone'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => saveLocation('draft')} disabled={saving} className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm font-bold text-[11px] uppercase tracking-widest px-4 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
            Save Draft
          </Button>
          <Button onClick={() => saveLocation('published')} disabled={saving} className="bg-blue-600 hover:bg-blue-700 shadow-md font-bold text-[11px] uppercase tracking-widest px-6 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Globe className="mr-2 h-3 w-3" />}
            Go Live
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Area Copywriting</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <LanguageSwitcher selected={currentLang} onSelect={setCurrentLang} />
              
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Area Name ({currentLang})</Label>
                  <Input 
                    value={currentTranslation.name || ''} 
                    onChange={(e) => handleTranslationChange('name', e.target.value)}
                    className="font-bold border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">H1 Landing Heading ({currentLang})</Label>
                  <Input 
                    value={currentTranslation.h1 || ''} 
                    onChange={(e) => handleTranslationChange('h1', e.target.value)}
                    className="font-bold border-slate-200 bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Intro / Meta Summary ({currentLang})</Label>
                <Textarea 
                  value={currentTranslation.intro || ''}
                  onChange={(e) => handleTranslationChange('intro', e.target.value)}
                  rows={2}
                  className="text-sm border-slate-200 bg-slate-50/50 focus:bg-white transition-all leading-relaxed"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Main Landing Content ({currentLang})</Label>
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-50">
                  <RichTextEditor 
                    content={currentTranslation.body || ''}
                    onChange={(val) => handleTranslationChange('body', val)}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Logistics & Delivery Notes ({currentLang})</Label>
                <Textarea 
                  value={currentTranslation.deliveryInfo || ''}
                  onChange={(e) => handleTranslationChange('deliveryInfo', e.target.value)}
                  rows={3}
                  className="text-xs border-slate-200 bg-slate-50/50 focus:bg-white transition-all leading-relaxed"
                />
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">Area Specific FAQs</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-tight">Managing {currentTranslation.faqs?.length || 0} items</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleTranslationChange('faqs', [...(currentTranslation.faqs || []), { question: '', answer: '' }])} className="h-7 text-[10px] font-bold uppercase tracking-widest border-slate-200 hover:bg-slate-50">
                    <Plus className="mr-1.5 h-3 w-3" /> New FAQ
                  </Button>
                </div>
                <div className="grid gap-4">
                  {(currentTranslation.faqs || []).map((faq, i) => (
                    <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 h-6 w-6 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        onClick={() => handleTranslationChange('faqs', currentTranslation.faqs?.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 size={14} />
                      </Button>
                      <Input 
                        placeholder="Area Question (e.g. Free delivery to Jomtien?)" 
                        value={faq.question}
                        onChange={(e) => handleFAQChange(i, 'question', e.target.value)}
                        className="bg-white border-slate-200 text-xs font-bold"
                      />
                      <Textarea 
                        placeholder="Detailed Answer..."
                        value={faq.answer}
                        onChange={(e) => handleFAQChange(i, 'answer', e.target.value)}
                        className="bg-white border-slate-200 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-3 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Display logic</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">System Slug</Label>
                  <Input value={formData.slug} disabled className="font-mono text-xs bg-zinc-50 border-zinc-200 text-zinc-400" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">List Priority</Label>
                  <Input 
                    type="number" 
                    value={formData.displayOrder} 
                    onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) }))}
                    className="font-bold text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hero Background URL</Label>
                  <Input 
                    value={formData.heroImage} 
                    onChange={(e) => setFormData(prev => ({ ...prev, heroImage: e.target.value }))}
                    className="text-xs font-medium"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Google Map Iframe Source</Label>
                  <Input 
                    value={formData.mapEmbedUrl} 
                    onChange={(e) => setFormData(prev => ({ ...prev, mapEmbedUrl: e.target.value }))}
                    className="text-xs font-mono"
                    placeholder="https://google.com/maps/embed/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Regional Fleet</span>
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-2">Select cars to feature in this area:</p>
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {websiteCars.map(car => (
                  <label key={car.id} className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border",
                    formData.featuredCarIds?.includes(car.id!) 
                      ? "bg-blue-50/50 border-blue-100 text-blue-700" 
                      : "hover:bg-slate-50 border-transparent text-slate-600"
                  )}>
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.featuredCarIds?.includes(car.id!)}
                      onChange={(e) => {
                        const ids = e.target.checked 
                          ? [...(formData.featuredCarIds || []), car.id!]
                          : (formData.featuredCarIds || []).filter(id => id !== car.id!);
                        setFormData(prev => ({ ...prev, featuredCarIds: ids }));
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold leading-none">{car.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
