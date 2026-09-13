import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { bookId, type, section, content, orderIndex, action, term } = await request.json()

    if (action === 'upsert-front') {
      const existing = await db.frontMatter.findFirst({ where: { bookId, type } })
      if (existing) {
        const updated = await db.frontMatter.update({ where: { id: existing.id }, data: { content, orderIndex } })
        return NextResponse.json(updated)
      }
      const created = await db.frontMatter.create({ data: { bookId, type, content, orderIndex } })
      return NextResponse.json(created)
    }

    if (action === 'upsert-back') {
      const existing = await db.backMatter.findFirst({ where: { bookId, type } })
      if (existing) {
        const updated = await db.backMatter.update({ where: { id: existing.id }, data: { content, orderIndex } })
        return NextResponse.json(updated)
      }
      const created = await db.backMatter.create({ data: { bookId, type, content, orderIndex } })
      return NextResponse.json(created)
    }

    if (action === 'add-glossary') {
      const maxOrder = await db.glossaryTerm.findFirst({ where: { bookId }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true } })
      const nextOrder = (maxOrder?.orderIndex ?? -1) + 1
      const newTerm = await db.glossaryTerm.create({ data: { bookId, term, definition: content, orderIndex: nextOrder } })
      return NextResponse.json(newTerm)
    }

    if (action === 'add-bibliography') {
      const maxOrder = await db.bibliographyEntry.findFirst({ where: { bookId }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true } })
      const nextOrder = (maxOrder?.orderIndex ?? -1) + 1
      const entry = await db.bibliographyEntry.create({ data: { bookId, citationText: content, format: type || 'apa', orderIndex: nextOrder } })
      return NextResponse.json(entry)
    }

    if (action === 'delete-glossary') {
      await db.glossaryTerm.delete({ where: { id: type } })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete-bibliography') {
      await db.bibliographyEntry.delete({ where: { id: type } })
      return NextResponse.json({ success: true })
    }

    if (action === 'update-format') {
      await db.book.update({ where: { id: bookId }, data: { bibliographyFormat: type } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}