'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { ResizableImage } from './extensions/resizable-image'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { ExportButton } from '@/components/export/export-button'
import { formatDistanceToNow } from 'date-fns'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Code, ImagePlus, Type, Highlighter,
  Plus, Trash2, GripVertical, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  BookOpen, Sparkles, Save, ArrowLeft, FileText, BookMarked, Library, Menu, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Chapter {
  id: string; title: string; content: string; orderIndex: number; wordCount: number
}

interface FrontMatter {
  id: string; type: string; content: string; orderIndex: number
}

interface BackMatterItem {
  id: string; type: string; content: string; orderIndex: number
}

interface GlossaryTerm {
  id: string; term: string; definition: string; orderIndex: number
}

interface BibliographyEntry {
  id: string; citationText: string; format: string; orderIndex: number
}

interface BookData {
  id: string; title: string; subtitle?: string; authorName?: string; bookType: string
  style: string; language: string; status: string; description?: string; wordCountTarget?: number | null
  bibliographyFormat: string; lastAutosavedAt?: string; updatedAt: string
  chapters: Chapter[]; frontMatter: FrontMatter[]; backMatter: BackMatterItem[]
  glossaryTerms: GlossaryTerm[]; bibliographyEntries: BibliographyEntry[]
}

function toRomanDate(date: Date) {
  const romanMap: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV', 16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX', 21: 'XXI', 22: 'XXII', 23: 'XXIII', 24: 'XXIV', 25: 'XXV', 26: 'XXVI', 27: 'XXVII', 28: 'XXVIII', 29: 'XXIX', 30: 'XXX', 31: 'XXXI' }
  const yearRoman = (year: number) => {
    let result = '';
    const romanNumerals = [ { value: 1000, numeral: 'M' }, { value: 900, numeral: 'CM' }, { value: 500, numeral: 'D' }, { value: 400, numeral: 'CD' }, { value: 100, numeral: 'C' }, { value: 90, numeral: 'XC' }, { value: 50, numeral: 'L' }, { value: 40, numeral: 'XL' }, { value: 10, numeral: 'X' }, { value: 9, numeral: 'IX' }, { value: 5, numeral: 'V' }, { value: 4, numeral: 'IV' }, { value: 1, numeral: 'I' } ];
    for (const numeral of romanNumerals) {
      while (year >= numeral.value) { result += numeral.numeral; year -= numeral.value; }
    }
    return result;
  }
  return `${romanMap[date.getDate()] || date.getDate()}.${romanMap[date.getMonth() + 1] || date.getMonth() + 1}.${yearRoman(date.getFullYear())}`
}

