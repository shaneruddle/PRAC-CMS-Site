import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreVertical, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { BlogPost } from '@/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'blog_posts'), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, 'blog_posts'));
      const postsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[];
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (slug: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'blog_posts', slug));
      setPosts(posts.filter(p => p.slug !== slug));
      toast.success('Post deleted successfully');
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const filteredPosts = posts.filter(post => 
    (post.translations?.en?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Content</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Blog Posts</h1>
          </div>
          <p className="text-sm text-slate-500">Manage your marketing site's blog content and SEO articles.</p>
        </div>
        <Link to="/blog/new" className={cn(buttonVariants({ variant: 'default' }), "bg-blue-600 hover:bg-blue-700 shadow-sm")}>
          <Plus className="mr-2 h-4 w-4" /> New Article
        </Link>
      </div>

      <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search articles by title or slug..." 
            className="pl-9 bg-slate-50/50 border-none shadow-none focus-visible:ring-1 focus-visible:ring-blue-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4 px-6">Title & Path</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Category</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4">Last Updated</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider text-slate-400 py-4 px-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i} className="border-b border-slate-50 last:border-0">
                  <TableCell colSpan={5} className="p-6">
                    <div className="h-4 bg-slate-50 animate-pulse rounded w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <TableRow key={post.slug} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-xs tracking-tight">{post.translations?.en?.title || 'Untitled'}</span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5">/blog/{post.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight",
                      post.status === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", post.status === 'published' ? "bg-emerald-500" : "bg-slate-400")}></span>
                      {post.status}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded capitalize">{post.category}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-xs text-slate-500">
                      {post.updatedAt ? format(post.updatedAt?.toDate ? post.updatedAt.toDate() : new Date(post.updatedAt), 'MMM d, yyyy') : 'Recently'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => navigate(`/blog/${post.slug}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit Article"
                       >
                        <Edit size={16} />
                       </button>
                       <DropdownMenu>
                        <DropdownMenuTrigger className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                          <MoreVertical size={16} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => window.open(`https://pattayarentacar.com/blog/${post.slug}`, '_blank')}>
                            <ExternalLink className="mr-2 h-4 w-4" /> View Live
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleDelete(post.slug)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Search size={32} className="mb-2 opacity-20" />
                    <p className="text-sm">No blog articles found matching your criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
