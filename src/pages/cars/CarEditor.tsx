import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Globe, ArrowLeft, Image as ImageIcon, Trash2, Loader2, Plus, GripVertical } from 'lucide-react';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { LanguageSwitcher, LANGUAGES } from '@/components/editor/LanguageSwitcher';
import { Car, Translation } from '@/types';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FEATURES = [
  'Bluetooth', 'USB', 'Reverse Camera', 'Apple CarPlay', 'Android Auto', 
  'Cruise Control', 'GPS', 'Child Seat Available', 'Parking Sensors', 'Sunroof'
];

export default function CarEditor() {
  const { slug: existingSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!existingSlug);
  const [saving, setSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  
  const [formData, setFormData] = useState<Partial<Car>>({
    slug: '',
    status: 'draft',
    available: true,
    make: '',
    model: '',
    year: new Date().getFullYear(),
    category: 'sedan',
    displayOrder: 0,
    images: [],
    specs: {
      seats: 5,
      transmission: 'automatic',
      fuelType: 'Gasoline',
      luggage: '2 Large, 2 Small',
      features: []
    },
    translations: LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang.code]: {} }), {}),
    seo: {}
  });

  useEffect(() => {
    if (existingSlug) {
      async function fetchCar() {
        try {
          const docSnap = await getDoc(doc(db, 'cars', existingSlug!));
          if (docSnap.exists()) {
            setFormData(docSnap.data() as Car);
          } else {
            navigate('/cars');
          }
        } catch (error) {
          toast.error('Error loading car');
        } finally {
          setLoading(false);
        }
      }
      fetchCar();
    }
  }, [existingSlug, navigate]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !formData.slug) return;
    
    setSaving(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `cars/${formData.slug}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      });
      
      const urls = await Promise.all(uploadPromises);
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      toast.success(`${urls.length} images uploaded`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const removeImage = async (url: string) => {
    setFormData(prev => ({ ...prev, images: prev.images?.filter(img => img !== url) }));
    // Optional: Delete from storage as well
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (e) {
      console.warn('Could not delete image from storage', e);
    }
  };

  const saveCar = async (statusOverride?: 'draft' | 'published') => {
    if (!formData.slug) return toast.error('Slug is required');
    setSaving(true);
    const status = statusOverride || formData.status;
    const isNew = !existingSlug;

    try {
      const data = {
        ...formData,
        status,
        updatedAt: serverTimestamp(),
        createdAt: isNew ? serverTimestamp() : formData.createdAt
      };
      await setDoc(doc(db, 'cars', formData.slug!), data);
      
      if (status === 'published') {
        await setDoc(doc(collection(db, 'deploy_triggers')), {
          triggeredAt: serverTimestamp(),
          triggeredBy: auth.currentUser?.email,
          status: 'queued',
          changedCollection: 'cars',
          changedDocId: formData.slug
        });
        toast.success('Car published and deploy triggered');
      } else {
        toast.success('Car saved as draft');
      }
      
      if (isNew) navigate(`/cars/${formData.slug}`);
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center font-mono animate-pulse">LOADING FLEET DATA...</div>;

  const currentTranslation = formData.translations?.[currentLang] || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md py-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cars')} className="hover:bg-white shadow-sm border border-transparent hover:border-slate-200 transition-all">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Fleet Management</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {existingSlug ? `Edit ${formData.make} ${formData.model}` : 'Add New Vehicle'}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">
              {existingSlug ? `Inventory ID: ${existingSlug}` : 'Adding to active fleet'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => saveCar('draft')} disabled={saving} className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm font-bold text-[11px] uppercase tracking-widest px-4 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
            Save Draft
          </Button>
          <Button onClick={() => saveCar('published')} disabled={saving} className="bg-blue-600 hover:bg-blue-700 shadow-md font-bold text-[11px] uppercase tracking-widest px-6 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Globe className="mr-2 h-3 w-3" />}
            Publish to Site
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Vehicle Content & SEO</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <LanguageSwitcher selected={currentLang} onSelect={setCurrentLang} />
              
              <div className="space-y-6 pt-2">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Public Display Name ({currentLang})</Label>
                  <Input 
                    value={currentTranslation.name || ''} 
                    onChange={(e) => handleTranslationChange('name', e.target.value)}
                    placeholder="e.g. Toyota Fortuner 2.4G Automatic"
                    className="text-lg font-bold bg-slate-50/50 border-slate-200 focus:bg-white transition-all h-12"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Short Summary ({currentLang})</Label>
                  <Textarea 
                    value={currentTranslation.description || ''}
                    onChange={(e) => handleTranslationChange('description', e.target.value)}
                    placeholder="Brief highlights for search results and list views..."
                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-sm leading-relaxed"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Full Vehicle Specifications ({currentLang})</Label>
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-50">
                    <RichTextEditor 
                      content={currentTranslation.longDescription || ''}
                      onChange={(val) => handleTranslationChange('longDescription', val)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Vehicle Gallery</h3>
              <Label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "cursor-pointer h-7 text-[10px] font-bold uppercase tracking-widest bg-white")}>
                <Plus className="mr-1.5 h-3 w-3" /> Add Assets
                <Input type="file" multiple className="hidden" onChange={handleImageUpload} accept="image/*" />
              </Label>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images?.map((url, i) => (
                  <div key={i} className="relative aspect-[4/3] group rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                    <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                    {i === 0 && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-bold uppercase tracking-widest rounded-sm shadow-sm">
                        Hero
                      </div>
                    )}
                    <div className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/20" onClick={() => removeImage(url)}>
                        <Trash2 size={20} />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!formData.images || formData.images.length === 0) && (
                  <div className="col-span-full h-32 flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-100 rounded-xl">
                    <ImageIcon size={32} strokeWidth={1} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">No images uploaded</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-3 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Vehicle data</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Make</Label>
                    <Input className="text-xs font-semibold" value={formData.make} onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Model</Label>
                    <Input className="text-xs font-semibold" value={formData.model} onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Year</Label>
                    <Input className="text-xs font-semibold" type="number" value={formData.year} onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</Label>
                    <Select value={formData.category} onValueChange={(val: any) => setFormData(prev => ({ ...prev, category: val }))}>
                      <SelectTrigger className="bg-white border-slate-200 font-semibold text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['sedan', 'suv', 'pickup', 'hatchback', 'premium', 'economy'].map(c => (
                          <SelectItem key={c} value={c} className="capitalize text-xs font-medium">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">Fleet Status</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-tight">Available for rent</span>
                  </div>
                  <Switch checked={formData.available} onCheckedChange={(val) => setFormData(prev => ({ ...prev, available: val }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Technical Specs</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Seats</Label>
                  <Input className="text-xs font-semibold" type="number" value={formData.specs?.seats} onChange={(e) => setFormData(prev => ({ ...prev, specs: { ...prev.specs!, seats: parseInt(e.target.value) } }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transmission</Label>
                  <Select value={formData.specs?.transmission} onValueChange={(val: any) => setFormData(prev => ({ ...prev, specs: { ...prev.specs!, transmission: val } }))}>
                    <SelectTrigger className="bg-white border-slate-200 font-semibold text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic" className="text-xs font-medium">Automatic</SelectItem>
                      <SelectItem value="manual" className="text-xs font-medium">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vehicle Features</Label>
                <div className="flex flex-wrap gap-1.5">
                  {FEATURES.map(f => (
                    <Badge 
                      key={f} 
                      variant={formData.specs?.features?.includes(f) ? 'default' : 'outline'}
                      className={cn(
                        "cursor-pointer text-[9px] uppercase tracking-widest h-6 px-2 transition-all",
                        formData.specs?.features?.includes(f) 
                          ? "bg-blue-600 hover:bg-blue-700 border-transparent" 
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500"
                      )}
                      onClick={() => {
                        const feats = formData.specs?.features?.includes(f)
                          ? formData.specs.features.filter(ft => ft !== f)
                          : [...(formData.specs?.features || []), f];
                        setFormData(prev => ({ ...prev, specs: { ...prev.specs!, features: feats } }));
                      }}
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
