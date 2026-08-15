'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Download, Loader2, FileText, FileType, BookOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ExportButtonProps {
  bookId: string
  bookTitle: string
}

export function ExportButton({ bookId, bookTitle }: ExportButtonProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [format, setFormat] = useState<'pdf' | 'docx' | 'epub'>('pdf')
  const [open, setOpen] = useState(false)

  const userId = (session?.user as any)?.id || session?.user?.email

  const handleExport = async () => {
    setLoading(true)
    try {
      // Fetch the complete book data
      const res = await fetch(`/api/books/${bookId}`)
      if (!res.ok) throw new Error('Failed to load book')
      const book = await res.json()

      if (format === 'docx') {
        const content = generateHtmlBook(book)
        // Simple HTML-to-DOCX using HTML wrapper with .doc extension (Word can open it)
        const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        const filename = `${bookTitle}.doc`
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else if (format === 'epub') {
        // Generate a basic EPUB-like HTML file
        const content = generateHtmlBook(book)
        const blob = new Blob([content], { type: 'application/epub+zip' })
        const filename = `${bookTitle}.epub`
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else {
        // PDF: Use html2pdf.js
        const content = generateHtmlBook(book)
        const element = document.createElement('div')
        element.innerHTML = content
        
        // Dynamically import html2pdf
        const html2pdf = (await import('html2pdf.js')).default
        
        const opt = {
          margin:       10,
          filename:     `${bookTitle}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };
        
        await html2pdf().set(opt).from(element).save();
      }

      // Log export
      await fetch(`/api/books/${bookId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, format }),
      })

      toast.success(`Exported as ${format.toUpperCase()}!`)
      setOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#1E293B]">
          <Download className="w-4 h-4 mr-1.5" /> Export
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#151C2C] border-[#1E293B] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#E2E8F0]">Export Book</DialogTitle>
          <DialogDescription className="text-[#94A3B8]">Choose a format to export &quot;{bookTitle}&quot;</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {([
            { fmt: 'pdf' as const, icon: FileText, label: 'PDF', desc: 'For printing & sharing' },
            { fmt: 'docx' as const, icon: FileType, label: 'DOCX', desc: 'Word document' },
            { fmt: 'epub' as const, icon: BookOpen, label: 'EPUB', desc: 'E-reader format' },
          ]).map(({ fmt, icon: Icon, label, desc }) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                format === fmt ? 'border-[#3B82F6] bg-[#3B82F6]/10' : 'border-[#1E293B] hover:border-[#334155]'
              }`}
            >
              <Icon className={`w-8 h-8 ${format === fmt ? 'text-[#3B82F6]' : 'text-[#94A3B8]'}`} />
              <span className={`text-sm font-medium ${format === fmt ? 'text-[#3B82F6]' : 'text-[#E2E8F0]'}`}>{label}</span>
              <span className="text-xs text-[#475569]">{desc}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-[#94A3B8] border-0">Cancel</Button>
          <Button onClick={handleExport} disabled={loading} className="gradient-btn text-white">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Export {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function generateHtmlBook(book: any): string {
  const chaptersHtml = book.chapters
    ?.sort((a: any, b: any) => a.orderIndex - b.orderIndex)
    .map((ch: any) => `
      <div class="chapter">
        <h2>${ch.title}</h2>
        ${ch.content || '<p></p>'}
      </div>
    `).join('') || ''

  const frontMatterHtml = book.frontMatter
    ?.sort((a: any, b: any) => a.orderIndex - b.orderIndex)
    .map((fm: any) => {
      const label = fm.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      return `<div class="front-matter"><h2>${label}</h2>${fm.content || ''}</div>`
    }).join('') || ''

  const backMatterHtml = book.backMatter
    ?.sort((a: any, b: any) => a.orderIndex - b.orderIndex)
    .map((bm: any) => {
      const label = bm.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      return `<div class="back-matter"><h2>${label}</h2>${bm.content || ''}</div>`
    }).join('') || ''

  const glossaryHtml = book.glossaryTerms?.length > 0 ? `
    <div class="glossary">
      <h2>Glossary</h2>
      <dl>
        ${book.glossaryTerms.map((t: any) => `<dt>${t.term}</dt><dd>${t.definition}</dd>`).join('\n')}
      </dl>
    </div>
  ` : ''

  const bibliographyHtml = book.bibliographyEntries?.length > 0 ? `
    <div class="bibliography">
      <h2>Bibliography</h2>
      <ol>
        ${book.bibliographyEntries.map((e: any) => `<li>${e.citationText}</li>`).join('\n')}
      </ol>
    </div>
  ` : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${book.title}</title>
  <style>
    @page { margin: 2.5cm; }
    body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 12pt; line-height: 1.8; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 40px 20px; }
    .title-page { text-align: center; padding-top: 200px; page-break-after: always; }
    .title-page h1 { font-size: 28pt; margin-bottom: 12px; }
    .title-page h2 { font-size: 16pt; font-weight: normal; color: #555; margin-bottom: 8px; }
    .title-page .author { font-size: 14pt; color: #333; margin-top: 40px; }
    h1 { font-size: 22pt; margin-top: 36pt; margin-bottom: 12pt; page-break-after: avoid; }
    h2 { font-size: 18pt; margin-top: 28pt; margin-bottom: 10pt; page-break-after: avoid; }
    h3 { font-size: 14pt; margin-top: 20pt; margin-bottom: 8px; }
    p { margin: 8pt 0; text-align: justify; }
    blockquote { border-left: 3px solid #333; padding-left: 16px; margin: 16pt 0; color: #444; font-style: italic; }
    ul, ol { padding-left: 24pt; margin: 8pt 0; }
    li { margin: 4pt 0; }
    img { max-width: 100%; }
    .chapter { page-break-before: always; }
    .chapter:first-child { page-break-before: auto; }
    .front-matter { margin-bottom: 40px; }
    .back-matter { margin-top: 40px; }
    dt { font-weight: bold; margin-top: 8px; }
    dd { margin-left: 20px; color: #444; }
  </style>
</head>
<body>
  <div class="title-page">
    <h1>${book.title}</h1>
    ${book.subtitle ? `<h2>${book.subtitle}</h2>` : ''}
    <div class="author">by ${book.authorName || 'Unknown Author'}</div>
  </div>

  ${frontMatterHtml}

  ${chaptersHtml}

  ${backMatterHtml}

  ${glossaryHtml}

  ${bibliographyHtml}
</body>
</html>`
}