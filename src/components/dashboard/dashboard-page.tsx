'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/store/app-store'
import {
  Book, Plus, FileText, Copy, Trash2, MoreVertical, Pencil, BookOpen,
  Download, Sparkles, TrendingUp, Clock, BarChart3,
} from 'lucide-react'
import { ExportButton } from '@/components/export/export-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface BookData {
  id: string
  title: string
  subtitle?: string
  authorName?: string
  bookType: string
  style: string
  language: string
  wordCountTarget?: number | null
  description?: string
  coverUrl?: string
  status: string
  createdAt: string
  updatedAt: string
  chapters: { id: string; title: string; wordCount: number }[]
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:    { label: 'Draft',    bg: 'rgba(100,116,139,0.15)', text: '#94A3B8', dot: '#64748B' },
  writing:  { label: 'Writing',  bg: 'rgba(59,130,246,0.15)',  text: '#60A5FA', dot: '#3B82F6' },
  editing:  { label: 'Editing',  bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D', dot: '#F59E0B' },
  complete: { label: 'Complete', bg: 'rgba(34,197,94,0.15)',   text: '#4ADE80', dot: '#22C55E' },
}

const bookGradients = [
  'linear-gradient(135deg, #1e3a5f, #0f2744)',
  'linear-gradient(135deg, #3b1f5e, #200f44)',
  'linear-gradient(135deg, #1a4a3a, #0d2f24)',
  'linear-gradient(135deg, #4a2c1a, #2f1a0d)',
  'linear-gradient(135deg, #1f2d5e, #0f1a44)',
  'linear-gradient(135deg, #3d1a3a, #240f22)',
]

