import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, setDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Globe, ArrowLeft, Image as ImageIcon, Eye, Trash2, Loader2, Plus } from 'lucide-react';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { LanguageSwitcher, LANGUAGES } from '@/components/editor/LanguageSwitcher';
import { BlogPost, Translation } from '@/types';
import { cn } from '@/lib/utils';

export default function BlogEditor() {
  const { slug: existingSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!existingSlug);
  const [saving, setSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    slug: '',
    status: 'draft',
    category: 'Guides',
    author: '',
    featuredImage: '',
    translations: LANGUAGES.reduce((acc, lang) => ({ ...acc, [lang.code]: {} }), {}),
    seo: { noIndex: false }
  });

  useEffect(() => {
    if (existingSlug) {
      async function fetchPost() {
        try {
            const q = query(collection(db, 'blog_posts'), where('slug', '==', existingSlug));
                      const querySnap = await getDocs(q);
                      if (!querySnap.empty) {
                                      const docSnap = querySnap.docs[0];
                        const _d = docSnap.data() as any; const _t = _d.translations || {}; if (_d.title && !(_t.en && _t.en.title)) { _t.en = Object.assign({}, _t.en || {}, { title: _d.title, body: _d.content || '' }); }
                                      setFormData({ id: docSnap.id, ..._d, translations: _t } as BlogPost);
                      } else {
                                      toast.error('Post not found');
                                      navigate('/blog');
                      }
        } catch (error) {
          toast.error('Error fetching post');
        } finally {
          setLoading(false);
        }
      }
      fetchPost();
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

  const handleTitleChange = (val: string) => {
    handleTranslationChange('title', val);
    if (!existingSlug && currentLang === 'en') {
      const slug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.slug) return;
    
    try {
      setSaving(true);
      const storageRef = ref(storage, `blog/${formData.slug}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, featuredImage: url }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const savePost = async (statusOverride?: 'draft' | 'published') => {
    if (!formData.slug) return toast.error('Slug is required');
        if (!formData.translations?.en?.title && !(formData as any).title) return toast.error('English title is required');

    setSaving(true);
    const status = statusOverride || formData.status;
    const isNew = !existingSlug;

    try {
      const data = {
        ...formData,
        status,
        updatedAt: serverTimestamp(),
        createdAt: isNew ? serverTimestamp() : formData.createdAt,
        publishedAt: status === 'published' && !formData.publishedAt ? serverTimestamp() : formData.publishedAt || null
      };

      const docId = !isNew && (formData as any).id ? (formData as any).id : formData.slug!;
            await setDoc(doc(db, 'blog_posts', docId), data);
      
      if (status === 'published') {
        // Trigger deploy
        await setDoc(doc(collection(db, 'deploy_triggers')), {
          triggeredAt: serverTimestamp(),
          triggeredBy: auth.currentUser?.email,
          status: 'queued',
          changedCollection: 'blog_posts',
          changedDocId: formData.slug
        });
        toast.success('Published! Deploy triggered.');
      } else {
        toast.success('Draft saved');
      }

      if (isNew) navigate(`/blog/${formData.slug}`);
    } catch (error) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const completionStatus = LANGUAGES.reduce((acc, lang) => {
    const t = formData.translations?.[lang.code];
    acc[lang.code] = !!(t?.title && t?.body);
    return acc;
  }, {} as Record<string, boolean>);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const currentTranslation = formData.translations?.[currentLang] || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md py-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/blog')} className="hover:bg-white shadow-sm border border-transparent hover:border-slate-200 transition-all">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Editor</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {existingSlug ? 'Edit Blog Post' : 'Create New Post'}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">
              {existingSlug ? `Slug: ${existingSlug}` : 'Drafting new content'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => savePost('draft')} disabled={saving} className="bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm font-bold text-[11px] uppercase tracking-widest px-4 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
            Save Draft
          </Button>
          <Button onClick={() => savePost('published')} disabled={saving} className="bg-blue-600 hover:bg-blue-700 shadow-md font-bold text-[11px] uppercase tracking-widest px-6 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Globe className="mr-2 h-3 w-3" />}
            Publish Change
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Content Localization</span>
              <div className="flex items-center gap-1.5">
                {LANGUAGES.map(lang => (
                  <div key={lang.code} className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    completionStatus[lang.code] ? "bg-emerald-500" : "bg-slate-200"
                  )}></div>
                ))}
              </div>
            </div>
            <CardContent className="p-6 space-y-6">
              <LanguageSwitcher 
                selected={currentLang} 
                onSelect={setCurrentLang} 
                completion={completionStatus} 
              />
              
              <div className="space-y-6 pt-2">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Post Title ({currentLang})</Label>
                  <Input 
                    value={currentTranslation.title || ''} 
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter a compelling title..."
                    className="text-lg font-bold bg-slate-50/50 border-slate-200 focus:bg-white transition-all h-12"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Summary / Excerpt ({currentLang})</Label>
                  <Textarea 
                    value={currentTranslation.excerpt || ''}
                    onChange={(e) => handleTranslationChange('excerpt', e.target.value)}
                    placeholder="A brief summary for cards and search results..."
                    rows={3}
                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-sm leading-relaxed"
                  />
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Recommended: 150-200 chars</p>
                    <p className={cn("text-[10px] font-mono", (currentTranslation.excerpt?.length || 0) > 200 ? "text-red-500 font-bold" : "text-slate-400")}>
                      {currentTranslation.excerpt?.length || 0}/200
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Article Content ({currentLang})</Label>
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-50">
                    <RichTextEditor 
                      content={currentTranslation.body || ''}
                      onChange={(val) => handleTranslationChange('body', val)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Search Engine Optimization ({currentLang})</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">SEO Meta Description</Label>
                  <Textarea 
                    value={currentTranslation.metaDescription || ''}
                    onChange={(e) => handleTranslationChange('metaDescription', e.target.value)}
                    placeholder="This text appears in Google search results..."
                    className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-xs"
                  />
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Target: 150-160 chars</p>
                    <p className={cn("text-[10px] font-mono", (currentTranslation.metaDescription?.length || 0) > 160 ? "text-red-500 font-bold" : "text-slate-400")}>
                      {currentTranslation.metaDescription?.length || 0}/160
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-3 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Post metadata</span>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">URL Slug</Label>
                  <Input 
                    value={formData.slug} 
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    disabled={!!existingSlug}
                    className="font-mono text-xs bg-slate-50 border-slate-200 shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger className="bg-white border-slate-200 font-semibold text-xs py-5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Guides">Guides & Manuals</SelectItem>
                      <SelectItem value="Tips">Driving Tips</SelectItem>
                      <SelectItem value="Destinations">Pattaya Destinations</SelectItem>
                      <SelectItem value="News">Company News</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Author Name</Label>
                  <Input 
                    value={formData.author}
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    className="text-xs font-semibold"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Featured Image</Label>
                  <div className="relative group aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner group">
                    {formData.featuredImage ? (
                      <img src={formData.featuredImage} alt="Featured" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                        <ImageIcon size={32} strokeWidth={1.5} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">No Image Set</span>
                      </div>
                    )}
                    <Label className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer gap-2 backdrop-blur-[2px]">
                      <Plus className="text-white w-6 h-6" />
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">Update Cover</span>
                      <Input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                    </Label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">Search Permissions</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-tight">Allow indexing</span>
                  </div>
                  <Switch 
                    checked={!formData.seo?.noIndex} 
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, seo: { ...prev.seo, noIndex: !checked } }))} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {existingSlug && (
            <div className="bg-red-50/50 border border-red-100 rounded-xl p-6 transition-all hover:bg-red-50">
              <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Danger Zone</h3>
              <p className="text-[11px] text-red-400 font-medium mb-4 leading-relaxed uppercase tracking-tight">Once deleted, this post cannot be recovered. It will be immediately removed from the public marketing site.</p>
              <Button variant="destructive" size="sm" className="w-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white border-transparent shadow-none font-bold text-[11px] uppercase tracking-widest h-9">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Post Permanently
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
