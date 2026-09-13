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
  Plus, Trash2, GripVertical, ChevronLeft, ChevronRight,
  BookOpen, Sparkles, Save, ArrowLeft, FileText, BookMarked, Menu, Loader2,
  Upload, Sun, Moon, Check, Link as LinkIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const CITATION_STANDARDS = [
  { id: 'apa', name: 'APA 7th', desc: 'Social Sciences & Psychology' },
  { id: 'mla', name: 'MLA 9th', desc: 'Literature & Humanities' },
  { id: 'harvard', name: 'Harvard', desc: 'Economics & Business' },
  { id: 'chicago', name: 'Chicago', desc: 'History & Humanities' },
  { id: 'iso690', name: 'ISO 690', desc: 'Technical & Science' },
  { id: 'abnt', name: 'ABNT', desc: 'Brazilian Standard' },
]

// ─── Sortable Chapter Item ──────────────────────────────────
function SortableChapter({ chapter, isSelected, onSelect, onDelete }: {
  chapter: Chapter; isSelected: boolean; onSelect: () => void; onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-all group ${
        isSelected
          ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#F1F5F9]'
          : 'text-[#94A3B8] hover:bg-[#1E293B]/70 border border-transparent hover:text-[#E2E8F0]'
      }`}
      onClick={onSelect}
    >
      <button className="touch-none text-[#64748B] hover:text-[#94A3B8]" {...attributes} {...listeners} title="Drag to reorder chapter">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{chapter.title}</p>
        <p className="text-xs text-[#64748B]">{(chapter.wordCount || 0).toLocaleString()} words</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 text-red-400/80 hover:text-red-400 transition-opacity p-1"
        title="Delete Chapter"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Toolbar Button with Tooltip ────────────────────────────
function ToolbarButton({
  onClick,
  active,
  title,
  children
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-[#3B82F6]/25 text-[#3B82F6]'
          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]'
      }`}
    >
      {children}
    </button>
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
  const [workspaceTheme, setWorkspaceTheme] = useState<'paper' | 'dark'>('paper')
  const [fontFamily, setFontFamily] = useState<'georgia' | 'inter'>('georgia')
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [imageUploadPreview, setImageUploadPreview] = useState<string | null>(null)
  const [floatingMenu, setFloatingMenu] = useState({ visible: false, x: 0, y: 0 })
  const [generationProgress, setGenerationProgress] = useState<{ isOpen: boolean; currentStep: string; progress: number }>({
    isOpen: false, currentStep: '', progress: 0
  })

  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const coverUploadInputRef = useRef<HTMLInputElement>(null)
  const authorPhotoUploadInputRef = useRef<HTMLInputElement>(null)

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

  // Fetch book safely
  const fetchBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}`)
      if (res.ok) {
        const data = await res.json()
        setBook(data)
        if (data.chapters.length > 0 && !selectedChapterId && !selectedMatter) {
          setSelectedChapterId(data.chapters[0].id)
        }
        if (data.lastAutosavedAt) setLastSaved(new Date(data.lastAutosavedAt))
      }
    } catch {
      toast.error('Failed to load book')
    } finally {
      setLoading(false)
    }
  }, [bookId, selectedChapterId, selectedMatter])

  useEffect(() => {
    let isCurrent = true
    const init = async () => {
      try {
        const res = await fetch(`/api/books/${bookId}`)
        if (res.ok && isCurrent) {
          const data = await res.json()
          setBook(data)
          if (data.chapters.length > 0) setSelectedChapterId(data.chapters[0].id)
          if (data.lastAutosavedAt) setLastSaved(new Date(data.lastAutosavedAt))
        }
      } catch {
        if (isCurrent) toast.error('Failed to load book')
      } finally {
        if (isCurrent) setLoading(false)
      }
    }
    init()
    return () => { isCurrent = false }
  }, [bookId])

  const selectedChapter = book?.chapters.find(c => c.id === selectedChapterId)

  // TipTap Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      ResizableImage,
      Placeholder.configure({
        placeholder: 'Start writing your manuscript here... or click "Auto-Write Full Book" at the top to draft the entire book with AI.',
      }),
      Highlight,
      TextStyle,
      Color,
    ],
    content: selectedChapter?.content || '<p></p>',
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none min-h-[60vh] leading-relaxed ${
          workspaceTheme === 'paper' ? 'text-[#0F172A]' : 'prose-invert text-[#F1F5F9]'
        }`,
      },
    },
  })

  // Floating AI toolbar on selection
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

  // Sync editor content when chapter or matter selection changes
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

  // Chapter management
  const addChapter = async () => {
    try {
      const nextIndex = (book?.chapters.length || 0)
      const res = await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, title: `Chapter ${nextIndex + 1}`, content: '<p></p>', action: 'create' }),
      })
      if (res.ok) {
        const newCh = await res.json()
        setBook(prev => prev ? { ...prev, chapters: [...prev.chapters, newCh] } : prev)
        setSelectedChapterId(newCh.id)
        setSelectedMatter(null)
        toast.success(`Chapter ${nextIndex + 1} added`)
      }
    } catch { toast.error('Failed to add chapter') }
  }

  const deleteChapter = async (chId: string) => {
    if (book && book.chapters.length <= 1) {
      toast.error('Book must contain at least one chapter')
      return
    }
    try {
      await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chId, bookId, action: 'delete' }),
      })
      setBook(prev => {
        if (!prev) return prev
        const remaining = prev.chapters.filter(c => c.id !== chId)
        if (selectedChapterId === chId) setSelectedChapterId(remaining[0]?.id || null)
        return { ...prev, chapters: remaining }
      })
      toast.success('Chapter deleted')
    } catch { toast.error('Failed to delete chapter') }
  }

  const renameChapter = async (chId: string, newTitle: string) => {
    try {
      const ch = book?.chapters.find(c => c.id === chId)
      if (!ch) return
      await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chId, bookId, title: newTitle, content: ch.content, action: 'update' }),
      })
      setBook(prev => prev ? { ...prev, chapters: prev.chapters.map(c => c.id === chId ? { ...c, title: newTitle } : c) } : prev)
    } catch { toast.error('Failed to rename') }
  }

  // Drag and drop reordering
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id || !book) return
    const oldIndex = book.chapters.findIndex(c => c.id === active.id)
    const newIndex = book.chapters.findIndex(c => c.id === over.id)
    const reordered = arrayMove(book.chapters, oldIndex, newIndex).map((c, i) => ({ ...c, orderIndex: i }))
    setBook(prev => prev ? { ...prev, chapters: reordered } : prev)
    await fetch(`/api/books/${bookId}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, action: 'reorder', chapters: reordered.map(c => ({ id: c.id, orderIndex: c.orderIndex })) }),
    })
  }

  // AI selection actions (Rewrite, Expand, Shorten, Improve)
  const aiAction = async (action: string) => {
    if (!editor || !userId) return
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, ' ')
    if (!text.trim()) return

    setAiLoading(true)
    const prompts: Record<string, string> = {
      rewrite: `Rewrite the following text while preserving its core style and meaning. Return only clean HTML paragraphs (<p>). Do NOT use markdown:\n\n${text}`,
      expand: `Expand the following passage with immersive detail, vivid descriptions, dialogue, and atmospheric depth. Return only clean HTML (<p>, <h3>). Do NOT use markdown:\n\n${text}`,
      shorten: `Condense the following text while retaining essential narrative clarity. Return only clean HTML (<p>). Do NOT use markdown:\n\n${text}`,
      improve: `Refine and elevate the prose, fixing flow, grammar, and literary nuance. Return only clean HTML (<p>). Do NOT use markdown:\n\n${text}`,
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt: prompts[action], task: 'edit' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      editor.chain().focus().deleteSelection().insertContent(data.content).run()
      toast.success(`Text ${action}d successfully`)
    } catch (err: any) {
      toast.error(err.message || 'AI action failed')
    } finally {
      setAiLoading(false)
    }
  }

  // Auto-write single chapter
  const autoWriteChapter = async () => {
    if (!editor || (!selectedChapter && !selectedMatter) || !book || !userId) return
    setAiLoading(true)
    let prompt = ''
    if (selectedMatter) {
      prompt = `Write comprehensive content for the "${selectedMatter.label}" section of the book "${book.title}" by ${book.authorName || 'the author'}.
Description: ${book.description || 'General themes and concepts.'}
Format strictly as clean HTML (<p>, <h2>, <h3>, <em>). Do NOT use markdown.`
    } else if (selectedChapter) {
      prompt = `Write a full, immersive, complete chapter titled "${selectedChapter.title}" for the book "${book.title}".
Style: ${book.style}, Genre: ${book.bookType}, Language: ${book.language}.
Book Description: ${book.description || 'No description provided.'}
Write comprehensive narrative prose with rich dialogue, scene setting, character development, and evocative exposition.
Divide the chapter into sections using <h3> subheadings.
Target length: At least 2,500 words. Format strictly as clean HTML (<p>, <h3>, <strong>, <em>). NO MARKDOWN.`
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt, task: 'draft' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      editor.commands.setContent(data.content)
      toast.success(selectedMatter ? 'Section generated' : 'Chapter generated')
      setTimeout(() => saveContent(), 200)
    } catch (err: any) {
      toast.error(err.message || 'Auto-write failed')
    } finally {
      setAiLoading(false)
    }
  }

  // Auto-write Full Book (Meeting target word counts like 50k words)
  const autoWriteFullBook = async () => {
    if (!book || !userId) return
    const targetWords = book.wordCountTarget || 50000
    // Plan chapter count: e.g. for 50k, 16-20 chapters
    const numChapters = Math.max(12, Math.min(22, Math.ceil(targetWords / 2500)))
    const wordsPerChapter = Math.round(targetWords / numChapters)

    setGenerationProgress({
      isOpen: true,
      currentStep: `Architecting ${numChapters}-chapter outline for ${targetWords.toLocaleString()} words...`,
      progress: 5,
    })

    try {
      // Step 1: Outline Generation
      const outlinePrompt = `Generate a complete ${numChapters}-chapter book outline for a ${targetWords.toLocaleString()}-word ${book.style} ${book.bookType} book titled "${book.title}".
Book Description: ${book.description || 'No description provided.'}
Author: ${book.authorName || 'Author'}. Language: ${book.language}.
Each chapter must be substantial (target: ~${wordsPerChapter} words).
Return ONLY a valid JSON array of ${numChapters} objects, each with:
- "title": string (e.g. "Chapter 1: The Gathering Shadows")
- "summary": string (detailed scene breakdown: Scene 1, Scene 2, Scene 3 with specific plot beats and character arcs).
NO other text or markdown wrappers.`

      const outlineRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt: outlinePrompt, task: 'draft' }),
      })
      const outlineData = await outlineRes.json()
      if (outlineData.error) throw new Error(outlineData.error)

      let outline: { title: string; summary: string }[] = []
      try {
        const cleanedStr = outlineData.content.replace(/```json/gi, '').replace(/```/g, '').trim()
        outline = JSON.parse(cleanedStr)
      } catch {
        throw new Error('Failed to parse book outline. Please try again.')
      }

      if (!Array.isArray(outline) || outline.length === 0) throw new Error('Invalid outline generated.')

      // Step 2: Front Matter (KDP Standard: Title, Copyright, Dedication)
      setGenerationProgress({
        isOpen: true,
        currentStep: 'Writing KDP Front Matter (Title Page, Copyright, Dedication)...',
        progress: 15,
      })

      const year = new Date().getFullYear()
      const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const copyrightContent = `
        <div style="max-width: 520px; margin: 40px auto; font-size: 10.5pt; line-height: 1.8;">
          <p><strong>${book.title}</strong></p>
          ${book.subtitle ? `<p><em>${book.subtitle}</em></p>` : ''}
          <p style="margin-top: 20px;">Copyright &copy; ${year} by ${book.authorName || 'Author'}.</p>
          <p>All rights reserved.</p>
          <p style="margin-top: 20px; text-align: justify;">No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews.</p>
          <p style="margin-top: 20px;">Published by <strong>Dominion Writer</strong></p>
          <p>www.dominionwriter.com</p>
          <p>Contact: admin@dominionwriter.com</p>
          <p style="margin-top: 20px;">First Edition: ${monthYear}</p>
          <p>Printed in the United States of America</p>
        </div>
      `
      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: 'copyright_page', content: copyrightContent, action: 'upsert-front' }),
      })

      // Dedication
      const dedRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          prompt: `Write an elegant, poignant dedication for a ${book.bookType} book titled "${book.title}". Return only clean HTML with <p style="text-align: center; font-style: italic;">.`,
          task: 'draft',
        }),
      })
      const dedData = await dedRes.json()
      const dedHtml = dedData.error
        ? `<p style="text-align: center; font-style: italic;">Dedicated to all who pursue knowledge without boundaries.</p>`
        : dedData.content

      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: 'dedication', content: dedHtml, action: 'upsert-front' }),
      })

      // Step 3: Sequential Chapters Generation
      let previousSummaries = ''
      for (let i = 0; i < outline.length; i++) {
        const chap = outline[i]
        const pct = 15 + Math.floor(((i + 1) / outline.length) * 70)
        setGenerationProgress({
          isOpen: true,
          currentStep: `Writing ${chap.title} (${i + 1} of ${outline.length})...`,
          progress: pct,
        })

        // Create Chapter in DB
        const createRes = await fetch(`/api/books/${bookId}/chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, title: chap.title, content: '<p>Writing chapter content...</p>', action: 'create' }),
        })
        const newChap = await createRes.json()

        // Generate full-depth chapter content
        const chapPrompt = `Write the complete, full-length text for "${chap.title}" of the book "${book.title}".
Target length: At least ${wordsPerChapter} words.
Chapter Summary & Scenes: ${chap.summary}
Previous Chapter Context: ${previousSummaries || 'This is the opening chapter of the book.'}
Genre: ${book.bookType}, Style: ${book.style}. Language: ${book.language}.
Write fully developed literary scenes with rich dialogue, immersive world-building, pacing, character motivations, and narrative depth. Do NOT summarize.
Organize the chapter with <h3> subheadings and formatted <p> paragraphs. Format strictly as clean HTML. NO MARKDOWN.`

        const contentRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, prompt: chapPrompt, task: 'draft' }),
        })
        const contentData = await contentRes.json()
        const finalContent = contentData.error ? `<p>Failed to generate chapter text.</p>` : contentData.content

        await fetch(`/api/books/${bookId}/chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newChap.id, bookId, title: chap.title, content: finalContent, action: 'update' }),
        })

        previousSummaries += `\n- ${chap.title}: ${chap.summary.substring(0, 150)}`
        if (previousSummaries.length > 2000) {
          previousSummaries = previousSummaries.substring(previousSummaries.length - 2000)
        }
      }

      // Step 4: Generate Bibliography in selected Citation Standard
      setGenerationProgress({
        isOpen: true,
        currentStep: `Compiling Bibliography in ${book.bibliographyFormat.toUpperCase()} standard...`,
        progress: 88,
      })

      const standardNames: Record<string, string> = {
        apa: 'APA (7th edition)',
        mla: 'MLA (9th edition)',
        harvard: 'Harvard style',
        chicago: 'Chicago style (Notes & Bibliography)',
        iso690: 'ISO 690 standard (SURNAME in all caps)',
        abnt: 'ABNT standard (NBR 6023, SURNAME in all caps)',
      }
      const chosenStandardName = standardNames[book.bibliographyFormat] || 'APA (7th edition)'

      const bibPrompt = `Generate a realistic academic/literary bibliography of 8-12 sources relevant to the book "${book.title}" (${book.style} ${book.bookType}).
Format every citation strictly in ${chosenStandardName}.
Rules:
- Strictly alphabetical by author's last name
- Include books, journal articles, and authoritative studies
- Return ONLY a JSON array of strings, where each string is a complete citation.
Example: ["Mollick, E. (2024). Co-Intelligence. Portfolio.", "Smith, J. (2023). Title. Journal, 12(3), 45-60."]`

      try {
        const bibRes = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, prompt: bibPrompt, task: 'draft' }),
        })
        const bibData = await bibRes.json()
        if (!bibData.error) {
          const cleanedBib = bibData.content.replace(/```json/gi, '').replace(/```/g, '').trim()
          const citations = JSON.parse(cleanedBib)
          if (Array.isArray(citations)) {
            for (const cite of citations) {
              await fetch(`/api/books/${bookId}/matter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, type: book.bibliographyFormat || 'apa', content: cite, action: 'add-bibliography' }),
              })
            }
          }
        }
      } catch { /* proceed */ }

      // Step 5: Refresh and Finalize
      setGenerationProgress({
        isOpen: true,
        currentStep: 'Finalizing manuscript and Dynamic Table of Contents...',
        progress: 96,
      })

      await fetchBook()
      setGenerationProgress({ isOpen: false, currentStep: '', progress: 100 })
      toast.success('Full book generated successfully!')
    } catch (err: any) {
      setGenerationProgress({ isOpen: false, currentStep: '', progress: 0 })
      toast.error(err.message || 'Auto-write full book failed')
    }
  }

  // Handle image upload from computer file picker
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setImageUploadPreview(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const confirmInsertUploadedImage = () => {
    if (imageUploadPreview && editor) {
      editor.chain().focus().setImage({ src: imageUploadPreview }).run()
      setImageUploadPreview(null)
      setImageModalOpen(false)
      toast.success('Image inserted into manuscript')
    }
  }

  const confirmInsertUrlImage = () => {
    if (imageUrlInput.trim() && editor) {
      editor.chain().focus().setImage({ src: imageUrlInput.trim() }).run()
      setImageUrlInput('')
      setImageModalOpen(false)
      toast.success('Image inserted')
    }
  }

  // Front Matter cover upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor || !book) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const coverHtml = `
        <div style="text-align: center; margin: 20px auto;">
          <img src="${dataUrl}" alt="${book.title} Cover" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); margin: 0 auto; display: block;" />
        </div>
      `
      editor.commands.setContent(coverHtml)
      toast.success('Cover image uploaded!')
      setTimeout(() => saveContent(), 200)
    }
    reader.readAsDataURL(file)
  }

  // Author photo upload
  const handleAuthorPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor || !book) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const photoHtml = `
        <div style="max-width: 580px; margin: 40px auto; font-family: 'Georgia', serif;">
          <h2 style="font-size: 20pt; text-align: center; margin-bottom: 24px;">About the Author</h2>
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${dataUrl}" alt="${book.authorName || 'Author'}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 0 auto 16px auto; display: block; border: 3px solid #CBD5E1;" />
          </div>
          <p style="text-align: justify; line-height: 1.8;">
            <strong>${book.authorName || 'The author'}</strong> is a writer and creator whose work explores compelling themes, thoughtful storytelling, and inspiring ideas.
          </p>
        </div>
      `
      editor.commands.setContent(photoHtml)
      toast.success('Author photo uploaded!')
      setTimeout(() => saveContent(), 200)
    }
    reader.readAsDataURL(file)
  }

  // Dynamic Table of Contents calculation with estimated page numbers
  const calculateDynamicToc = () => {
    if (!book) return []
    let currentPage = 1
    const items: { id: string; title: string; page: number; type: 'front' | 'chapter' | 'back' }[] = []

    // Chapters
    book.chapters.forEach(ch => {
      const wordCount = ch.wordCount || 250
      const pageSpan = Math.max(1, Math.ceil(wordCount / 250))
      items.push({ id: ch.id, title: ch.title, page: currentPage, type: 'chapter' })
      currentPage += pageSpan
    })

    if (book.bibliographyEntries?.length > 0) {
      items.push({ id: 'bib', title: 'Bibliography', page: currentPage, type: 'back' })
      currentPage += Math.max(1, Math.ceil(book.bibliographyEntries.length / 4))
    }

    const hasAuthorBio = book.backMatter?.some(bm => bm.type === 'about_author')
    if (hasAuthorBio) {
      items.push({ id: 'bio', title: 'About the Author', page: currentPage, type: 'back' })
    }

    return items
  }

  const dynamicToc = calculateDynamicToc()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0B0F19]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto" />
          <p className="text-sm text-[#94A3B8]">Loading your manuscript workspace...</p>
        </div>
      </div>
    )
  }

  if (!book) return <div className="h-screen flex items-center justify-center text-[#94A3B8]">Book not found</div>

  return (
    <div className={`h-screen flex flex-col ${workspaceTheme === 'paper' ? 'bg-[#F1F5F9]' : 'bg-[#0B0F19]'}`}>
      
      {/* Hidden file inputs for cover and author photo */}
      <input ref={coverUploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      <input ref={authorPhotoUploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleAuthorPhotoUpload} />

      {/* ───── Top Editor Header ───── */}
      <div className="h-12 border-b border-[#1E293B] flex items-center px-3 gap-2 shrink-0 bg-[#0B0F19] text-[#E2E8F0]">
        {/* Mobile sidebar toggle */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-[#94A3B8] hover:text-[#F8FAFC]">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-[#0D1117] border-[#1E293B] p-0 text-[#E2E8F0]">
            <SheetTitle className="sr-only">Manuscript Outline</SheetTitle>
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

        <Button variant="ghost" onClick={() => { setView('dashboard'); setSelectedBookId(null) }} className="text-[#94A3B8] hover:text-[#F8FAFC]">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">My Library</span>
        </Button>

        <Separator orientation="vertical" className="h-6 bg-[#1E293B]" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#F8FAFC] truncate">{book.title}</p>
          <p className="text-xs text-[#94A3B8] truncate">{selectedChapter?.title || selectedMatter?.label || 'Select a section'}</p>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          {saving && <><Loader2 className="w-3 h-3 animate-spin text-[#3B82F6]" /> Saving...</>}
          {!saving && lastSaved && <><Save className="w-3 h-3 text-[#4ADE80]" /> Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</>}
        </div>

        {/* Theme Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWorkspaceTheme(t => t === 'paper' ? 'dark' : 'paper')}
          title={workspaceTheme === 'paper' ? 'Switch to Midnight Dark Theme' : 'Switch to Paper Book Reading Theme'}
          className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B] h-8 px-2.5 hidden sm:flex items-center gap-1.5"
        >
          {workspaceTheme === 'paper' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-yellow-400" />
              <span>Paper</span>
            </>
          )}
        </Button>

        {/* Font Family Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFontFamily(f => f === 'georgia' ? 'inter' : 'georgia')}
          title="Toggle Book Serif vs Modern Sans Typography"
          className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1E293B] h-8 px-2 hidden sm:flex"
        >
          {fontFamily === 'georgia' ? 'Serif' : 'Sans'}
        </Button>

        {/* Mobile TOC toggle */}
        <Button variant="ghost" size="icon" onClick={() => setTocOpen(!tocOpen)} className="md:hidden text-[#94A3B8] hover:text-[#F8FAFC]" title="Table of Contents">
          <BookMarked className="w-4 h-4" />
        </Button>

        {/* Export Button */}
        <div className="sm:ml-1">
          {book && <ExportButton bookId={book.id} bookTitle={book.title} />}
        </div>
      </div>

      {/* ───── Main Workspace ───── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Desktop Sidebar (Chapters & Front/Back Matter) */}
        <div className="hidden md:flex w-64 border-r border-[#1E293B] bg-[#0D1117] flex-col shrink-0 min-h-0 text-[#E2E8F0]">
          <SidebarContent
            book={book} selectedChapterId={selectedChapterId} selectedMatter={selectedMatter}
            sidebarTab={sidebarTab} setSidebarTab={setSidebarTab}
            onSelectChapter={handleSelectChapter}
            onSelectMatter={handleSelectMatter}
            onAddChapter={addChapter} onDeleteChapter={deleteChapter} onRenameChapter={renameChapter}
            onReorder={handleDragEnd} sensors={sensors}
          />
        </div>

        {/* Center Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          
          {/* TipTap Formatting Toolbar */}
          {editor && (selectedChapter || selectedMatter) && (
            <div className="border-b border-[#1E293B] px-3 py-1.5 flex items-center gap-1 flex-wrap shrink-0 bg-[#0B0F19] text-[#E2E8F0]">
              <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
                <Bold className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
                <Italic className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
                <UnderlineIcon className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
                <Strikethrough className="w-4 h-4" />
              </ToolbarButton>

              <div className="w-px h-5 bg-[#1E293B] mx-1" />

              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
                <Heading1 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
                <Heading2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
                <Heading3 className="w-4 h-4" />
              </ToolbarButton>

              <div className="w-px h-5 bg-[#1E293B] mx-1" />

              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
                <AlignLeft className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
                <AlignCenter className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
                <AlignRight className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify (KDP Standard)">
                <AlignJustify className="w-4 h-4" />
              </ToolbarButton>

              <div className="w-px h-5 bg-[#1E293B] mx-1" />

              <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
                <List className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
                <ListOrdered className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
                <Quote className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
                <Code className="w-4 h-4" />
              </ToolbarButton>

              <div className="w-px h-5 bg-[#1E293B] mx-1" />

              <ToolbarButton onClick={() => setImageModalOpen(true)} title="Insert Image (Upload or URL)">
                <ImagePlus className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight Text">
                <Highlighter className="w-4 h-4" />
              </ToolbarButton>

              <div className="w-px h-5 bg-[#1E293B] mx-1" />

              {/* Specific Cover Page Upload */}
              {selectedMatter?.kind === 'cover_page' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => coverUploadInputRef.current?.click()}
                  className="h-8 text-xs font-semibold bg-[#3B82F6]/15 text-[#3B82F6] hover:bg-[#3B82F6]/25 border border-[#3B82F6]/30 ml-auto"
                  title="Upload a front book cover image from your computer"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Book Cover
                </Button>
              )}

              {/* Specific Author Bio Photo Upload */}
              {selectedMatter?.kind === 'about_author' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => authorPhotoUploadInputRef.current?.click()}
                  className="h-8 text-xs font-semibold bg-[#3B82F6]/15 text-[#3B82F6] hover:bg-[#3B82F6]/25 border border-[#3B82F6]/30 ml-auto"
                  title="Upload author portrait photo from your computer"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Author Photo
                </Button>
              )}

              {/* AI Auto-write chapter or full book buttons */}
              {selectedMatter?.kind !== 'cover_page' && selectedMatter?.kind !== 'about_author' && (
                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={autoWriteChapter}
                    disabled={aiLoading || generationProgress.isOpen}
                    className="h-8 text-xs font-semibold bg-[#3B82F6]/15 text-[#3B82F6] hover:bg-[#3B82F6]/25 border border-[#3B82F6]/30"
                    title="Write or expand this single section using AI"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                    {selectedMatter ? 'Auto-Write Section' : 'Auto-Write Chapter'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={autoWriteFullBook}
                    disabled={aiLoading || generationProgress.isOpen}
                    className="h-8 text-xs font-semibold bg-[#8B5CF6]/15 text-[#8B5CF6] hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/30"
                    title="Generate complete multi-chapter book meeting target word count"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Auto-Write Full Book
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Floating AI Toolbar on text selection */}
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

          {/* Manuscript Reading / Writing Canvas */}
          <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 ${workspaceTheme === 'paper' ? 'bg-[#F1F5F9]' : 'bg-[#0B0F19]'}`}>
            {(selectedChapter || selectedMatter) ? (
              <div
                className={`max-w-4xl mx-auto py-12 px-6 sm:px-14 min-h-[85vh] transition-all rounded-2xl ${
                  workspaceTheme === 'paper'
                    ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xl border border-slate-200/90'
                    : 'bg-[#0F172A] text-[#F1F5F9] shadow-2xl border border-[#1E293B]'
                }`}
                style={{ fontFamily: fontFamily === 'georgia' ? "'Georgia', serif" : "'Inter', sans-serif" }}
              >
                {/* Header context */}
                <div className="mb-8 pb-4 border-b border-border/40 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    {selectedMatter ? `Front / Back Matter: ${selectedMatter.label}` : selectedChapter?.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedChapter ? `${(selectedChapter.wordCount || 0).toLocaleString()} words` : ''}
                  </span>
                </div>

                <div className="tiptap-editor">
                  <EditorContent editor={editor} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <BookOpen className="w-16 h-16 text-[#64748B]/40 mb-4" />
                <h2 className="text-xl font-semibold text-[#94A3B8] mb-2">Select a Section to Begin Writing</h2>
                <p className="text-sm text-[#64748B] max-w-sm">Choose a chapter, copyright page, or bibliography from the sidebar to view and edit.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Desktop Panel: Dynamic Table of Contents & Citations */}
        <div className={`hidden md:flex flex-col border-l border-[#1E293B] bg-[#0D1117] shrink-0 min-h-0 transition-all duration-300 text-[#E2E8F0] ${showTocPanel ? 'w-80' : 'w-0 overflow-hidden'}`}>
          <div className="p-3.5 border-b border-[#1E293B] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#F8FAFC]">Dynamic Table of Contents</h3>
              <p className="text-[11px] text-[#64748B]">Auto-updates with page numbers</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowTocPanel(false)} className="h-6 w-6 text-[#64748B] hover:text-[#E2E8F0]">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
            {/* Dynamic TOC List */}
            <div className="p-3 space-y-2">
              <div className="space-y-1">
                {dynamicToc.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.type === 'chapter') handleSelectChapter(item.id)
                      else if (item.id === 'bib') handleSelectMatter({ type: 'back', kind: 'bibliography', label: 'Bibliography' })
                      else if (item.id === 'bio') handleSelectMatter({ type: 'back', kind: 'about_author', label: 'About the Author' })
                    }}
                    className={`w-full text-left flex items-baseline justify-between p-1.5 rounded text-xs transition-colors group ${
                      (item.id === selectedChapterId || (item.id === 'bib' && selectedMatter?.kind === 'bibliography'))
                        ? 'bg-[#3B82F6]/15 text-[#3B82F6] font-semibold'
                        : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <span className="truncate flex-1 pr-2">{item.title}</span>
                    <span className="text-[11px] text-[#64748B] font-mono shrink-0">p. {item.page}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bibliography Panel with 6 Citation Standards */}
            <div className="border-t border-[#1E293B] mt-2">
              <BibliographyPanel book={book} bookId={bookId} onUpdate={fetchBook} />
            </div>

            {/* Glossary Panel */}
            <div className="border-t border-[#1E293B]">
              <GlossaryPanel book={book} bookId={bookId} onUpdate={fetchBook} />
            </div>
          </div>
        </div>

        {/* Collapsed TOC toggle button */}
        {!showTocPanel && (
          <button
            onClick={() => setShowTocPanel(true)}
            title="Open Dynamic Table of Contents"
            className="hidden md:flex items-center justify-center w-6 border-l border-[#1E293B] bg-[#0D1117] text-[#64748B] hover:text-[#F8FAFC] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ───── Image Inserter Modal (No browser prompt) ───── */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#0D1117] border-[#1E293B] text-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle>Insert Image into Manuscript</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Upload an image from your computer or paste an external URL.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="upload" className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-2 bg-[#1E293B]/50">
              <TabsTrigger value="upload" className="text-xs">Upload from Computer</TabsTrigger>
              <TabsTrigger value="url" className="text-xs">Image URL</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 pt-4">
              <div className="border-2 border-dashed border-[#1E293B] rounded-xl p-6 text-center hover:border-[#3B82F6]/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  id="editor-image-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <label htmlFor="editor-image-upload" className="cursor-pointer block">
                  <ImagePlus className="w-10 h-10 mx-auto mb-2 text-[#3B82F6]" />
                  <p className="text-sm font-medium text-[#F8FAFC]">Click to select an image</p>
                  <p className="text-xs text-[#64748B] mt-1">PNG, JPG, WEBP up to 10MB</p>
                </label>
              </div>

              {imageUploadPreview && (
                <div className="text-center">
                  <img src={imageUploadPreview} alt="Preview" className="max-h-40 mx-auto rounded-lg border border-[#1E293B]" />
                </div>
              )}

              <DialogFooter>
                <Button variant="ghost" onClick={() => setImageModalOpen(false)}>Cancel</Button>
                <Button onClick={confirmInsertUploadedImage} disabled={!imageUploadPreview} className="gradient-btn text-white">
                  Insert into Chapter
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="url" className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs text-[#94A3B8]">Image Web URL</label>
                <Input
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                  placeholder="https://example.com/illustration.jpg"
                  className="bg-[#1E293B] border-[#1E293B] text-[#E2E8F0]"
                />
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setImageModalOpen(false)}>Cancel</Button>
                <Button onClick={confirmInsertUrlImage} disabled={!imageUrlInput.trim()} className="gradient-btn text-white">
                  Insert Image
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ───── Full Book Generation Progress Dialog ───── */}
      <Dialog open={generationProgress.isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-[#0D1117] border-[#1E293B] text-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle>Generating Full Manuscript</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Dominion Writer is drafting your full book to target word counts. Please keep this tab open.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <Loader2 className="w-10 h-10 text-[#3B82F6] animate-spin" />
            <p className="text-sm font-medium text-[#F8FAFC] text-center max-w-xs">{generationProgress.currentStep}</p>
            <Progress value={generationProgress.progress} className="w-full h-2 bg-[#1E293B]" />
            <p className="text-xs text-[#64748B] font-mono">{generationProgress.progress}% complete</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Left Sidebar Content (Chapters, Front Matter, Back Matter) ───
function SidebarContent({
  book, selectedChapterId, selectedMatter, sidebarTab, setSidebarTab,
  onSelectChapter, onSelectMatter, onAddChapter, onDeleteChapter, onRenameChapter, onReorder, sensors
}: {
  book: BookData
  selectedChapterId: string | null
  selectedMatter: { type: 'front' | 'back'; kind: string; label: string } | null
  sidebarTab: string
  setSidebarTab: (t: 'chapters' | 'frontmatter' | 'backmatter') => void
  onSelectChapter: (id: string) => void
  onSelectMatter: (m: { type: 'front' | 'back'; kind: string; label: string }) => void
  onAddChapter: () => void
  onDeleteChapter: (id: string) => void
  onRenameChapter: (id: string, title: string) => void
  onReorder: (event: any) => void
  sensors: any
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const startRename = (ch: Chapter) => { setEditingId(ch.id); setEditTitle(ch.title) }
  const finishRename = () => {
    if (editingId && editTitle.trim()) onRenameChapter(editingId, editTitle.trim())
    setEditingId(null)
  }

  // KDP Standard Front Matter List
  const frontMatterTypes = [
    { type: 'cover_page', label: 'Cover Page (Art / Design)' },
    { type: 'half_title', label: 'Half-Title Page' },
    { type: 'title_page', label: 'Title Page' },
    { type: 'copyright_page', label: 'Copyright Page' },
    { type: 'dedication', label: 'Dedication' },
    { type: 'preface', label: 'Preface' },
    { type: 'acknowledgements', label: 'Acknowledgements' },
    { type: 'introduction', label: 'Introduction' },
  ]

  // KDP Standard Back Matter List
  const backMatterTypes = [
    { type: 'bibliography', label: 'Bibliography / References' },
    { type: 'about_author', label: 'About the Author' },
    { type: 'afterword', label: 'Afterword' },
    { type: 'back_cover', label: 'Back Cover Blurb' },
  ]

  return (
    <>
      {/* Book header */}
      <div className="p-3.5 border-b border-[#1E293B]">
        <h2 className="text-sm font-bold text-[#F8FAFC] truncate">{book.title}</h2>
        {book.subtitle && <p className="text-xs text-[#64748B] truncate">{book.subtitle}</p>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1E293B] bg-[#0B0F19]">
        {(['chapters', 'frontmatter', 'backmatter'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSidebarTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              sidebarTab === tab
                ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            {tab === 'chapters' ? 'Chapters' : tab === 'frontmatter' ? 'Front Matter' : 'Back Matter'}
          </button>
        ))}
      </div>

      {/* Chapters Tab */}
      {sidebarTab === 'chapters' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorder}>
              <SortableContext items={book.chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {book.chapters.map(ch => editingId === ch.id ? (
                  <div key={ch.id} className="px-3 py-1.5">
                    <Input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={finishRename}
                      onKeyDown={e => e.key === 'Enter' && finishRename()}
                      className="h-7 text-xs bg-[#1E293B] border-[#1E293B] text-[#F8FAFC]"
                      autoFocus
                    />
                  </div>
                ) : (
                  <SortableChapter
                    key={ch.id}
                    chapter={ch}
                    isSelected={ch.id === selectedChapterId}
                    onSelect={() => onSelectChapter(ch.id)}
                    onDelete={() => onDeleteChapter(ch.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <div className="p-2 border-t border-[#1E293B] space-y-1 bg-[#0B0F19]">
            <Button onClick={onAddChapter} variant="ghost" size="sm" className="w-full text-[#3B82F6] hover:bg-[#3B82F6]/10 justify-start h-8 text-xs font-medium">
              <Plus className="w-3.5 h-3.5 mr-2" /> Add Chapter
            </Button>
            <Button
              onClick={() => book.chapters.forEach(ch => { if (ch.id === selectedChapterId) startRename(ch) })}
              variant="ghost"
              size="sm"
              className="w-full text-[#94A3B8] hover:bg-[#1E293B] justify-start h-8 text-xs"
            >
              <Type className="w-3.5 h-3.5 mr-2" /> Rename Selected
            </Button>
          </div>
        </div>
      )}

      {/* Front Matter Tab (Full KDP Standards) */}
      {sidebarTab === 'frontmatter' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] px-2 py-1">KDP Front Matter</p>
          {frontMatterTypes.map(item => {
            const isSelected = selectedMatter?.type === 'front' && selectedMatter?.kind === item.type
            return (
              <button
                key={item.type}
                onClick={() => onSelectMatter({ type: 'front', kind: item.type, label: item.label })}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#F1F5F9] font-medium'
                    : 'text-[#94A3B8] hover:bg-[#1E293B]/60 border border-transparent hover:text-[#E2E8F0]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Back Matter Tab */}
      {sidebarTab === 'backmatter' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] px-2 py-1">KDP Back Matter</p>
          {backMatterTypes.map(item => {
            const isSelected = selectedMatter?.type === 'back' && selectedMatter?.kind === item.type
            return (
              <button
                key={item.type}
                onClick={() => onSelectMatter({ type: 'back', kind: item.type, label: item.label })}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#F1F5F9] font-medium'
                    : 'text-[#94A3B8] hover:bg-[#1E293B]/60 border border-transparent hover:text-[#E2E8F0]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#9B72F8] shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Bottom Summary */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0B0F19]">
        <div className="text-xs text-[#64748B] flex justify-between items-center">
          <span>{book.chapters.length} chapters</span>
          <span>{book.chapters.reduce((s, c) => s + (c.wordCount || 0), 0).toLocaleString()} words</span>
        </div>
      </div>
    </>
  )
}

// ─── Bibliography Panel with 6 Citation Standards ───────────
function BibliographyPanel({ book, bookId, onUpdate }: { book: BookData; bookId: string; onUpdate: () => void }) {
  const [newEntry, setNewEntry] = useState('')
  const [selectedFormat, setSelectedFormat] = useState(book.bibliographyFormat || 'apa')
  const [generating, setGenerating] = useState(false)
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id || session?.user?.email

  const addEntry = async () => {
    if (!newEntry.trim()) return
    try {
      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: selectedFormat, content: newEntry.trim(), action: 'add-bibliography' }),
      })
      setNewEntry('')
      onUpdate()
      toast.success('Citation added')
    } catch { toast.error('Failed to add entry') }
  }

  const deleteEntry = async (id: string) => {
    try {
      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: id, action: 'delete-bibliography' }),
      })
      onUpdate()
      toast.success('Citation removed')
    } catch { toast.error('Failed to delete') }
  }

  const changeCitationStandard = async (fmt: string) => {
    setSelectedFormat(fmt)
    try {
      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: fmt, action: 'update-format' }),
      })
      onUpdate()
      toast.success(`Standard set to ${fmt.toUpperCase()}`)
    } catch { /* silent */ }
  }

  const autoGenerateCitations = async () => {
    if (!userId) return
    setGenerating(true)
    const standardName = CITATION_STANDARDS.find(s => s.id === selectedFormat)?.name || 'APA 7th'
    
    try {
      const prompt = `Generate 5 realistic and properly formatted ${standardName} bibliography entries for a book titled "${book.title}".
Topic / Genre: ${book.style} ${book.bookType}.
Return ONLY a valid JSON array of strings, where each string is a complete citation conforming to ${standardName}.
Example: ["Mollick, E. (2024). Co-Intelligence. Portfolio."]
NO MARKDOWN.`

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, prompt, task: 'draft' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const cleaned = data.content.replace(/```json/gi, '').replace(/```/g, '').trim()
      const citations = JSON.parse(cleaned)
      if (Array.isArray(citations)) {
        for (const cite of citations) {
          await fetch(`/api/books/${bookId}/matter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId, type: selectedFormat, content: cite, action: 'add-bibliography' }),
          })
        }
        onUpdate()
        toast.success(`Generated 5 ${standardName} citations`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Citation generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-3 bg-[#0D1117]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-xs font-semibold text-[#F8FAFC]">Bibliography & Citations</h4>
          <p className="text-[10px] text-[#64748B]">Hanging indent (1.25 cm)</p>
        </div>
        <Badge variant="outline" className="text-[10px] border-[#1E293B] text-[#94A3B8]">{book.bibliographyEntries?.length || 0}</Badge>
      </div>

      {/* Citation Standard Dropdown */}
      <div className="mb-2.5">
        <label className="text-[10px] text-[#64748B] block mb-1 font-medium">Standard</label>
        <select
          value={selectedFormat}
          onChange={e => changeCitationStandard(e.target.value)}
          className="w-full bg-[#1E293B] border border-[#1E293B] rounded text-xs text-[#F8FAFC] p-1 focus:border-[#3B82F6] outline-none"
        >
          {CITATION_STANDARDS.map(s => (
            <option key={s.id} value={s.id}>{s.name} — {s.desc}</option>
          ))}
        </select>
      </div>

      {/* Citation list with hanging indent styling */}
      <div className="space-y-1.5 mb-2.5 max-h-36 overflow-y-auto custom-scrollbar">
        {(book.bibliographyEntries || []).map(e => (
          <div key={e.id} className="flex items-start gap-1.5 group bg-[#1E293B]/30 p-1.5 rounded border border-[#1E293B]/40">
            <p className="flex-1 text-[10.5px] text-[#CBD5E1] line-clamp-3" style={{ paddingLeft: '8px', textIndent: '-8px' }}>
              {e.citationText}
            </p>
            <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 shrink-0 p-0.5" title="Remove Citation">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex gap-1">
          <Input
            value={newEntry}
            onChange={e => setNewEntry(e.target.value)}
            placeholder="Add manual citation..."
            className="h-7 text-xs bg-[#1E293B] border-[#1E293B] text-[#F8FAFC] placeholder:text-[#64748B]"
            onKeyDown={e => e.key === 'Enter' && addEntry()}
          />
          <Button onClick={addEntry} size="sm" className="h-7 px-2 gradient-btn text-white shrink-0" title="Add Citation">
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        <Button
          onClick={autoGenerateCitations}
          disabled={generating}
          variant="outline"
          size="sm"
          className="w-full h-7 text-[11px] border-[#3B82F6]/40 text-[#3B82F6] hover:bg-[#3B82F6]/15 justify-center"
        >
          {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
          AI Auto-Generate Citations
        </Button>
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: 'glossary', content: newDef, term: newTerm, action: 'add-glossary' }),
      })
      setNewTerm(''); setNewDef('')
      onUpdate()
      toast.success('Glossary term added')
    } catch { toast.error('Failed to add term') }
  }

  const deleteTerm = async (id: string) => {
    try {
      await fetch(`/api/books/${bookId}/matter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, type: id, action: 'delete-glossary' }),
      })
      onUpdate()
      toast.success('Term removed')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="p-3 bg-[#0D1117]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-[#F8FAFC]">Glossary of Terms</h4>
        <Badge variant="outline" className="text-[10px] border-[#1E293B] text-[#94A3B8]">{book.glossaryTerms?.length || 0}</Badge>
      </div>
      <div className="space-y-1 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
        {(book.glossaryTerms || []).map(t => (
          <div key={t.id} className="flex items-start gap-1.5 group bg-[#1E293B]/30 p-1 rounded border border-[#1E293B]/40">
            <div className="flex-1 text-[10px]">
              <span className="font-semibold text-[#93C5FD]">{t.term}: </span>
              <span className="text-[#94A3B8]">{t.definition}</span>
            </div>
            <button onClick={() => deleteTerm(t.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 shrink-0 p-0.5" title="Delete Term">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={newTerm}
          onChange={e => setNewTerm(e.target.value)}
          placeholder="Term"
          className="h-7 text-xs bg-[#1E293B] border-[#1E293B] text-[#F8FAFC] placeholder:text-[#64748B] w-20"
        />
        <Input
          value={newDef}
          onChange={e => setNewDef(e.target.value)}
          placeholder="Definition"
          className="h-7 text-xs bg-[#1E293B] border-[#1E293B] text-[#F8FAFC] placeholder:text-[#64748B]"
        />
        <Button onClick={addTerm} size="sm" className="h-7 px-2 gradient-btn text-white shrink-0" title="Add Term">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}