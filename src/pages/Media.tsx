import React, { useEffect, useState } from 'react';
import { ref, listAll, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, Copy, ExternalLink, Loader2, Upload, Search, Filter, Image as ImageIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export default function Media() {
  const [images, setImages] = useState<{ name: string, url: string, folder: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchImages = async (folder: string) => {
    setLoading(true);
    try {
      const listRef = ref(storage, folder);
      const res = await listAll(listRef);
      const items = await Promise.all(res.items.map(async (item) => ({
        name: item.name,
        url: await getDownloadURL(item),
        folder
      })));
      setImages(items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages(currentFolder);
  }, [currentFolder]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `${currentFolder}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      toast.success('Uploaded successfully');
      fetchImages(currentFolder);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (img: any) => {
    if (!window.confirm('Delete this image permanently?')) return;
    try {
      await deleteObject(ref(storage, `${img.folder}/${img.name}`));
      setImages(images.filter(i => i.name !== img.name));
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const filteredImages = images.filter(img => img.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Assets</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Media Library</h1>
          </div>
          <p className="text-sm text-slate-500">Central cloud storage for marketing assets and vehicle photography.</p>
        </div>
        <Label className="cursor-pointer">
          <div className={cn(buttonVariants({ variant: 'default' }), "bg-slate-900 hover:bg-slate-800 shadow-md h-10 px-6 font-bold text-[11px] uppercase tracking-widest")}>
            {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
            Upload Assets
          </div>
          <Input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
        </Label>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <Tabs value={currentFolder} onValueChange={setCurrentFolder} className="w-full lg:w-auto">
          <TabsList className="bg-slate-100/50 p-1 rounded-lg">
            {['general', 'blog', 'cars', 'locations'].map(folder => (
              <TabsTrigger 
                key={folder} 
                value={folder}
                className="text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 capitalize transition-all"
              >
                {folder}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by file name..." 
            className="pl-9 bg-slate-50/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-blue-500/20 text-xs py-2 h-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
            <div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-xl border border-slate-200/50" />
          ))}
        </div>
      ) : filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredImages.map((img, i) => (
            <div key={i} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
              <img src={img.url} alt={img.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                <div className="flex gap-2">
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white text-white hover:text-slate-900 border-none backdrop-blur-md" onClick={() => copyToClipboard(img.url)} title="Copy URL">
                    <Copy size={14} />
                  </Button>
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white text-white hover:text-slate-900 border-none backdrop-blur-md" onClick={() => window.open(img.url, '_blank')} title="Open Large">
                    <ExternalLink size={14} />
                  </Button>
                </div>
                <Button variant="destructive" size="sm" className="h-7 px-3 bg-red-600/90 hover:bg-red-600 text-[9px] font-bold uppercase tracking-widest rounded-full" onClick={() => deleteImage(img)}>
                  <Trash2 size={12} className="mr-1.5" /> Delete
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/90 backdrop-blur-md border-t border-slate-100 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-[9px] font-bold text-slate-700 truncate tracking-tight">{img.name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-72 flex flex-col items-center justify-center text-slate-300 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
            <ImageIcon className="h-8 w-8 opacity-40" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Inventory is empty</p>
          <p className="text-xs text-slate-400 mt-1">Upload files to this directory to see them here.</p>
        </div>
      )}
    </div>
  );
}
