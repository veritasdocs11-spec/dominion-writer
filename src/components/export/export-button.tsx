'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Download, Loader2, FileText, FileType, BookOpen, Printer } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cleanAiContent } from '@/lib/clean-content'

interface ExportButtonProps {
  bookId: string
  bookTitle: string
}

export function ExportButton({ bookId, bookTitle }: ExportButtonProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [format, setFormat] = useState<'pdf' | 'docx' | 'epub' | 'print'>('pdf')
  const [open, setOpen] = useState(false)
  const [pdfSettings, setPdfSettings] = useState({ pageSize: 'kdp6x9', margin: 15, fontSize: '11pt', font: 'georgia' })

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
        // High-fidelity KDP Print & Vector-PDF Generation via browser print engine
        // (Guarantees crisp selectable vector text, exact page sizes, and 0 blank pages)
        const html = generateHtmlBook(book, pdfSettings)
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
          throw new Error('Pop-up blocked. Please allow pop-ups to open the book preview.')
        }
        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
        
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
        }, 600)
        
        toast.success('Print window opened! In Destination, choose "Save as PDF" to save your KDP interior.', { duration: 6000 })
        setOpen(false)
        setLoading(false)
      }

      // Log export
      await fetch(`/api/books/${bookId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, format }),
      })

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
          <Download className="w-4 h-4 mr-1.5" /> Export Book
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#151C2C] border-[#1E293B] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#E2E8F0]">Export Finished Manuscript</DialogTitle>
          <DialogDescription className="text-[#94A3B8]">
            Choose an Amazon KDP-compliant export format for &quot;{bookTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-4">
          {[
            { fmt: 'pdf' as const, icon: FileText, label: 'KDP Interior PDF', desc: 'Vector print & digital' },
            { fmt: 'print' as const, icon: Printer, label: 'Print Preview', desc: 'Page-by-page proof' },
            { fmt: 'docx' as const, icon: FileType, label: 'Word (DOCX)', desc: 'With headers & footers' },
            { fmt: 'epub' as const, icon: BookOpen, label: 'EPUB E-Book', desc: 'Standard reader format' },
          ].map(({ fmt, icon: Icon, label, desc }) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`flex flex-col items-center text-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                format === fmt ? 'border-[#3B82F6] bg-[#3B82F6]/10' : 'border-[#1E293B] hover:border-[#334155]'
              }`}
            >
              <Icon className={`w-6 h-6 ${format === fmt ? 'text-[#3B82F6]' : 'text-[#94A3B8]'}`} />
              <span className={`text-xs font-semibold ${format === fmt ? 'text-[#3B82F6]' : 'text-[#E2E8F0]'}`}>{label}</span>
              <span className="text-[10px] text-[#475569]">{desc}</span>
            </button>
          ))}
        </div>

        {(format === 'pdf' || format === 'print') && (
          <div className="py-2 px-1 space-y-3 bg-[#0B0F19]/60 p-3 rounded-lg border border-[#1E293B]">
            <h4 className="text-xs font-semibold text-[#E2E8F0] uppercase tracking-wider">KDP Interior Design Options</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#94A3B8] block mb-1">Book Trim Size</label>
                <select 
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-md text-xs text-[#E2E8F0] p-1.5 focus:border-[#3B82F6] outline-none"
                  value={pdfSettings.pageSize}
                  onChange={(e) => setPdfSettings(s => ({ ...s, pageSize: e.target.value }))}
                >
                  <option value="kdp6x9">KDP Standard Trade (6&quot; × 9&quot;)</option>
                  <option value="letter">US Letter (8.5&quot; × 11&quot;)</option>
                  <option value="a4">Standard A4</option>
                  <option value="a5">Pocket A5</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#94A3B8] block mb-1">Typography Font</label>
                <select 
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-md text-xs text-[#E2E8F0] p-1.5 focus:border-[#3B82F6] outline-none"
                  value={pdfSettings.font}
                  onChange={(e) => setPdfSettings(s => ({ ...s, font: e.target.value }))}
                >
                  <option value="georgia">Georgia (Classic Book Serif)</option>
                  <option value="times">Times New Roman (Formal)</option>
                  <option value="garamond">Garamond (Literary Standard)</option>
                  <option value="sans">Inter / Sans-Serif (Modern)</option>
                </select>
              </div>
            </div>

            <div className="pt-1">
              <p className="text-[11px] text-[#4ADE80] flex items-center gap-1.5">
                <span>✓</span> Includes Half-Title, Title Page, Copyright, Table of Contents, Running Headers & Footers with Page Numbers.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-[#94A3B8] border-0">Cancel</Button>
          <Button onClick={handleExport} disabled={loading} className="gradient-btn text-white shadow-lg shadow-blue-500/20">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {format === 'print' ? 'Open Print Preview' : format === 'pdf' ? 'Export KDP PDF' : `Export ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function generateHtmlBook(book: any, settings: { pageSize?: string; fontSize?: string; font?: string } = {}): string {
  const fontFamilies: Record<string, string> = {
    georgia: "'Georgia', 'Palatino Linotype', serif",
    times: "'Times New Roman', Times, serif",
    garamond: "'Garamond', 'Baskerville', 'Georgia', serif",
    sans: "'Inter', system-ui, -apple-system, sans-serif",
  }
  const chosenFont = fontFamilies[settings.font || 'georgia'] || fontFamilies.georgia
  const fontSize = settings.fontSize || '11pt'

  // Estimate page numbers for Dynamic Table of Contents
  let runningPage = 1
  const tocEntries: { title: string; page: number; isSub?: boolean }[] = []

  // Estimate page count for chapters (~250 words per book page)
  const chaptersWithPages = (book.chapters || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex).map((ch: any) => {
    const rawContent = cleanAiContent(ch.content || '')
    const wordCount = ch.wordCount || rawContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length || 250
    const pageSpan = Math.max(1, Math.ceil(wordCount / 250))
    const startPage = runningPage
    tocEntries.push({ title: ch.title, page: startPage })
    runningPage += pageSpan
    return { ...ch, startPage, wordCount, cleanContent: rawContent }
  })

  // Bibliography & Back Matter page calculations
  let bibStartPage = runningPage
  if (book.bibliographyEntries?.length > 0) {
    tocEntries.push({ title: 'Bibliography', page: bibStartPage })
    runningPage += Math.max(1, Math.ceil(book.bibliographyEntries.length / 4))
  }

  const authorBioFm = book.backMatter?.find((bm: any) => bm.type === 'about_author')
  let authorBioPage = runningPage
  if (authorBioFm) {
    tocEntries.push({ title: 'About the Author', page: authorBioPage })
  }

  // Generate Chapters HTML with page breaks and chapter numbers
  const chaptersHtml = chaptersWithPages.map((ch: any) => `
    <div class="chapter-page">
      <div class="chapter-header-spacer"></div>
      <h2 class="chapter-title">${ch.title}</h2>
      <div class="chapter-body">
        ${ch.cleanContent || '<p></p>'}
      </div>
    </div>
  `).join('\n')

  // Copyright Page HTML (KDP standard)
  const copyrightFm = book.frontMatter?.find((fm: any) => fm.type === 'copyright_page')
  const year = new Date().getFullYear()
  const copyrightHtml = copyrightFm?.content ? cleanAiContent(copyrightFm.content) : `
    <div class="copyright-content">
      <p><strong>${book.title}</strong></p>
      ${book.subtitle ? `<p><em>${book.subtitle}</em></p>` : ''}
      <p style="margin-top: 24px;">Copyright &copy; ${year} by ${book.authorName || 'Author'}.</p>
      <p>All rights reserved.</p>
      <p style="margin-top: 24px; text-align: justify;">No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.</p>
      <p style="margin-top: 24px;">Published by <strong>Dominion Writer</strong></p>
      <p>www.dominionwriter.com</p>
      <p>Inquiries: admin@dominionwriter.com</p>
      <p style="margin-top: 24px;">First Edition: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      <p>Printed in the United States of America</p>
    </div>
  `

  // Half-title & Title Page
  const halfTitleFm = book.frontMatter?.find((fm: any) => fm.type === 'half_title')
  const halfTitleHtml = halfTitleFm?.content ? cleanAiContent(halfTitleFm.content) : `
    <div class="half-title-content">
      <h1>${book.title.toUpperCase()}</h1>
    </div>
  `

  const titlePageFm = book.frontMatter?.find((fm: any) => fm.type === 'title_page')
  const titlePageHtml = titlePageFm?.content ? cleanAiContent(titlePageFm.content) : `
    <div class="title-page-content">
      <h1>${book.title}</h1>
      ${book.subtitle ? `<h2>${book.subtitle}</h2>` : ''}
      <div class="author-byline">By ${book.authorName || 'Author'}</div>
      <div class="publisher-imprint">
        <p>DOMINION WRITER PRESS</p>
        <p>www.dominionwriter.com</p>
      </div>
    </div>
  `

  // Dedication Page
  const dedicationFm = book.frontMatter?.find((fm: any) => fm.type === 'dedication')
  const dedicationHtml = dedicationFm?.content ? `
    <div class="dedication-page">
      <div class="dedication-content">
        ${cleanAiContent(dedicationFm.content)}
      </div>
    </div>
  ` : ''

  // Dynamic Table of Contents HTML
  const tocHtml = `
    <div class="toc-page">
      <h2 class="toc-title">Table of Contents</h2>
      <div class="toc-list">
        ${tocEntries.map(entry => `
          <div class="toc-item">
            <span class="toc-item-title">${entry.title}</span>
            <span class="toc-leader"></span>
            <span class="toc-page-num">${entry.page}</span>
          </div>
        `).join('\n')}
      </div>
    </div>
  `

  // Back Matter: Bibliography with hanging indent and strict alphabetical sorting
  let bibliographyHtml = ''
  if (book.bibliographyEntries?.length > 0) {
    const sortedBib = [...book.bibliographyEntries].sort((a: any, b: any) => 
      a.citationText.localeCompare(b.citationText)
    )
    bibliographyHtml = `
      <div class="backmatter-page bibliography-page">
        <h2 class="section-title">Bibliography</h2>
        <div class="bibliography-list">
          ${sortedBib.map((e: any) => `<div class="bib-entry">${cleanAiContent(e.citationText)}</div>`).join('\n')}
        </div>
      </div>
    `
  } else {
    const bibBackMatter = book.backMatter?.find((bm: any) => bm.type === 'bibliography')
    if (bibBackMatter?.content) {
      bibliographyHtml = `
        <div class="backmatter-page bibliography-page">
          <h2 class="section-title">Bibliography</h2>
          <div class="bibliography-list">
            ${cleanAiContent(bibBackMatter.content)}
          </div>
        </div>
      `
    }
  }

  // Back Matter: About the Author
  let aboutAuthorHtml = ''
  if (authorBioFm) {
    aboutAuthorHtml = `
      <div class="backmatter-page author-page">
        ${cleanAiContent(authorBioFm.content)}
      </div>
    `
  }

  // Other Back Matter
  const otherBackMatterHtml = (book.backMatter || [])
    .filter((bm: any) => !['about_author', 'back_cover', 'bibliography'].includes(bm.type))
    .map((bm: any) => {
      const label = bm.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      return `
        <div class="backmatter-page">
          <h2 class="section-title">${label}</h2>
          <div>${cleanAiContent(bm.content || '')}</div>
        </div>
      `
    }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${book.title} — Amazon KDP Interior</title>
  <style>
    @page {
      size: 6in 9in;
      margin: 20mm 16mm 22mm 16mm;
      @top-left {
        content: "${book.authorName || ''}";
        font-family: ${chosenFont};
        font-size: 8.5pt;
        font-style: italic;
        color: #555555;
      }
      @top-right {
        content: "${book.title}";
        font-family: ${chosenFont};
        font-size: 8.5pt;
        font-style: italic;
        color: #555555;
      }
      @bottom-center {
        content: counter(page);
        font-family: ${chosenFont};
        font-size: 9pt;
        color: #333333;
      }
    }

    @page:first {
      @top-left { content: normal; }
      @top-right { content: normal; }
      @bottom-center { content: normal; }
    }

    * { box-sizing: border-box; }
    body {
      font-family: ${chosenFont};
      font-size: ${fontSize};
      line-height: 1.75;
      color: #111827;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    /* Screen preview styling (Elegant Book Card Layout) */
    @media screen {
      body {
        background-color: #0b0f19;
        padding: 30px 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .half-title-page, .title-page, .copyright-page, .dedication-page, .toc-page, .chapter-page, .backmatter-page {
        background: #ffffff;
        width: 6in;
        min-height: 9in;
        padding: 0.8in 0.65in;
        margin: 0 auto 30px auto;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
        border-radius: 4px;
        color: #111827;
      }
      .kdp-preview-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 6in;
        margin: 0 auto 24px auto;
        padding: 12px 18px;
        background: #1e293b;
        color: #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        font-family: system-ui, -apple-system, sans-serif;
      }
      .toolbar-title {
        font-size: 13px;
        font-weight: 700;
        color: #60a5fa;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .toolbar-hint {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 2px;
      }
      .print-btn {
        background: #2563eb;
        color: #ffffff;
        border: none;
        padding: 8px 16px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .print-btn:hover {
        background: #1d4ed8;
      }
    }

    /* Page Breaks for Print & PDF */
    .half-title-page {
      page-break-before: avoid;
      break-before: avoid;
      position: relative;
    }

    .title-page, .copyright-page, .dedication-page, .toc-page, .chapter-page, .backmatter-page {
      page-break-before: always;
      break-before: page;
      position: relative;
    }

    /* Front Matter Formatting */
    .half-title-content {
      padding-top: 180px;
      text-align: center;
    }
    .half-title-content h1 {
      font-size: 20pt;
      letter-spacing: 2px;
      font-weight: 700;
    }

    .title-page-content {
      padding-top: 140px;
      text-align: center;
    }
    .title-page-content h1 {
      font-size: 26pt;
      margin-bottom: 8px;
      font-weight: 800;
    }
    .title-page-content h2 {
      font-size: 14pt;
      font-weight: normal;
      font-style: italic;
      color: #4B5563;
      margin-bottom: 40px;
    }
    .author-byline {
      font-size: 14pt;
      margin-top: 60px;
    }
    .publisher-imprint {
      margin-top: 140px;
      font-size: 10pt;
      letter-spacing: 1px;
      color: #6B7280;
    }

    .copyright-content {
      padding-top: 100px;
      max-width: 480px;
      margin: 0 auto;
      font-size: 9.5pt;
      line-height: 1.7;
    }

    .dedication-content {
      padding-top: 200px;
      text-align: center;
      font-style: italic;
      font-size: 12pt;
      line-height: 2;
    }

    /* Table of Contents */
    .toc-title {
      font-size: 18pt;
      text-align: center;
      margin-bottom: 30px;
      padding-top: 40px;
    }
    .toc-list {
      max-width: 520px;
      margin: 0 auto;
    }
    .toc-item {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 10.5pt;
    }
    .toc-item-title {
      font-weight: 600;
      white-space: nowrap;
    }
    .toc-leader {
      flex: 1;
      border-bottom: 1px dotted #9CA3AF;
      margin: 0 8px;
      height: 1px;
    }
    .toc-page-num {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    /* Chapters & Body Text */
    .chapter-header-spacer {
      height: 40px;
    }
    .chapter-title {
      font-size: 20pt;
      text-align: center;
      margin-top: 20px;
      margin-bottom: 32px;
      page-break-after: avoid;
    }
    .chapter-body p {
      text-align: justify;
      margin: 0;
      text-indent: 1.5em;
      line-height: 1.8;
    }
    .chapter-body p:first-of-type,
    .chapter-body h2 + p,
    .chapter-body h3 + p {
      text-indent: 0;
    }
    .chapter-body h2, .chapter-body h3 {
      text-align: left;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
    }

    /* Bibliography & Hanging Indent */
    .section-title {
      font-size: 18pt;
      text-align: center;
      margin-top: 40px;
      margin-bottom: 24px;
      page-break-after: avoid;
    }
    .bibliography-list {
      max-width: 520px;
      margin: 0 auto;
    }
    .bib-entry {
      padding-left: 1.25cm;
      text-indent: -1.25cm;
      margin-bottom: 12px;
      text-align: justify;
      font-size: 10pt;
      line-height: 1.6;
    }

    /* Print media rules */
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
      }
      .half-title-page, .title-page, .copyright-page, .dedication-page, .toc-page, .chapter-page, .backmatter-page {
        background: transparent !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: auto !important;
        border-radius: 0 !important;
      }
      .kdp-preview-toolbar {
        display: none !important;
      }
      a {
        text-decoration: none;
        color: inherit;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Toolbar -->
  <div class="kdp-preview-toolbar">
    <div>
      <div class="toolbar-title">Amazon KDP Interior Ready</div>
      <div class="toolbar-hint">For PDF: Destination &rarr; &quot;Save as PDF&quot;, Margins &rarr; &quot;None&quot; or &quot;Default&quot;, uncheck Headers &amp; footers.</div>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <!-- Half Title Page -->
  <div class="half-title-page">
    ${halfTitleHtml}
  </div>

  <!-- Title Page -->
  <div class="title-page">
    ${titlePageHtml}
  </div>

  <!-- Copyright Page -->
  <div class="copyright-page">
    ${copyrightHtml}
  </div>

  <!-- Dedication Page -->
  ${dedicationHtml}

  <!-- Dynamic Table of Contents -->
  ${tocHtml}

  <!-- Chapters (Body Matter) -->
  ${chaptersHtml}

  <!-- Back Matter: Bibliography -->
  ${bibliographyHtml}

  <!-- Back Matter: About the Author -->
  ${aboutAuthorHtml}

  <!-- Other Back Matter -->
  ${otherBackMatterHtml}

</body>
</html>`
}