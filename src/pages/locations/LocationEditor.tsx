import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
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
import { VehicleGuide, WebsiteCar, Translation } from '@/types';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FEATURES = [
  'Bluetooth', 'USB', 'Reverse Camera', 'Apple CarPlay', 'Android Auto',
  'Cruise Control', 'GPS', 'Child Seat Available', 'Parking Sensors', 'Sunroof'
];

export default function VehicleGuideEditor() {
  const { slug: existingSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!existingSlug);
  const [saving, setSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const [websiteCars, setWebsiteCars] = useState<WebsiteCar[]>([]);

  const [formData, setFormData] = useState<Partial<VehicleGuide>>({
    slug: '',
    status: 'draft',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    category: 'sedan',
    displayOrder: 0,
    heroImage: '',
    gallery: [],
    featuredCarIds: [],
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
    // Load website_cars for featured car picker (read-only)
    async function loadWebsiteCars() {
      try {
        const snap = await getDocs(query(collection(db, 'website_cars'), orderBy('name')));
        setWebsiteCars(snap.docs.map(d => ({ id: d.id, ...d.data() })) as WebsiteCar[]);
      } catch (e) {
        console.warn('Could not load website_cars', e);
      }
    }
    loadWebsiteCars();

    if (existingSlug) {
      async function fetchGuide() {
        try {
          const docSnap = await getDoc(doc(db, 'vehicle_guides', existingSlug!));
          if (docSnap.exists()) {
            setFormData(docSnap.data() as VehicleGuide);
          } else {
            navigate('/vehicle-guides');
          }
        } catch (error) {
          toast.error('Error loading vehicle guide');
        } finally {
          setLoading(false);
        }
      }
      fetchGuide();
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

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.slug) return;
    setSaving(true);
    try {
      const storageRef = ref(storage, `vehicle-guides/${formData.slug}/hero_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, heroImage: url }));
      toast.success('Hero image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !formData.slug) return;
    setSaving(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `vehicle-guides/${formData.slug}/gallery_${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      });
      const urls = await Promise.all(uploadPromises);
      setFormData(prev => ({ ...prev, gallery: [...(prev.gallery || []), ...urls] }));
      toast.success(`${urls.length} gallery images uploaded`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const removeGalleryImage = async (url: string) => {
    setFormData(prev => ({ ...prev, gallery: prev.gallery?.filter(img => img !== url) }));
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (e) {
      console.warn('Could not delete image from storage', e);
    }
  };

  const toggleFeaturedCar = (carId: string) => {
    setFormData(prev => {
      const ids = prev.featuredCarIds || [];
      const next = ids.includes(carId)
        ? ids.filter(id => id !== carId)
        : [...ids, carId];
      return { ...prev, featuredCarIds: next };
    });
  };

  const saveGuide = async (statusOverride?: 'draft' | 'published') => {
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
      await setDoc(doc(db, 'vehicle_guides', formData.slug!), data);

      if (status === 'published') {
        toast.success('Guide published and deploy triggered');
      } else {
        toast.success('Guide saved as draft');
      }

      if (isNew) navigate(`/vehicle-guides/${formData.slug}`);
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center font-mono animate-pulse">LOADING GUIDE DATA...</div>;

  const currentTranslation = formData.translations?.[currentLang] || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md py-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vehicle-guides')} className="hover:bg-white shadow-sm border border-transparent hover:border-slate-200 transition-all">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Vehicle Guides</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {existingSlug ? `Edit ${formData.make} ${formData.model}` : 'Add New Guide'}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">
              {existingSlug ? `Guide ID: ${existingSlug}` : 'Creating new vehicle guide'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => saveGuide('draft')} disabled={saving} className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm font-bold text-[11px] uppercase tracking-widest px-4 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
            Save Draft
          </Button>
          <Button onClick={() => saveGuide('published')} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold text-[11px] uppercase tracking-widest px-4 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Globe className="mr-2 h-3 w-3" />}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main content column */}
        <div className="lg:col-span-8 space-y-8">

          {/* Core Identity */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Guide Identity</span>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Slug (URL key)</Label>
                  <Input className="text-xs font-semibold font-mono" value={formData.slug} onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="e.g. toyota-fortuner" disabled={!!existingSlug} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Display Order</Label>
                  <Input className="text-xs font-semibold" type="number" value={formData.displayOrder} onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Translations */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Vehicle Content & SEO</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <LanguageSwitcher selected={currentLang} onSelect={setCurrentLang} />

              <div className="space-y-6 pt-2">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Page Title ({currentLang})</Label>
                  <Input
                    value={currentTranslation.title || ''}
                    onChange={(e) => handleTranslationChange('title', e.target.value)}
                    placeholder="e.g. Toyota Fortuner Rental Pattaya"
                    className="text-sm font-medium"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">H1 Heading ({currentLang})</Label>
                  <Input
                    value={currentTranslation.h1 || ''}
                    onChange={(e) => handleTranslationChange('h1', e.target.value)}
                    placeholder="e.g. Rent a Toyota Fortuner in Pattaya"
                    className="text-sm font-medium"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Intro Paragraph ({currentLang})</Label>
                  <Textarea
                    value={currentTranslation.intro || ''}
                    onChange={(e) => handleTranslationChange('intro', e.target.value)}
                    placeholder="Short intro paragraph (1-3 sentences)..."
                    className="text-sm min-h-[80px] resize-y"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Body Content ({currentLang})</Label>
                  <RichTextEditor
                    value={currentTranslation.body || ''}
                    onChange={(val) => handleTranslationChange('body', val)}
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alternative Rationale ({currentLang})</Label>
                  <Textarea
                    value={currentTranslation.alternativeRationale || ''}
                    onChange={(e) => handleTranslationChange('alternativeRationale', e.target.value)}
                    placeholder="Why someone might choose this guide's vehicle over the featured bookable cars..."
                    className="text-sm min-h-[80px] resize-y"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hero Image */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Hero Image</span>
            </div>
            <CardContent className="p-6 space-y-4">
              {formData.heroImage ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={formData.heroImage} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, heroImage: '' }))}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-video flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-300">
                  <ImageIcon size={40} strokeWidth={1} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">No hero image</span>
                </div>
              )}
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "cursor-pointer bg-white")}>
                <Plus className="mr-1.5 h-3 w-3" /> Upload Hero Image
                <input type="file" className="hidden" accept="image/*" onChange={handleHeroUpload} />
              </label>
            </CardContent>
          </Card>

          {/* Gallery */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Gallery Images</span>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {(formData.gallery || []).map((url, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeGalleryImage(url)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                {(!formData.gallery || formData.gallery.length === 0) && (
                  <div className="col-span-full h-24 flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-100 rounded-xl">
                    <ImageIcon size={24} strokeWidth={1} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">No gallery images</span>
                  </div>
                )}
              </div>
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "cursor-pointer bg-white")}>
                <Plus className="mr-1.5 h-3 w-3" /> Add Gallery Images
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleGalleryUpload} />
              </label>
            </CardContent>
          </Card>

          {/* Featured Bookable Cars (read-only picker from website_cars) */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Featured Bookable Cars</span>
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-[11px] text-slate-500">Select which bookable cars to feature in the "Book this instead" CTA on this guide page. These are read from the booking engine's catalog.</p>
              {websiteCars.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Loading bookable cars...</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {websiteCars.map(car => (
                    <label key={car.id} className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                      formData.featuredCarIds?.includes(car.id!)
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}>
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={formData.featuredCarIds?.includes(car.id!) || false}
                        onChange={() => toggleFeaturedCar(car.id!)}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-none">{car.name}</span>
                        <span className="text-[9px] uppercase tracking-wider opacity-60 mt-0.5">ID: {car.id}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {(formData.featuredCarIds?.length || 0) > 0 && (
                <p className="text-[10px] text-blue-600 font-bold">{formData.featuredCarIds!.length} car{formData.featuredCarIds!.length !== 1 ? 's' : ''} selected</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">

          {/* Vehicle Data */}
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
                        {['sedan', 'suv', 'pickup', 'hatchback', 'premium', 'economy'].map(cat => (
                          <SelectItem key={cat} value={cat} className="text-xs font-semibold capitalize">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specs */}
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
                      <SelectItem value="automatic" className="text-xs font-semibold">Automatic</SelectItem>
                      <SelectItem value="manual" className="text-xs font-semibold">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Luggage Capacity</Label>
                <Input className="text-xs font-semibold" value={formData.specs?.luggage} onChange={(e) => setFormData(prev => ({ ...prev, specs: { ...prev.specs!, luggage: e.target.value } }))} placeholder="e.g. 2 Large, 2 Small" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vehicle Features</Label>
                <div className="flex flex-wrap gap-1.5">
                  {FEATURES.map(f => (
                    <Badge
                      key={f}
                      variant={formData.specs?.features?.includes(f) ? 'default' : 'outline'}
                      className={cn(
                        "cursor-pointer text-[9px] uppercase tracking-widest h-6 px-2 transition-all",
                        formData.specs?.features?.includes(f)
                          ? "bg-blue-600 hover:bg-blue-700 border-blue-600"
                          : "hover:border-slate-400"
                      )}
                      onClick={() => {
                        const feats = formData.specs?.features?.includes(f)
                          ? formData.specs.features.filter(x => x !== f)
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

          {/* SEO Fields */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">SEO Settings</span>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Meta Title</Label>
                <Input className="text-xs" value={formData.seo?.metaTitle || ''} onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, metaTitle: e.target.value } }))} placeholder="60 chars max" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Meta Description</Label>
                <Textarea className="text-xs min-h-[60px] resize-none" value={formData.seo?.metaDescription || ''} onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, metaDescription: e.target.value } }))} placeholder="160 chars max" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">OG Image URL</Label>
                <Input className="text-xs font-mono" value={formData.seo?.ogImage || ''} onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, ogImage: e.target.value } }))} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Canonical URL</Label>
                <Input className="text-xs font-mono" value={formData.seo?.canonicalUrl || ''} onChange={(e) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, canonicalUrl: e.target.value } }))} placeholder="https://pattayarentacar.com/vehicles/..." />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">No Index</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-tight">Hide from search engines</span>
                </div>
                <Switch checked={formData.seo?.noIndex || false} onCheckedChange={(val) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, noIndex: val } }))} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
