import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

  const books = await db.book.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { chapters: { orderBy: { orderIndex: 'asc' } } },
  })

  return NextResponse.json(books)
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { userId, title, subtitle, authorName, bookType, style, styleOtherText, language, wordCountTarget, description, bibliographyFormat } = data

    if (!userId || !title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || user.planType === 'free' || !user.planType) {
      const booksCount = await db.book.count({ where: { userId } })
      if (booksCount >= 1) {
        return NextResponse.json({ error: 'Free plan limit reached (1 book maximum). Please upgrade to create more books.' }, { status: 403 })
      }
    }

    const book = await db.book.create({
      data: {
        userId, title, subtitle, authorName, bookType: bookType || 'fiction',
        style: style || 'professional', styleOtherText, language: language || 'English',
        wordCountTarget: wordCountTarget || null, description, bibliographyFormat: bibliographyFormat || 'none',
      },
    })

    return NextResponse.json(book)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}