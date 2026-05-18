import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Quote, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: placeholder || 'Start writing...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const toggleLink = () => {
    const url = window.prompt('Enter URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="border rounded-md overflow-hidden bg-white">
      <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border-b">
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} 
          className={cn(editor.isActive('bold') && 'bg-slate-200')}>
          <Bold size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} 
          className={cn(editor.isActive('italic') && 'bg-slate-200')}>
          <Italic size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} 
          className={cn(editor.isActive('underline') && 'bg-slate-200')}>
          <UnderlineIcon size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} 
          className={cn(editor.isActive('strike') && 'bg-slate-200')}>
          <Strikethrough size={16} />
        </Button>
        <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          className={cn(editor.isActive('heading', { level: 2 }) && 'bg-slate-200')}>
          <Heading2 size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
          className={cn(editor.isActive('heading', { level: 3 }) && 'bg-slate-200')}>
          <Heading3 size={16} />
        </Button>
        <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} 
          className={cn(editor.isActive('bulletList') && 'bg-slate-200')}>
          <List size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          className={cn(editor.isActive('orderedList') && 'bg-slate-200')}>
          <ListOrdered size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} 
          className={cn(editor.isActive('blockquote') && 'bg-slate-200')}>
          <Quote size={16} />
        </Button>
        <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />
        <Button variant="ghost" size="sm" onClick={toggleLink} className={cn(editor.isActive('link') && 'bg-slate-200')}>
          <LinkIcon size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={addImage}>
          <ImageIcon size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon size={16} />
        </Button>
        <div className="w-[1px] h-6 bg-slate-300 mx-1 self-center" />
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={16} />
        </Button>
      </div>
      <EditorContent editor={editor} className="p-4 min-h-[300px] prose prose-slate max-w-none focus:outline-none" />
    </div>
  );
}
