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

    // Check user plan and API keys
    const apiKeys = await db.apiKey.findMany({ where: { userId: actualUserId } })
    const hasCustomApiKey = apiKeys.length > 0
    const isLifetime = user.planActive || user.planType === 'lifetime' || user.isAdmin

    if (!isLifetime) {
      // Free plan: Must have own API key, and limited to 1 book per month
      const userBooks = await db.book.findMany({ where: { userId: actualUserId } })
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      
      const createdThisMonth = userBooks.filter((b: any) => {
        const d = new Date(b.createdAt)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })

      if (createdThisMonth.length >= 1) {
        return NextResponse.json({ 
          error: 'Free plan limit reached: You can only create 1 book per month for free with your own API key. Upgrade to the Lifetime Plan for $99 USD to unlock unlimited books forever!' 
        }, { status: 403 })
      }
    }

    const book = await db.book.create({
      data: {
        userId: actualUserId, title, subtitle, authorName: authorName || 'Author', bookType: bookType || 'fiction',
        style: style || 'professional', styleOtherText, language: language || 'English',
        wordCountTarget: wordCountTarget || null, description, bibliographyFormat: bibliographyFormat || 'apa',
      },
    })

    const creationPromises: Promise<any>[] = []

    // 1. Cover Page - Elegant typography book cover (no weird AI artifacts)
    const coverHtml = `
      <div style="border: 4px double #4A5568; border-radius: 8px; padding: 48px 24px; text-align: center; margin: 20px auto; max-width: 580px; min-height: 720px; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="margin-top: 40px;">
          <p style="font-size: 12pt; letter-spacing: 4px; text-transform: uppercase; color: #718096; margin-bottom: 24px;">Dominion Edition</p>
          <h1 style="font-size: 32pt; font-weight: 800; line-height: 1.2; margin-bottom: 12px; font-family: 'Georgia', serif;">${title}</h1>
          ${subtitle ? `<h2 style="font-size: 16pt; font-weight: normal; font-style: italic; color: #718096; margin-top: 8px;">${subtitle}</h2>` : ''}
        </div>
        <div style="margin-top: 60px; margin-bottom: 40px;">
          <div style="width: 60px; height: 2px; background: #CBD5E1; margin: 0 auto 30px auto;"></div>
          <p style="font-size: 12pt; letter-spacing: 2px; text-transform: uppercase; color: #718096;">A Novel By</p>
          <p style="font-size: 20pt; font-weight: 600; margin-top: 8px; font-family: 'Georgia', serif;">${authorName || 'Author'}</p>
        </div>
        <div style="font-size: 10pt; letter-spacing: 2px; text-transform: uppercase; color: #A0AEC0;">
          Dominion Writer Publishing
        </div>
      </div>
    `
    creationPromises.push(db.frontMatter.create({ data: { bookId: book.id, type: 'cover_page', content: coverHtml, orderIndex: 0 } }))

    // 2. Half-Title Page (KDP Standard: book title only on right-facing page)
    const halfTitleHtml = `
      <div style="text-align: center; padding-top: 180px;">
        <h1 style="font-size: 22pt; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; font-family: 'Georgia', serif;">${title}</h1>
      </div>
    `
    creationPromises.push(db.frontMatter.create({ data: { bookId: book.id, type: 'half_title', content: halfTitleHtml, orderIndex: 1 } }))

    // 3. Title Page (KDP Standard: title, subtitle, author, publisher)
    const titleHtml = `
      <div style="text-align: center; padding-top: 140px;">
        <h1 style="font-size: 28pt; font-weight: bold; margin-bottom: 12px; font-family: 'Georgia', serif;">${title}</h1>
        ${subtitle ? `<h2 style="font-size: 16pt; font-style: italic; font-weight: normal; color: #4A5568; margin-bottom: 40px;">${subtitle}</h2>` : '<div style="margin-bottom: 40px;"></div>'}
        <p style="font-size: 14pt; margin-top: 40px; font-family: 'Georgia', serif;">${authorName || 'Author'}</p>
        <div style="margin-top: 120px; font-size: 11pt; color: #718096; letter-spacing: 1px;">
          <p>DOMINION WRITER PRESS</p>
        </div>
      </div>
    `
    creationPromises.push(db.frontMatter.create({ data: { bookId: book.id, type: 'title_page', content: titleHtml, orderIndex: 2 } }))

    // 4. Copyright Page (KDP Standard: first left-facing page after Title)
    const year = new Date().getFullYear()
    const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const copyrightHtml = `
      <div style="max-width: 520px; margin: 40px auto; font-size: 10.5pt; line-height: 1.8; font-family: 'Georgia', serif;">
        <p><strong>${title}</strong></p>
        ${subtitle ? `<p><em>${subtitle}</em></p>` : ''}
        <p style="margin-top: 24px;">Copyright &copy; ${year} by ${authorName || 'Author'}.</p>
        <p>All rights reserved.</p>
        <p style="margin-top: 20px; text-align: justify;">No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.</p>
        <p style="margin-top: 20px;">Published by <strong>Dominion Writer</strong></p>
        <p>Website: www.dominionwriter.com</p>
        <p>Inquiries: admin@dominionwriter.com</p>
        <p style="margin-top: 20px;">First Edition: ${monthYear}</p>
        <p>Printed in the United States of America</p>
      </div>
    `
    creationPromises.push(db.frontMatter.create({ data: { bookId: book.id, type: 'copyright_page', content: copyrightHtml, orderIndex: 3 } }))

    // 5. Dedication Page
    const dedicationHtml = `
      <div style="text-align: center; padding-top: 180px; font-style: italic; font-family: 'Georgia', serif;">
        <p style="font-size: 13pt; line-height: 2;">For those who write without limits,<br/>and create without compromise.</p>
      </div>
    `
    creationPromises.push(db.frontMatter.create({ data: { bookId: book.id, type: 'dedication', content: dedicationHtml, orderIndex: 4 } }))

    // 6. Chapter 1
    creationPromises.push(db.chapter.create({ 
      data: { 
        bookId: book.id, 
        title: 'Chapter 1: The Beginning', 
        content: '<p>Start writing your first chapter here... or click on "Auto-Write Full Book" at the top to generate the entire manuscript according to your target word count.</p>', 
        orderIndex: 0 
      } 
    }))

    // 7. Back Matter - About the Author
    const authorBioHtml = `
      <div style="max-width: 580px; margin: 40px auto; font-family: 'Georgia', serif;">
        <h2 style="font-size: 20pt; text-align: center; margin-bottom: 24px;">About the Author</h2>
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 140px; height: 140px; border-radius: 50%; border: 2px dashed #CBD5E1; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center; color: #94A3B8; font-size: 11pt;">
            Author Photo
          </div>
        </div>
        <p style="text-align: justify; line-height: 1.8; margin-bottom: 16px;">
          <strong>${authorName || 'The author'}</strong> is a writer and creator whose work explores compelling themes, thoughtful storytelling, and inspiring narratives.
        </p>
        <p style="text-align: justify; line-height: 1.8;">
          You can customize this author biography or use the AI writing assistant to expand on your background, achievements, and other published works.
        </p>
      </div>
    `
    creationPromises.push(db.backMatter.create({ data: { bookId: book.id, type: 'about_author', content: authorBioHtml, orderIndex: 0 } }))

    // 8. Back Cover Blurb
    const backCoverHtml = `
      <div style="border: 2px solid #CBD5E1; border-radius: 8px; padding: 40px 30px; max-width: 540px; margin: 40px auto; font-family: 'Georgia', serif;">
        <h2 style="font-size: 18pt; text-align: center; margin-bottom: 20px;">${title}</h2>
        <p style="text-align: justify; line-height: 1.8; margin-bottom: 20px;">
          ${description || 'An inspiring and beautifully crafted book that captivates readers from the first page to the last. Discover a world of profound insight, memorable characters, and unforgettable ideas.'}
        </p>
        <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center; font-size: 10pt; color: #718096;">
          <p>DOMINION WRITER &bull; WWW.DOMINIONWRITER.COM</p>
        </div>
      </div>
    `
    creationPromises.push(db.backMatter.create({ data: { bookId: book.id, type: 'back_cover', content: backCoverHtml, orderIndex: 1 } }))

    // 9. Optional Glossary
    if (generateGlossary) {
      creationPromises.push(db.glossaryTerm.create({ data: { bookId: book.id, term: 'Protagonist', definition: 'The principal character in a literary work.', orderIndex: 0 } }))
    }

    // 10. Sample Bibliography conforming to selected style
    const bibFmt = bibliographyFormat || 'apa'
    const sampleCitations: Record<string, string> = {
      apa: 'Mollick, E. (2024). Co-Intelligence: Living and Working with AI. Portfolio.',
      mla: 'Mollick, Ethan. Co-Intelligence: Living and Working with AI. Portfolio, 2024.',
      harvard: 'Stern, N. 2024, The Economics of the Great Transition, Cambridge University Press, Cambridge.',
      chicago: 'Gauthier, Pierre. Urban Planning in Paris in the 19th Century. Paris: Éditions de la Sorbonne, 2023.',
      iso690: 'GAUTIER, Pierre, 2024. The challenges of solar energy in France. 2nd ed. Paris: Dunod.',
      abnt: 'GAUTIER, Pierre. The challenges of solar energy in France. 2. ed. Paris: Dunod, 2024.',
    }
    const initialCite = sampleCitations[bibFmt] || sampleCitations.apa
    creationPromises.push(db.bibliographyEntry.create({ 
      data: { bookId: book.id, citationText: initialCite, format: bibFmt, orderIndex: 0 } 
    }))

    await Promise.all(creationPromises)

    return NextResponse.json(book)
  } catch (error: any) {
    console.error('Error creating book:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}