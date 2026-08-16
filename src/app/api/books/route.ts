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
    const { userId, title, subtitle, authorName, bookType, style, styleOtherText, language, wordCountTarget, description, bibliographyFormat, generateGlossary } = data

    if (!userId || !title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    let user = await db.user.findUnique({ where: { id: userId } })
    if (!user && userId.includes('@')) {
      user = await db.user.findUnique({ where: { email: userId } })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const actualUserId = user.id

    const apiKeys = await db.apiKey.findMany({ where: { userId: actualUserId } })
    const hasCustomApiKey = apiKeys.length > 0

    if (!user.isAdmin && !hasCustomApiKey && (user.planType === 'free' || !user.planType)) {
      const booksCount = await db.book.count({ where: { userId: actualUserId } })
      if (booksCount >= 1) {
        return NextResponse.json({ error: 'Free plan limit reached (1 book maximum). Please upgrade or add your own OpenAI API key to create unlimited books.' }, { status: 403 })
      }
    }

    const book = await db.book.create({
      data: {
        userId: actualUserId, title, subtitle, authorName, bookType: bookType || 'fiction',
        style: style || 'professional', styleOtherText, language: language || 'English',
        wordCountTarget: wordCountTarget || null, description, bibliographyFormat: bibliographyFormat || 'none',
      },
    })

    // Prepare parallel creation promises
    const creationPromises = []

    // Create Cover Page
    const prompt = `A professional book cover design for a ${bookType || 'fiction'} book titled "${title}". The text "${title}" must be clearly written on the cover. ${description ? `Theme: ${description.substring(0, 100)}` : ''} High quality, stunning artwork.`
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=1200&nologo=true`
    const coverHtml = `<h1 style="text-align: center">${title}</h1><h2 style="text-align: center; color: #666">${subtitle || ''}</h2><p style="text-align: center"><strong>By ${authorName || 'Author'}</strong></p><p style="text-align: center"><img src="${imageUrl}" alt="${title} Cover" style="max-width: 100%; border-radius: 8px;"/></p>`
    creationPromises.push(db.frontMatter.create({ data: { bookId: book.id, type: 'cover_page', content: coverHtml, orderIndex: 0 } }))

    // Create Title Page
    const titleHtml = `<div style="text-align: center; margin-top: 40px"><h1>${title}</h1><h2>${subtitle || ''}</h2><br/><br/><h3>By ${authorName || ''}</h3></div>`
    creationPromises.push(db.frontMatter.create({ data: { bookId: book.id, type: 'title_page', content: titleHtml, orderIndex: 1 } }))

    // Create Chapter 1
    creationPromises.push(db.chapter.create({ data: { bookId: book.id, title: 'Chapter 1', content: '<p>Start writing your first chapter here...</p>', orderIndex: 0 } }))

    // Create Back Cover (About the Author)
    const backPrompt = `A professional author portrait for a ${bookType || 'fiction'} book author named "${authorName || 'the author'}". Professional lighting, high quality, suitable for an 'About the Author' page.`
    const backImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(backPrompt)}?width=600&height=600&nologo=true`
    const backHtml = `<h2 style="text-align: center">About the Author</h2><p style="text-align: center"><img src="${backImageUrl}" alt="Author Portrait" style="max-width: 250px; border-radius: 50%; margin: 20px auto; display: block;"/></p><p style="text-align: center"><strong>${authorName || 'The Author'}</strong></p><p style="text-align: center">Use the AI "Auto-Write" or "Expand" feature to generate a detailed biography here.</p>`
    creationPromises.push(db.backMatter.create({ data: { bookId: book.id, type: 'back_cover', content: backHtml, orderIndex: 0 } }))

    if (generateGlossary) {
      creationPromises.push(db.glossaryTerm.create({ data: { bookId: book.id, term: 'Example Term', definition: 'This is an example definition.', orderIndex: 0 } }))
    }

    if (bibliographyFormat && bibliographyFormat !== 'none') {
      creationPromises.push(db.bibliographyEntry.create({ data: { bookId: book.id, citationText: 'Example Citation (2026). Title of Example Book.', format: bibliographyFormat, orderIndex: 0 } }))
    }

    // Execute all in parallel
    await Promise.all(creationPromises)

    return NextResponse.json(book)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}