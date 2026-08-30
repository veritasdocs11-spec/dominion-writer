import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
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

    const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, '') : ''

    if (format === 'docx') {
      const children: any[] = []
      
      // Title Page
      children.push(new Paragraph({ text: book.title, heading: HeadingLevel.TITLE, alignment: 'center' }))
      if (book.subtitle) children.push(new Paragraph({ text: book.subtitle, alignment: 'center' }))
      children.push(new Paragraph({ text: `By ${book.authorName || 'Author'}`, alignment: 'center' }))
      children.push(new Paragraph({ text: '', pageBreakBefore: true }))

      // Front Matter
      book.frontMatter?.forEach(fm => {
        children.push(new Paragraph({ text: fm.type.replace(/_/g, ' '), heading: HeadingLevel.HEADING_1 }))
        children.push(new Paragraph({ text: stripHtml(fm.content || '') }))
        children.push(new Paragraph({ text: '', pageBreakBefore: true }))
      })

      // Chapters
      book.chapters?.forEach(ch => {
        children.push(new Paragraph({ text: ch.title, heading: HeadingLevel.HEADING_1 }))
        children.push(new Paragraph({ text: stripHtml(ch.content || '') }))
        children.push(new Paragraph({ text: '', pageBreakBefore: true }))
      })

      // Back Matter
      book.backMatter?.forEach(bm => {
        children.push(new Paragraph({ text: bm.type.replace(/_/g, ' '), heading: HeadingLevel.HEADING_1 }))
        children.push(new Paragraph({ text: stripHtml(bm.content || '') }))
        children.push(new Paragraph({ text: '', pageBreakBefore: true }))
      })

      const doc = new Document({ sections: [{ properties: {}, children }] })
      const buffer = await Packer.toBuffer(doc)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_')}.docx"`
        }
      })
    } 
    else if (format === 'epub') {
      const epubOptions = {
        title: book.title,
        author: book.authorName || 'Author',
        publisher: 'Dominion Writer',
        description: book.description || '',
        content: [] as { title: string, data: string }[]
      }

      // Add Front Matter
      book.frontMatter?.forEach(fm => {
        epubOptions.content.push({ title: fm.type.replace(/_/g, ' '), data: fm.content || '' })
      })

      // Add Chapters
      book.chapters?.forEach(ch => {
        epubOptions.content.push({ title: ch.title, data: ch.content || '' })
      })

      // Add Back Matter
      book.backMatter?.forEach(bm => {
        epubOptions.content.push({ title: bm.type.replace(/_/g, ' '), data: bm.content || '' })
      })

      const buffer = await Epub(epubOptions, [])
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/epub+zip',
          'Content-Disposition': `attachment; filename="${book.title.replace(/[^a-z0-9]/gi, '_')}.epub"`
        }
      })
    }
  } catch (error: any) {
    return new NextResponse(`Export failed: ${error.message}`, { status: 500 })
  }
}