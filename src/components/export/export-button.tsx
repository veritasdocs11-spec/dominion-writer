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
  const [pdfSettings, setPdfSettings] = useState({ pageSize: 'a4', margin: 10, fontSize: '12pt' })

  const userId = (session?.user as any)?.id || session?.user?.email

  const handleExport = async () => {
    setLoading(true)
    try {
      // Fetch the complete book data
      const res = await fetch(`/api/books/${bookId}`)
      if (!res.ok) throw new Error('Failed to load book')
      const book = await res.json()

      if (format === 'docx' || format === 'epub') {
        window.location.href = `/api/books/${bookId}/export?format=${format}`
        toast.success(`Downloading ${format.toUpperCase()}...`)
        setOpen(false)
        setLoading(false)
        return
      } else {
        // PDF: Use html2pdf.js
        const content = generateHtmlBook(book, pdfSettings.fontSize)
        const element = document.createElement('div')
        element.innerHTML = content
        
        // Attach offscreen to render properly
        element.style.position = 'absolute'
        element.style.left = '-9999px'
        element.style.top = '0'
        element.style.width = '800px'
        document.body.appendChild(element)
        
        // Dynamically import html2pdf
        const html2pdf = (await import('html2pdf.js')).default
        
        const opt = {
          margin:       pdfSettings.margin,
          filename:     `${bookTitle}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: 'mm', format: pdfSettings.pageSize, orientation: 'portrait' as const }
        };
        
        await html2pdf().set(opt).from(element).save();
        document.body.removeChild(element)
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

        {format === 'pdf' && (
          <div className="py-2 px-1 space-y-4">
            <h4 className="text-sm font-medium text-[#E2E8F0] mb-2 border-b border-[#1E293B] pb-1">PDF Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Page Size</label>
                <select 
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-md text-sm text-[#E2E8F0] p-1.5"
                  value={pdfSettings.pageSize}
                  onChange={(e) => setPdfSettings(s => ({ ...s, pageSize: e.target.value }))}
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                  <option value="a5">A5</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Margins (mm)</label>
                <select 
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-md text-sm text-[#E2E8F0] p-1.5"
                  value={pdfSettings.margin}
                  onChange={(e) => setPdfSettings(s => ({ ...s, margin: Number(e.target.value) }))}
                >
                  <option value="10">Normal (10mm)</option>
                  <option value="5">Narrow (5mm)</option>
                  <option value="20">Wide (20mm)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#94A3B8] block mb-1">Font Size</label>
                <div className="flex gap-2">
                  {(['10pt', '12pt', '14pt']).map(size => (
                    <button 
                      key={size}
                      onClick={() => setPdfSettings(s => ({ ...s, fontSize: size }))}
                      className={`flex-1 py-1.5 rounded text-xs transition-colors ${pdfSettings.fontSize === size ? 'bg-[#3B82F6] text-white' : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#E2E8F0]'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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

function generateHtmlBook(book: any, fontSize: string = '12pt'): string {
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
    body { font-family: 'Georgia', 'Times New Roman', serif; font-size: ${fontSize}; line-height: 1.8; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 40px 20px; }
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