export function DashboardPage() {
  const { data: session } = useSession()
  const { setView, setSelectedBookId } = useAppStore()
  const [books, setBooks] = useState<BookData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchBooks = useCallback(async () => {
    const userId = (session?.user as any)?.id || session?.user?.email
    if (!userId) return
    try {
      const res = await fetch(`/api/books?userId=${userId}`)
      if (res.ok) setBooks(await res.json())
    } catch {
      toast.error('Failed to load books')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const handleEdit = (book: BookData) => {
    setSelectedBookId(book.id)
    setView('editor')
  }

  const handleDuplicate = async (book: BookData) => {
    const userId = (session?.user as any)?.id || session?.user?.email
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, title: `${book.title} (Copy)`, subtitle: book.subtitle,
          authorName: book.authorName, bookType: book.bookType, style: book.style,
          styleOtherText: null, language: book.language,
          wordCountTarget: book.wordCountTarget, description: book.description,
          bibliographyFormat: 'none',
        }),
      })
      if (res.ok) { toast.success('Book duplicated'); fetchBooks() }
    } catch { toast.error('Failed to duplicate') }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/books/${deleteId}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Book deleted'); setBooks(prev => prev.filter(b => b.id !== deleteId)) }
    } catch { toast.error('Failed to delete') }
    finally { setDeleteId(null) }
  }

  const handleQuickExport = async (bId: string, bTitle: string) => {
    try {
      const res = await fetch(`/api/books/${bId}`)
      if (!res.ok) throw new Error('Failed to load book')
      const book = await res.json()
      const chaptersHtml = (book.chapters || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex)
        .map((ch: any) => `<div class="chapter" style="page-break-before:always"><h2>${ch.title}</h2>${ch.content || ''}</div>`).join('')
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${bTitle}</title><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.8;max-width:700px;margin:0 auto;padding:40px 20px;color:#1a1a1a}h1{font-size:24pt}h2{font-size:18pt;margin-top:28pt}.chapter:first-child{page-break-before:auto}p{margin:8pt 0;text-align:justify}</style></head><body><h1>${bTitle}</h1>${book.subtitle ? `<p><em>${book.subtitle}</em></p>` : ''}<p>by ${book.authorName || ''}</p>${chaptersHtml}</body></html>`
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${bTitle}.html`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); 
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Book exported!')
    } catch { toast.error('Export failed') }
  }

  const totalWords = (book: BookData) => book.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
  const totalWordCount = books.reduce((sum, b) => sum + totalWords(b), 0)
  const totalChapters = books.reduce((sum, b) => sum + b.chapters.length, 0)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Skeleton className="h-10 w-48 mb-3 rounded-xl" style={{ background: '#1A2540' }} />
        <Skeleton className="h-4 w-32 mb-8 rounded-lg" style={{ background: '#1A2540' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" style={{ background: '#1A2540' }} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-2xl" style={{ background: '#1A2540' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: '#EEF2FF' }}>
            My <span className="gradient-text">Library</span>
          </h1>
          <p className="text-sm" style={{ color: '#8899BB' }}>
            {books.length} book{books.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <button
          onClick={() => setView('wizard')}
          className="gradient-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white self-start"
        >
          <Plus className="w-4 h-4" />
          New Book
        </button>
      </div>

      {/* Stats row */}
      {books.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Book, label: 'Books', value: books.length, color: '#4F8EF7' },
            { icon: FileText, label: 'Chapters', value: totalChapters, color: '#9B72F8' },
            { icon: BarChart3, label: 'Total Words', value: totalWordCount.toLocaleString(), color: '#22D3EE' },
            { icon: TrendingUp, label: 'In Progress', value: books.filter(b => b.status === 'writing').length, color: '#4ADE80' },
          ].map(stat => (
            <div key={stat.label} className="stat-card animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs font-medium" style={{ color: '#8899BB' }}>{stat.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, rgba(79,142,247,0.15), rgba(155,114,248,0.1))', border: '1px solid rgba(79,142,247,0.2)' }}>
              <BookOpen className="w-14 h-14" style={{ color: '#4F8EF7' }} />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center animate-bounce"
              style={{ background: 'linear-gradient(135deg, #4F8EF7, #9B72F8)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#EEF2FF', fontFamily: "'Outfit', sans-serif" }}>Start Your First Book</h2>
          <p className="max-w-md mb-8 text-base" style={{ color: '#8899BB' }}>
            Every great book begins with an idea. Create your first manuscript with AI assistance and write without limits.
          </p>
          <button
            onClick={() => setView('wizard')}
            className="gradient-btn inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white"
          >
            <Plus className="w-5 h-5" />
            Create New Book
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book, idx) => {
            const sc = statusConfig[book.status] || statusConfig.draft
            const wc = totalWords(book)
            const progress = book.wordCountTarget ? Math.min(100, Math.round((wc / book.wordCountTarget) * 100)) : null
            const gradient = bookGradients[idx % bookGradients.length]

            return (
              <div
                key={book.id}
                className="book-card animate-scale-in group"
                style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
                onClick={() => handleEdit(book)}
              >
                {/* Cover */}
                <div className="h-44 relative overflow-hidden" style={{ background: gradient }}>
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center px-4">
                        <Book className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: '#fff' }} />
                        <p className="text-xs font-medium opacity-40 text-white truncate">{book.title}</p>
                      </div>
                      {/* Decorative lines */}
                      <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.1) 30px, rgba(255,255,255,0.1) 31px)' }} />
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: sc.bg, color: sc.text }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                      {sc.label}
                    </span>
                  </div>

                  {/* Options menu */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'rgba(8,12,20,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <MoreVertical className="w-4 h-4 text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border"
                        style={{ background: '#0F1825', borderColor: '#1A2540' }}>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(book) }}
                          className="text-sm cursor-pointer" style={{ color: '#EEF2FF' }}>
                          <Pencil className="w-4 h-4 mr-2 text-blue-400" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(book) }}
                          className="text-sm cursor-pointer" style={{ color: '#EEF2FF' }}>
                          <Copy className="w-4 h-4 mr-2 text-purple-400" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickExport(book.id, book.title) }}
                          className="text-sm cursor-pointer" style={{ color: '#EEF2FF' }}>
                          <Download className="w-4 h-4 mr-2 text-cyan-400" /> Export HTML
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteId(book.id) }}
                          className="text-sm cursor-pointer text-red-400 focus:text-red-300">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="font-bold text-base leading-tight mb-1 truncate" style={{ color: '#EEF2FF' }}>{book.title}</h3>
                  {book.subtitle && <p className="text-xs mb-3 truncate" style={{ color: '#8899BB' }}>{book.subtitle}</p>}

                  <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                    {[
                      book.bookType === 'fiction' ? 'Fiction' : 'Non-Fiction',
                      book.style,
                      book.language,
                    ].map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {progress !== null && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs" style={{ color: '#8899BB' }}>Progress</span>
                        <span className="text-xs font-medium" style={{ color: '#4F8EF7' }}>{progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6677AA' }}>
                      <FileText className="w-3.5 h-3.5" />
                      {book.chapters.length} chapter{book.chapters.length !== 1 ? 's' : ''} · {wc.toLocaleString()} words
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#6677AA' }}>
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(book.updatedAt + (book.updatedAt.endsWith('Z') ? '' : 'Z')), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent style={{ background: '#0F1825', border: '1px solid #1A2540', borderRadius: '1.25rem' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#EEF2FF' }}>Delete Book</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#8899BB' }}>
              This will permanently delete this book and all its chapters. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ background: '#1A2540', color: '#EEF2FF', border: 'none' }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#EF4444', color: '#fff', border: 'none' }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}