// ─── Sortable Chapter Item ──────────────────────────────────
function SortableChapter({ chapter, isSelected, onSelect, onDelete }: {
  chapter: Chapter; isSelected: boolean; onSelect: () => void; onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-all group ${isSelected ? 'bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#E2E8F0]' : 'text-[#94A3B8] hover:bg-[#1E293B]/50 border border-transparent'}`} onClick={onSelect}>
      <button className="touch-none text-[#475569] hover:text-[#94A3B8]" {...attributes} {...listeners}>
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{chapter.title}</p>
        <p className="text-xs text-[#475569]">{chapter.wordCount.toLocaleString()} words</p>
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete() }} className="opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 transition-opacity">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Main Editor Component ──────────────────────────────────
export function BookEditor({ bookId }: { bookId: string }) {
  const { data: session } = useSession()
  const { setView, setSelectedBookId } = useAppStore()
  const [book, setBook] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [selectedMatter, setSelectedMatter] = useState<{ type: 'front' | 'back'; kind: string; label: string } | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'chapters' | 'frontmatter' | 'backmatter'>('chapters')
  const [showTocPanel, setShowTocPanel] = useState(true)
  const [floatingMenu, setFloatingMenu] = useState({ visible: false, x: 0, y: 0 })
  const [generationProgress, setGenerationProgress] = useState<{ isOpen: boolean; currentStep: string; progress: number }>({ isOpen: false, currentStep: '', progress: 0 })
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const handleSelectChapter = async (id: string) => {
    await saveContent()
    setSelectedChapterId(id)
    setSelectedMatter(null)
  }

  const handleSelectMatter = async (m: { type: 'front' | 'back'; kind: string; label: string }) => {
    await saveContent()
    setSelectedMatter(m)
    setSelectedChapterId(null)
  }

  const userId = (session?.user as any)?.id || session?.user?.email

  // Fetch book
  const fetchBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}`)
      if (res.ok) {
        const data = await res.json()
        setBook(data)
        if (data.chapters.length > 0 && !selectedChapterId) {
          setSelectedChapterId(data.chapters[0].id)
        }
        if (data.lastAutosavedAt) setLastSaved(new Date(data.lastAutosavedAt))
      }
    } catch { toast.error('Failed to load book') }
    finally { setLoading(false) }
  }, [bookId])

  useEffect(() => { fetchBook() }, [fetchBook])

  const selectedChapter = book?.chapters.find(c => c.id === selectedChapterId)

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline, ResizableImage, Placeholder.configure({ placeholder: 'Start writing your first chapter here... or click on AI to auto write chapter at top right.' }),
      Highlight, TextStyle, Color,
    ],
    content: selectedChapter?.content || '<p></p>',
    onUpdate: ({ editor }) => {
      // Content will be saved on autosave
    },
    editorProps: { attributes: { class: 'prose prose-invert max-w-none focus:outline-none min-h-[60vh]' } },
  })

  // Floating AI toolbar - show when text is selected
  useEffect(() => {
    if (!editor) return
    const handleMouseUp = () => {
      setTimeout(() => {
        const { from, to } = editor.state.selection
        if (from !== to && !editor.state.selection.empty) {
          const dom = window.getSelection()?.getRangeAt(0)
          if (dom) {
            const rect = dom.getBoundingClientRect()
            setFloatingMenu({ visible: true, x: rect.left + rect.width / 2 - 160, y: rect.top - 44 })
          }
        } else {
          setFloatingMenu(prev => ({ ...prev, visible: false }))
        }
      }, 10)
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [editor])

  // Sync editor content when chapter changes
  useEffect(() => {
    if (editor && selectedChapter) {
      const currentContent = editor.getHTML()
      if (currentContent !== selectedChapter.content) {
        setTimeout(() => editor.commands.setContent(selectedChapter.content || '<p></p>'), 0)
      }
    } else if (editor && selectedMatter) {
      const matterList = selectedMatter.type === 'front' ? book?.frontMatter : book?.backMatter
      const matter = matterList?.find(m => m.type === selectedMatter.kind)
      const targetContent = matter?.content || '<p></p>'
      if (editor.getHTML() !== targetContent) {
        setTimeout(() => editor.commands.setContent(targetContent), 0)
      }
    }
  }, [selectedChapterId, selectedMatter, editor])

  // Autosave
  const saveContent = useCallback(async () => {
    if (!editor || !book || !userId) return
    setSaving(true)
    try {
      if (selectedChapter) {
        const content = editor.getHTML()
        const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
        await fetch(`/api/books/${bookId}/chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedChapter.id, bookId, title: selectedChapter.title, content, action: 'update' }),
        })
        setBook(prev => prev ? {
          ...prev,
          chapters: prev.chapters.map(c => c.id === selectedChapter.id ? { ...c, content, wordCount, updatedAt: new Date().toISOString() } : c),
          lastAutosavedAt: new Date().toISOString(),
        } : prev)
      } else if (selectedMatter) {
        const content = editor.getHTML()
        const res = await fetch(`/api/books/${bookId}/matter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, type: selectedMatter.kind, content, action: selectedMatter.type === 'front' ? 'upsert-front' : 'upsert-back' }),
        })
        if (res.ok) {
          const savedMatter = await res.json()
          setBook(prev => {
            if (!prev) return prev
            if (selectedMatter.type === 'front') {
              const exists = prev.frontMatter.find(m => m.type === selectedMatter.kind)
              const newFront = exists 
                ? prev.frontMatter.map(m => m.type === selectedMatter.kind ? savedMatter : m)
                : [...prev.frontMatter, savedMatter]
              return { ...prev, frontMatter: newFront, lastAutosavedAt: new Date().toISOString() }
            } else {
              const exists = prev.backMatter.find(m => m.type === selectedMatter.kind)
              const newBack = exists 
                ? prev.backMatter.map(m => m.type === selectedMatter.kind ? savedMatter : m)
                : [...prev.backMatter, savedMatter]
              return { ...prev, backMatter: newBack, lastAutosavedAt: new Date().toISOString() }
            }
          })
        }
      }
      setLastSaved(new Date())
    } catch { /* silent */ }
    finally { setSaving(false) }
  }, [editor, book, bookId, userId, selectedChapter, selectedMatter])

  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    autoSaveRef.current = setInterval(saveContent, 30000)
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
  }, [saveContent])

  // Manual save on Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveContent() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveContent])

  // Add chapter
  const addChapter = async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, title: `Chapter ${book?.chapters.length ? book.chapters.length + 1 : 1}`, action: 'create' }),
      })
      if (res.ok) {
        const newCh = await res.json()
        setBook(prev => prev ? { ...prev, chapters: [...prev.chapters, newCh] } : prev)
        setSelectedChapterId(newCh.id)
        setSelectedMatter(null)
        toast.success('Chapter added')
      }
    } catch { toast.error('Failed to add chapter') }
  }

  // Delete chapter
  const deleteChapter = async (chId: string) => {
    try {
      await fetch(`/api/books/${bookId}/chapters?id=${chId}`, { method: 'DELETE' })
      setBook(prev => {
        if (!prev) return prev
        const remaining = prev.chapters.filter(c => c.id !== chId)
        if (selectedChapterId === chId) setSelectedChapterId(remaining[0]?.id || null)
        return { ...prev, chapters: remaining }
      })
      toast.success('Chapter deleted')
    } catch { toast.error('Failed to delete chapter') }
  }

  // Rename chapter
  const renameChapter = async (chId: string, newTitle: string) => {
    try {
      const ch = book?.chapters.find(c => c.id === chId)
      if (!ch) return
      await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chId, bookId, title: newTitle, content: ch.content, action: 'update' }),
      })
      setBook(prev => prev ? { ...prev, chapters: prev.chapters.map(c => c.id === chId ? { ...c, title: newTitle } : c) } : prev)
    } catch { toast.error('Failed to rename') }
  }

  // Drag-and-drop reorder
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id || !book) return
    const oldIndex = book.chapters.findIndex(c => c.id === active.id)
    const newIndex = book.chapters.findIndex(c => c.id === over.id)
    const reordered = arrayMove(book.chapters, oldIndex, newIndex).map((c, i) => ({ ...c, orderIndex: i }))
    setBook(prev => prev ? { ...prev, chapters: reordered } : prev)
    await fetch(`/api/books/${bookId}/chapters`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, action: 'reorder', chapters: reordered.map(c => ({ id: c.id, orderIndex: c.orderIndex })) }),
    })
  }

  // AI actions
  const aiAction = async (action: string) => {
    if (!editor || !userId) return
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, ' ')
    if (!text.trim()) return

    setAiLoading(true)
    const prompts: Record<string, string> = {
      rewrite: `Rewrite the following text while preserving its meaning and style. Return only the rewritten text formatted as HTML. Do NOT use markdown (e.g. no ** or ##):\n\n${text}`,
      expand: `Expand the following text with more detail, description, and depth. Return only the expanded text formatted as HTML. Do NOT use markdown:\n\n${text}`,
      shorten: `Shorten the following text while keeping the key information. Return only the shortened text formatted as HTML. Do NOT use markdown:\n\n${text}`,
      improve: `Improve the grammar, clarity, and flow of the following text. Return only the improved text formatted as HTML. Do NOT use markdown:\n\n${text}`,
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt: prompts[action], task: 'edit' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      editor.chain().focus().deleteSelection().insertContent(data.content).run()
      toast.success(`Text ${action}d`)
    } catch (err: any) {
      toast.error(err.message || 'AI action failed')
    } finally { setAiLoading(false) }
  }

  const autoWriteFullBook = async () => {
    if (!book || !userId) return;
    setGenerationProgress({ isOpen: true, currentStep: 'Generating book outline...', progress: 5 });
    
    try {
      // Step 1: Generate Outline
      const outlinePrompt = `Generate a chapter-by-chapter outline for a comprehensive ${book.wordCountTarget || 50000} word book titled "${book.title}".
Style: ${book.style}, Genre: ${book.bookType}.
Description: ${book.description || 'No description provided.'}
Return ONLY a valid JSON array of objects, where each object has a "title" string and a "summary" string detailing what the chapter covers.
Example: [{"title": "Chapter 1: Introduction", "summary": "Sets the scene..."}]`;

      const outlineRes = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt: outlinePrompt, task: 'draft' }),
      });
      const outlineData = await outlineRes.json();
      if (outlineData.error) throw new Error(outlineData.error);
      
      let outline: { title: string, summary: string }[] = [];
      try {
        const cleanedStr = outlineData.content.replace(/```json/gi, '').replace(/```/g, '').trim();
        outline = JSON.parse(cleanedStr);
      } catch (e) {
        throw new Error("Failed to parse outline from AI.");
      }

      if (!Array.isArray(outline) || outline.length === 0) throw new Error("Invalid outline generated.");

      // Step 2: Front Matter
      setGenerationProgress({ isOpen: true, currentStep: 'Writing Front Matter (Title Page, Copyright, Dedication)...', progress: 15 });
      const currentDateRoman = toRomanDate(new Date());
      const frontMatterTypes = ['title_page', 'copyright_page', 'dedication'];
      for (const fm of frontMatterTypes) {
        let content = '';
        if (fm === 'title_page') {
          content = `<h1 style="text-align: center;">${book.title}</h1><h2 style="text-align: center;">${book.subtitle || ''}</h2><p style="text-align: center;"><br></p><p style="text-align: center;">By ${book.authorName || 'Author'}</p>`;
        } else if (fm === 'copyright_page') {
          content = `<p style="text-align: center;">Copyright &copy; ${new Date().getFullYear()} by ${book.authorName || 'Author'}. All rights reserved.</p><p style="text-align: center;">Published on: ${currentDateRoman}</p>`;
        } else if (fm === 'dedication') {
          const fmPrompt = `Write a short, heartfelt dedication for a book titled "${book.title}". Return only HTML (e.g. <p style="text-align: center;"><em>...</em></p>).`;
          const fmRes = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, prompt: fmPrompt, task: 'draft' }) });
          const fmData = await fmRes.json();
          content = fmData.error ? `<p style="text-align: center;"><em>Dedicated to...</em></p>` : fmData.content;
        }
        await fetch(`/api/books/${bookId}/matter`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, type: fm, content, action: 'upsert-front' }),
        });
      }

      // Step 3: Sequential Chapters
      let previousSummaries = "";
      for (let i = 0; i < outline.length; i++) {
        const chap = outline[i];
        setGenerationProgress({ isOpen: true, currentStep: `Writing ${chap.title}...`, progress: 20 + Math.floor((i / outline.length) * 70) });
        
        // Create chapter in DB
        const createRes = await fetch(`/api/books/${bookId}/chapters`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, title: chap.title, content: '<p>Loading...</p>', action: 'create' }),
        });
        const newChap = await createRes.json();

        // Generate content
        const chapPrompt = `Write the full, comprehensive content for "${chap.title}" of the book "${book.title}".
Chapter Summary: ${chap.summary}
Previous Context (to ensure flow): ${previousSummaries || 'This is the first chapter.'}
Write as much detail as possible to reach the target word count. Use HTML format strictly (<h2>, <p>, etc.). NO MARKDOWN.`;
        
        const contentRes = await fetch('/api/ai', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, prompt: chapPrompt, task: 'draft' }),
        });
        const contentData = await contentRes.json();
        const finalContent = contentData.error ? `<p>Failed to generate content.</p>` : contentData.content;
        
        // Update chapter
        await fetch(`/api/books/${bookId}/chapters`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newChap.id, bookId, title: chap.title, content: finalContent, action: 'update' }),
        });

        previousSummaries += `\n- ${chap.title}: ${chap.summary}`;
        // Keep context short enough
        if (previousSummaries.length > 2000) previousSummaries = previousSummaries.substring(previousSummaries.length - 2000);
      }

      setGenerationProgress({ isOpen: true, currentStep: 'Finalizing formatting and Table of Contents...', progress: 95 });
      await fetchBook(); // Refresh everything
      setGenerationProgress({ isOpen: false, currentStep: '', progress: 100 });
      toast.success('Full book generated successfully!');

    } catch (err: any) {
      setGenerationProgress({ isOpen: false, currentStep: '', progress: 0 });
      toast.error(err.message || 'Auto-write full book failed');
    }
  }

  const autoWriteChapter = async () => {
    if (!editor || (!selectedChapter && !selectedMatter) || !book || !userId) return
    setAiLoading(true)
    let prompt = ''
    if (selectedMatter) {
      prompt = `Write the content for the ${selectedMatter.label} section of the book "${book.title}".
Description: ${book.description || 'No description provided.'}
Format the output strictly as HTML. Do NOT use markdown.`
    } else if (selectedChapter) {
      prompt = `Write a comprehensive chapter titled "${selectedChapter.title}" for a ${book.style} ${book.bookType} book titled "${book.title}".
Book Description: ${book.description || 'No description provided.'}
Write as much as possible in one output.
Format the output strictly as HTML (using <p>, <h2>, <strong>, <em>, etc). Do NOT use markdown formatting.`
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt, task: 'draft' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      editor.commands.setContent(data.content)
      toast.success(selectedMatter ? 'Section generated' : 'Chapter generated')
      setTimeout(() => saveContent(), 100)
    } catch (err: any) {
      toast.error(err.message || 'Auto-write failed')
    } finally { setAiLoading(false) }
  }

  // TOC extraction from chapter content
  const extractHeadings = (content: string): { level: number; text: string; chapterId: string; chapterTitle: string }[] => {
    if (!book) return []
    const headings: { level: number; text: string; chapterId: string; chapterTitle: string }[] = []
    for (const ch of book.chapters) {
      const regex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi
      let match
      while ((match = regex.exec(ch.content)) !== null) {
        const text = match[2].replace(/<[^>]*>/g, '').trim()
        // Skip heading if it is essentially just the chapter title again
        const textLower = text.toLowerCase()
        const titleLower = ch.title.trim().toLowerCase()
        if (textLower === titleLower || textLower.includes(titleLower) || titleLower.includes(textLower)) {
          if (textLower.startsWith('chapter')) continue; // definitely a duplicate chapter heading
        }
        
        headings.push({ level: parseInt(match[1]), text, chapterId: ch.id, chapterTitle: ch.title })
      }
    }
    return headings
  }

  const headings = book ? extractHeadings(book.chapters.map(c => c.content).join('\n')) : []

  // Insert image
  const insertImage = () => {
    const url = prompt('Enter image URL:')
    if (url && editor) editor.chain().focus().setImage({ src: url }).run()
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0B0F19' }}>
        <div className="text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-4 bg-[#1E293B]" />
          <Skeleton className="h-4 w-32 mx-auto bg-[#1E293B]" />
        </div>
      </div>
    )
  }

  if (!book) return <div className="h-screen flex items-center justify-center text-[#94A3B8]">Book not found</div>

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0B0F19' }}>
      {/* Editor Header */}
      <div className="h-12 border-b border-[#1E293B] flex items-center px-3 gap-2 shrink-0 bg-[#0B0F19]">
        {/* Mobile sidebar toggle */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-[#94A3B8] hover:text-[#E2E8F0]">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-[#0D1117] border-[#1E293B] p-0">
            <SheetTitle className="sr-only">Chapters</SheetTitle>
            <SidebarContent
              book={book} selectedChapterId={selectedChapterId} selectedMatter={selectedMatter}
              sidebarTab={sidebarTab} setSidebarTab={setSidebarTab}
              onSelectChapter={(id) => { handleSelectChapter(id); setSidebarOpen(false) }}
              onSelectMatter={(m) => { handleSelectMatter(m); setSidebarOpen(false) }}
              onAddChapter={addChapter} onDeleteChapter={deleteChapter} onRenameChapter={renameChapter}
              onReorder={handleDragEnd} sensors={sensors}
            />
          </SheetContent>
        </Sheet>

        <Button variant="ghost" onClick={() => { setView('dashboard'); setSelectedBookId(null) }} className="text-[#94A3B8] hover:text-[#E2E8F0]">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Library</span>
        </Button>

        <Separator orientation="vertical" className="h-6 bg-[#1E293B]" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#E2E8F0] truncate">{book.title}</p>
          <p className="text-xs text-[#475569] truncate">{selectedChapter?.title || selectedMatter?.label || 'Select a chapter'}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#475569]">
          {saving && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
          {!saving && lastSaved && <><Save className="w-3 h-3" /> {formatDistanceToNow(lastSaved, { addSuffix: true })}</>}
        </div>

        {/* Mobile TOC toggle */}
        <Button variant="ghost" size="icon" onClick={() => setTocOpen(!tocOpen)} className="md:hidden text-[#94A3B8] hover:text-[#E2E8F0]">
          <BookMarked className="w-4 h-4" />
        </Button>

        {/* Upgrade & Export */}
        <a href="/pricing" className="text-xs font-semibold px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors ml-auto hidden sm:block">
          Upgrade Plan
        </a>
        <div className="sm:ml-2">
          {book && <ExportButton bookId={book.id} bookTitle={book.title} />}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-60 border-r border-[#1E293B] bg-[#0D1117] flex-col shrink-0">
          <SidebarContent
            book={book} selectedChapterId={selectedChapterId} selectedMatter={selectedMatter}
            sidebarTab={sidebarTab} setSidebarTab={setSidebarTab}
            onSelectChapter={handleSelectChapter}
            onSelectMatter={handleSelectMatter}
            onAddChapter={addChapter} onDeleteChapter={deleteChapter} onRenameChapter={renameChapter}
            onReorder={handleDragEnd} sensors={sensors}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          {editor && (selectedChapter || selectedMatter) && (
            <div className="border-b border-[#1E293B] px-3 py-1.5 flex items-center gap-0.5 flex-wrap shrink-0 bg-[#0B0F19]">
              <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough className="w-4 h-4" /></ToolbarButton>
              <div className="w-px h-5 bg-[#1E293B] mx-1" />
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><Heading1 className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 className="w-4 h-4" /></ToolbarButton>
              <div className="w-px h-5 bg-[#1E293B] mx-1" />
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}><AlignLeft className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}><AlignCenter className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}><AlignRight className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })}><AlignJustify className="w-4 h-4" /></ToolbarButton>
              <div className="w-px h-5 bg-[#1E293B] mx-1" />
              <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}><Code className="w-4 h-4" /></ToolbarButton>
              <div className="w-px h-5 bg-[#1E293B] mx-1" />
              <ToolbarButton onClick={insertImage}><ImagePlus className="w-4 h-4" /></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')}><Highlighter className="w-4 h-4" /></ToolbarButton>
              <div className="w-px h-5 bg-[#1E293B] mx-1" />
              {(selectedMatter?.kind === 'cover_page' || selectedMatter?.kind === 'back_cover') ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={async () => {
                    if (!editor || !book) return
                    const userInstruction = window.prompt("What should the cover look like? (Optional, leave blank for default)")
                    if (userInstruction === null) return // User cancelled
                    setAiLoading(true)
                    try {
                      const isBack = selectedMatter.kind === 'back_cover'
                      let prompt = `A professional book cover design for a ${book.bookType} book titled "${book.title}". The text "${book.title}" must be clearly written on the cover.`
                      if (userInstruction.trim()) {
                        prompt += ` User request: ${userInstruction.trim()}`
                      } else {
                        prompt += ` ${book.description ? `Theme: ${book.description.substring(0, 100)}` : ''} ${isBack ? 'This is the back cover design.' : 'High quality, stunning artwork.'}`
                      }
                      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1200&nologo=true`
                      const imgHtml = `<p style="text-align: center"><img src="${imageUrl}" alt="${book.title} Cover" /></p>`
                      const contentText = isBack ? `<h2>Back Cover</h2>${imgHtml}` : `<h1>${book.title}</h1><h2 style="color: #666">${book.subtitle || ''}</h2><p><strong>By ${book.authorName || 'Author'}</strong></p>${imgHtml}`
                      editor.commands.setContent(contentText)
                      toast.success('Cover generated!')
                    } catch { toast.error('Failed to generate cover') }
                    finally { setAiLoading(false) }
                  }} 
                  disabled={aiLoading}
                  className="h-8 text-xs font-medium bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 ml-auto"
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 mr-1.5" />}
                  Generate AI Cover Image
                </Button>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={autoWriteChapter} 
                    disabled={aiLoading || generationProgress.isOpen}
                    className="h-8 text-xs font-medium bg-[#3B82F6]/10 text-[#3B82F6] hover:bg-[#3B82F6]/20 border border-[#3B82F6]/30 ml-auto mr-1"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    {selectedMatter ? 'Auto-Write Section' : 'Auto-Write Chapter'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={autoWriteFullBook} 
                    disabled={aiLoading || generationProgress.isOpen}
                    className="h-8 text-xs font-medium bg-[#8B5CF6]/10 text-[#8B5CF6] hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/30"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Auto-Write Full Book
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Floating AI Toolbar */}
          {editor && floatingMenu.visible && (
            <div className="floating-toolbar" style={{ top: `${floatingMenu.y}px`, left: `${floatingMenu.x}px`, position: 'fixed' }}>
              {['rewrite', 'expand', 'shorten', 'improve'].map(action => (
                <button key={action} onClick={() => aiAction(action)} disabled={aiLoading} className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Editor Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {(selectedChapter || selectedMatter) ? (
              <div className="tiptap-editor max-w-3xl mx-auto py-8 px-4 sm:px-8">
                <EditorContent editor={editor} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <BookOpen className="w-16 h-16 text-[#1E293B] mb-4" />
                <h2 className="text-xl font-semibold text-[#94A3B8] mb-2">Select a Chapter</h2>
                <p className="text-sm text-[#475569] max-w-sm">Choose a chapter from the sidebar to start editing, or create a new one.</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop TOC Panel */}
        <div className={`hidden md:flex flex-col border-l border-[#1E293B] bg-[#0D1117] shrink-0 transition-all duration-300 ${showTocPanel ? 'w-72' : 'w-0 overflow-hidden'}`}>
          <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#E2E8F0]">Table of Contents</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowTocPanel(false)} className="h-6 w-6 text-[#475569]">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {book.chapters.map(ch => (
                <button key={ch.id} onClick={() => handleSelectChapter(ch.id)} className="w-full text-left">
                  <p className={`text-sm font-medium truncate ${ch.id === selectedChapterId ? 'text-[#3B82F6]' : 'text-[#94A3B8]'}`}>{ch.title}</p>
                </button>
              ))}
              {headings.length > 0 && <Separator className="my-2 bg-[#1E293B]" />}
              {headings.map((h, i) => (
                <button key={i} onClick={() => handleSelectChapter(h.chapterId)} className="w-full text-left" style={{ paddingLeft: `${(h.level - 1) * 12 + 4}px` }}>
                  <p className="text-xs text-[#475569] truncate hover:text-[#94A3B8] transition-colors">{h.text}</p>
                </button>
              ))}
            </div>
            
            {/* Bibliography Section */}
            <div className="border-t border-[#1E293B] mt-2">
              <BibliographyPanel book={book} bookId={bookId} onUpdate={fetchBook} />
            </div>

            {/* Glossary Section */}
            <div className="border-t border-[#1E293B]">
              <GlossaryPanel book={book} bookId={bookId} onUpdate={fetchBook} />
            </div>
          </ScrollArea>
        </div>

        {/* Collapsed TOC toggle */}
        {!showTocPanel && (
          <button onClick={() => setShowTocPanel(true)} className="hidden md:flex items-center justify-center w-6 border-l border-[#1E293B] bg-[#0D1117] text-[#475569] hover:text-[#94A3B8] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <Dialog open={generationProgress.isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-[#0D1117] border-[#1E293B] text-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle>Generating Full Book</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Please wait while the AI writes your book. This may take a few minutes. Do not close this window.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
            <p className="text-sm font-medium text-[#E2E8F0] text-center">{generationProgress.currentStep}</p>
            <Progress value={generationProgress.progress} className="w-full h-2 bg-[#1E293B]" />
            <p className="text-xs text-[#475569]">{generationProgress.progress}%</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Toolbar Button ─────────────────────────────────────────
function ToolbarButton({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`p-1.5 rounded transition-colors ${active ? 'bg-[#3B82F6]/20 text-[#3B82F6]' : 'text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#1E293B]'}`}>
      {children}
    </button>
  )
}

// ─── Sidebar Content ────────────────────────────────────────
function SidebarContent({ book, selectedChapterId, selectedMatter, sidebarTab, setSidebarTab,
  onSelectChapter, onSelectMatter, onAddChapter, onDeleteChapter, onRenameChapter, onReorder, sensors
}: {
  book: BookData; selectedChapterId: string | null; selectedMatter: { type: 'front' | 'back'; kind: string; label: string } | null
  sidebarTab: string; setSidebarTab: (t: 'chapters' | 'frontmatter' | 'backmatter') => void
  onSelectChapter: (id: string) => void; onSelectMatter: (m: { type: 'front' | 'back'; kind: string; label: string }) => void
  onAddChapter: () => void; onDeleteChapter: (id: string) => void; onRenameChapter: (id: string, title: string) => void
  onReorder: (event: any) => void; sensors: any
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const startRename = (ch: Chapter) => { setEditingId(ch.id); setEditTitle(ch.title) }
  const finishRename = () => {
    if (editingId && editTitle.trim()) onRenameChapter(editingId, editTitle.trim())
    setEditingId(null)
  }

  return (
    <>
      {/* Book title */}
      <div className="p-3 border-b border-[#1E293B]">
        <h2 className="text-sm font-bold text-[#E2E8F0] truncate">{book.title}</h2>
        {book.subtitle && <p className="text-xs text-[#475569] truncate">{book.subtitle}</p>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1E293B]">
        {(['chapters', 'frontmatter', 'backmatter'] as const).map(tab => (
          <button key={tab} onClick={() => setSidebarTab(tab)} className={`flex-1 py-2 text-xs font-medium transition-colors ${sidebarTab === tab ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]' : 'text-[#475569] hover:text-[#94A3B8]'}`}>
            {tab === 'chapters' ? 'Chapters' : tab === 'frontmatter' ? 'Front' : 'Back'}
          </button>
        ))}
      </div>

      {/* Chapters Tab */}
      {sidebarTab === 'chapters' && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorder}>
              <SortableContext items={book.chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {book.chapters.map(ch => editingId === ch.id ? (
                  <div key={ch.id} className="px-3 py-1.5">
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={finishRename} onKeyDown={e => e.key === 'Enter' && finishRename()} className="h-7 text-xs bg-[#1E293B] border-[#1E293B] text-[#E2E8F0]" autoFocus />
                  </div>
                ) : (
                  <SortableChapter key={ch.id} chapter={ch} isSelected={ch.id === selectedChapterId} onSelect={() => onSelectChapter(ch.id)} onDelete={() => onDeleteChapter(ch.id)} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div className="p-2 border-t border-[#1E293B] space-y-1">
            <Button onClick={onAddChapter} variant="ghost" size="sm" className="w-full text-[#3B82F6] hover:bg-[#3B82F6]/10 justify-start">
              <Plus className="w-4 h-4 mr-2" /> Add Chapter
            </Button>
            <Button onClick={() => book.chapters.forEach(ch => { if (ch.id === selectedChapterId) startRename(ch) })} variant="ghost" size="sm" className="w-full text-[#94A3B8] hover:bg-[#1E293B] justify-start">
              <Type className="w-4 h-4 mr-2" /> Rename Chapter
            </Button>
          </div>
        </div>
      )}

      {/* Front Matter Tab */}
      {sidebarTab === 'frontmatter' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(['cover_page', 'title_page', 'dedication', 'acknowledgements', 'preface'] as const).map(type => {
            const label = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            const isSelected = selectedMatter?.type === 'front' && selectedMatter?.kind === type
            return (
              <button key={type} onClick={() => onSelectMatter({ type: 'front', kind: type, label })} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected ? 'bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#E2E8F0]' : 'text-[#94A3B8] hover:bg-[#1E293B]/50 border border-transparent'}`}>
                <FileText className="w-4 h-4 inline mr-2" />{label}
              </button>
            )
          })}
        </div>
      )}

      {/* Back Matter Tab */}
      {sidebarTab === 'backmatter' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(['afterword', 'about_author', 'back_cover'] as const).map(type => {
            const label = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            const isSelected = selectedMatter?.type === 'back' && selectedMatter?.kind === type
            return (
              <button key={type} onClick={() => onSelectMatter({ type: 'back', kind: type, label })} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected ? 'bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#E2E8F0]' : 'text-[#94A3B8] hover:bg-[#1E293B]/50 border border-transparent'}`}>
                <FileText className="w-4 h-4 inline mr-2" />{label}
              </button>
            )
          })}
        </div>
      )}

      {/* Stats */}
      <div className="p-3 border-t border-[#1E293B]">
        <div className="text-xs text-[#475569] space-y-1">
          <p>{book.chapters.length} chapters</p>
          <p>{book.chapters.reduce((s, c) => s + c.wordCount, 0).toLocaleString()} total words</p>
        </div>
      </div>
    </>
  )
}

// ─── Bibliography Panel ─────────────────────────────────────
function BibliographyPanel({ book, bookId, onUpdate }: { book: BookData; bookId: string; onUpdate: () => void }) {
  const [newEntry, setNewEntry] = useState('')

  const addEntry = async () => {
    if (!newEntry.trim()) return
    try {
      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: book.bibliographyFormat || 'apa', content: newEntry, action: 'add-bibliography' }),
      })
      setNewEntry('')
      onUpdate()
    } catch { toast.error('Failed to add entry') }
  }

  const deleteEntry = async (id: string) => {
    try {
      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: id, action: 'delete-bibliography' }),
      })
      onUpdate()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-[#94A3B8]">Bibliography</h4>
        <Badge variant="outline" className="text-[10px] border-[#1E293B] text-[#475569]">{book.bibliographyEntries.length}</Badge>
      </div>
      <div className="space-y-1.5 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
        {book.bibliographyEntries.map(e => (
          <div key={e.id} className="flex items-start gap-1.5 group">
            <p className="flex-1 text-[10px] text-[#475569] line-clamp-2">{e.citationText}</p>
            <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 shrink-0"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Input value={newEntry} onChange={e => setNewEntry(e.target.value)} placeholder="Add citation..." className="h-7 text-xs bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569]" />
        <Button onClick={addEntry} size="sm" className="h-7 px-2 gradient-btn text-white shrink-0"><Plus className="w-3 h-3" /></Button>
      </div>
    </div>
  )
}

// ─── Glossary Panel ─────────────────────────────────────────
function GlossaryPanel({ book, bookId, onUpdate }: { book: BookData; bookId: string; onUpdate: () => void }) {
  const [newTerm, setNewTerm] = useState('')
  const [newDef, setNewDef] = useState('')

  const addTerm = async () => {
    if (!newTerm.trim() || !newDef.trim()) return
    try {
      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: 'glossary', content: newDef, term: newTerm, action: 'add-glossary' }),
      })
      setNewTerm(''); setNewDef('')
      onUpdate()
    } catch { toast.error('Failed to add term') }
  }

  const deleteTerm = async (id: string) => {
    try {
      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: id, action: 'delete-glossary' }),
      })
      onUpdate()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-[#94A3B8]">Glossary</h4>
        <Badge variant="outline" className="text-[10px] border-[#1E293B] text-[#475569]">{book.glossaryTerms.length}</Badge>
      </div>
      <div className="space-y-1 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
        {book.glossaryTerms.map(t => (
          <div key={t.id} className="flex items-start gap-1.5 group">
            <div className="flex-1">
              <span className="text-[10px] font-medium text-[#94A3B8]">{t.term}: </span>
              <span className="text-[10px] text-[#475569]">{t.definition}</span>
            </div>
            <button onClick={() => deleteTerm(t.id)} className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 shrink-0"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Input value={newTerm} onChange={e => setNewTerm(e.target.value)} placeholder="Term" className="h-7 text-xs bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569] w-20" />
        <Input value={newDef} onChange={e => setNewDef(e.target.value)} placeholder="Definition" className="h-7 text-xs bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569]" />
        <Button onClick={addTerm} size="sm" className="h-7 px-2 gradient-btn text-white shrink-0"><Plus className="w-3 h-3" /></Button>
      </div>
    </div>
  )
}