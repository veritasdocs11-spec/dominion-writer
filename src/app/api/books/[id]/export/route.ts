import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Header, Footer, PageNumber, NumberFormat } from 'docx'
import Epub from 'epub-gen-memory'

export async function POST(request: Request) {
  try {
    const { bookId, format } = await request.json()
    if (!bookId || !format) {
      return NextResponse.json({ error: 'Book ID and format required' }, { status: 400 })
    }

    const book = await db.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: { orderBy: { orderIndex: 'asc' } },
        frontMatter: { orderBy: { orderIndex: 'asc' } },
        backMatter: { orderBy: { orderIndex: 'asc' } },
        glossaryTerms: { orderBy: { orderIndex: 'asc' } },
        bibliographyEntries: { orderBy: { orderIndex: 'asc' } },
      },
    })
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    await db.exportHistory.create({
      data: { bookId, format, createdAt: new Date() },
    })

    await db.book.update({ where: { id: bookId }, data: { status: 'complete' } })

    return NextResponse.json({ success: true, book })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    if (!format || !['docx', 'epub'].includes(format)) {
      return new NextResponse('Invalid format', { status: 400 })
    }

    const book = await db.book.findUnique({
      where: { id },
      include: {
        chapters: { orderBy: { orderIndex: 'asc' } },
        frontMatter: { orderBy: { orderIndex: 'asc' } },
        backMatter: { orderBy: { orderIndex: 'asc' } },
        glossaryTerms: { orderBy: { orderIndex: 'asc' } },
        bibliographyEntries: { orderBy: { orderIndex: 'asc' } },
      },
    })

    if (!book) return new NextResponse('Book not found', { status: 404 })

    // Log the export
    await db.exportHistory.create({
      data: { bookId: id, format, createdAt: new Date() },
    })

    const stripHtml = (html: string) => {
      if (!html) return ''
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&copy;/g, '©')
        .replace(/&bull;/g, '•')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    if (format === 'docx') {
      const children: any[] = []

      // 1. Half-Title Page
      children.push(new Paragraph({
        text: book.title.toUpperCase(),
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 2800, after: 400 },
      }))
      children.push(new Paragraph({ text: '', pageBreakBefore: true }))

      // 2. Title Page
      children.push(new Paragraph({
        text: book.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400, after: 200 },
      }))
      if (book.subtitle) {
        children.push(new Paragraph({
          text: book.subtitle,
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: book.subtitle, italics: true, color: '666666' })],
        }))
      }
      children.push(new Paragraph({
        text: `By ${book.authorName || 'Author'}`,
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 1200 },
      }))
      children.push(new Paragraph({
        text: 'DOMINION WRITER PUBLISHING',
        alignment: AlignmentType.CENTER,
        spacing: { before: 1800 },
        children: [new TextRun({ text: 'DOMINION WRITER PUBLISHING', size: 18, color: '888888' })],
      }))
      children.push(new Paragraph({ text: '', pageBreakBefore: true }))

      // 3. Copyright Page (KDP Standard: first left-facing page after Title)
      const copyrightFm = book.frontMatter?.find((fm: any) => fm.type === 'copyright_page')
      const year = new Date().getFullYear()
      const copyrightText = copyrightFm?.content ? stripHtml(copyrightFm.content) : `
Copyright © ${year} by ${book.authorName || 'Author'}.
All rights reserved.

No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without prior written permission of the publisher.

Published by Dominion Writer
www.dominionwriter.com
Inquiries: admin@dominionwriter.com

Printed in the United States of America
      `.trim()

      children.push(new Paragraph({
        text: 'Copyright Information',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 1000, after: 300 },
      }))
      copyrightText.split('\n\n').forEach(paragraph => {
        if (paragraph.trim()) {
          children.push(new Paragraph({
            text: paragraph.trim(),
            spacing: { after: 200 },
          }))
        }
      })
      children.push(new Paragraph({ text: '', pageBreakBefore: true }))

      // 4. Other Front Matter (Dedication, Preface, Acknowledgements)
      book.frontMatter
        ?.filter((fm: any) => !['cover_page', 'half_title', 'title_page', 'copyright_page'].includes(fm.type))
        .forEach((fm: any) => {
          const label = fm.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          children.push(new Paragraph({
            text: label,
            heading: HeadingLevel.HEADING_1,
            alignment: fm.type === 'dedication' ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: fm.type === 'dedication' ? 2400 : 800, after: 400 },
          }))
          const text = stripHtml(fm.content || '')
          text.split('\n\n').forEach(p => {
            if (p.trim()) {
              children.push(new Paragraph({
                text: p.trim(),
                alignment: fm.type === 'dedication' ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
                spacing: { after: 240 },
                children: fm.type === 'dedication' ? [new TextRun({ text: p.trim(), italics: true })] : undefined,
              }))
            }
          })
          children.push(new Paragraph({ text: '', pageBreakBefore: true }))
        })

      // 5. Dynamic Table of Contents (Estimated page numbers)
      children.push(new Paragraph({
        text: 'Table of Contents',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 800, after: 400 },
      }))
      
      let runningPage = 1
      book.chapters?.forEach((ch: any) => {
        const estPages = Math.max(1, Math.ceil((ch.wordCount || 250) / 250))
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: ch.title, bold: true }),
            new TextRun({ text: ` .............................................................. Page ${runningPage}`, color: '666666' }),
          ],
        }))
        runningPage += estPages
      })

      if (book.bibliographyEntries?.length > 0) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: 'Bibliography / References', bold: true }),
            new TextRun({ text: ` .............................................................. Page ${runningPage}`, color: '666666' }),
          ],
        }))
        runningPage += Math.max(1, Math.ceil(book.bibliographyEntries.length / 5))
      }

      const authorBioFm = book.backMatter?.find((bm: any) => bm.type === 'about_author')
      if (authorBioFm) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: 'About the Author', bold: true }),
            new TextRun({ text: ` .............................................................. Page ${runningPage}`, color: '666666' }),
          ],
        }))
      }
      children.push(new Paragraph({ text: '', pageBreakBefore: true }))

      // 6. Chapters (Body Matter)
      book.chapters?.forEach((ch: any) => {
        children.push(new Paragraph({
          text: ch.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 800, after: 400 },
        }))
        const text = stripHtml(ch.content || '')
        const paragraphs = text.split('\n\n')
        paragraphs.forEach((p, idx) => {
          if (p.trim()) {
            children.push(new Paragraph({
              text: p.trim(),
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 180 },
              indent: idx === 0 ? undefined : { firstLine: 360 }, // First line indent on subsequent paragraphs
            }))
          }
        })
        children.push(new Paragraph({ text: '', pageBreakBefore: true }))
      })

      // 7. Back Matter - Bibliography (with 0.5 in / 720 dxa hanging indent)
      if (book.bibliographyEntries?.length > 0) {
        children.push(new Paragraph({
          text: 'Bibliography',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 800, after: 400 },
        }))
        
        // Alphabetical sort by author citation text
        const sortedBib = [...book.bibliographyEntries].sort((a: any, b: any) => 
          a.citationText.localeCompare(b.citationText)
        )

        sortedBib.forEach((entry: any) => {
          children.push(new Paragraph({
            text: entry.citationText,
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: 720, hanging: 720 }, // Hanging indent: 0.5 inches
            spacing: { after: 160 },
          }))
        })
        children.push(new Paragraph({ text: '', pageBreakBefore: true }))
      }

      // 8. Back Matter - Other items (About the Author, Afterword)
      book.backMatter
        ?.filter((bm: any) => bm.type !== 'back_cover')
        .forEach((bm: any) => {
          const label = bm.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          children.push(new Paragraph({
            text: label,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 800, after: 400 },
          }))
          const text = stripHtml(bm.content || '')
          text.split('\n\n').forEach(p => {
            if (p.trim()) {
              children.push(new Paragraph({
                text: p.trim(),
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 200 },
              }))
            }
          })
          children.push(new Paragraph({ text: '', pageBreakBefore: true }))
        })

      // Construct document with running headers and footers (page numbers)
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                pageNumbers: {
                  start: 1,
                  formatType: NumberFormat.DECIMAL,
                },
              },
            },
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({ text: book.title, italics: true, size: 18, color: '666666' }),
                    ],
                  }),
                ],
              }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        size: 18,
                        color: '444444',
                      }),
                    ],
                  }),
                ],
              }),
            },
            children,
          },
        ],
      })

      const buffer = await Packer.toBuffer(doc)

      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_')}.docx"`
        }
      })
    } 
    else if (format === 'epub') {
      const epubContent: { title: string, data: string }[] = []

      // 1. Title Page
      epubContent.push({
        title: 'Title Page',
        data: `
          <div style="text-align: center; margin-top: 20%;">
            <h1>${book.title}</h1>
            ${book.subtitle ? `<h2>${book.subtitle}</h2>` : ''}
            <p style="margin-top: 30px;">By ${book.authorName || 'Author'}</p>
            <p style="margin-top: 50px; font-size: 0.9em; color: #666;">Dominion Writer Publishing</p>
          </div>
        `,
      })

      // 2. Copyright Page
      const copyrightFm = book.frontMatter?.find((fm: any) => fm.type === 'copyright_page')
      epubContent.push({
        title: 'Copyright',
        data: copyrightFm?.content || `
          <div style="font-size: 0.9em; line-height: 1.6;">
            <p><strong>${book.title}</strong></p>
            <p>Copyright © ${new Date().getFullYear()} by ${book.authorName || 'Author'}.</p>
            <p>All rights reserved.</p>
            <p>Published by Dominion Writer (www.dominionwriter.com)</p>
            <p>Contact: admin@dominionwriter.com</p>
          </div>
        `,
      })

      // 3. Other Front Matter
      book.frontMatter
        ?.filter((fm: any) => !['cover_page', 'half_title', 'title_page', 'copyright_page'].includes(fm.type))
        .forEach((fm: any) => {
          const label = fm.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          epubContent.push({ title: label, data: `<h2>${label}</h2>${fm.content || ''}` })
        })

      // 4. Chapters
      book.chapters?.forEach((ch: any) => {
        epubContent.push({ title: ch.title, data: `<h2>${ch.title}</h2>${ch.content || ''}` })
      })

      // 5. Bibliography
      if (book.bibliographyEntries?.length > 0) {
        const sortedBib = [...book.bibliographyEntries].sort((a: any, b: any) => 
          a.citationText.localeCompare(b.citationText)
        )
        const bibHtml = `
          <h2>Bibliography</h2>
          <div style="margin-top: 20px;">
            ${sortedBib.map((e: any) => `<p style="padding-left: 2em; text-indent: -2em; margin-bottom: 0.8em;">${e.citationText}</p>`).join('\n')}
          </div>
        `
        epubContent.push({ title: 'Bibliography', data: bibHtml })
      }

      // 6. Back Matter
      book.backMatter
        ?.filter((bm: any) => bm.type !== 'back_cover')
        .forEach((bm: any) => {
          const label = bm.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          epubContent.push({ title: label, data: `<h2>${label}</h2>${bm.content || ''}` })
        })

      const epubOptions = {
        title: book.title,
        author: book.authorName || 'Author',
        publisher: 'Dominion Writer',
        description: book.description || '',
        content: epubContent,
      }

      const buffer = await Epub(epubOptions, [])
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/epub+zip',
          'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_')}.epub"`
        }
      })
    }
  } catch (error: any) {
    console.error('Export error:', error)
    return new NextResponse(`Export failed: ${error.message}`, { status: 500 })
  }
}