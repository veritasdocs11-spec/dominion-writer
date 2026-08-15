import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function getEnvVar(key: string): string {
  if (process.env[key]) return process.env[key]!
  try {
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      for (const line of content.split('\n')) {
        const [k, ...v] = line.split('=')
        if (k && k.trim() === key) {
          return v.join('=').trim().replace(/^["']|["']$/g, '')
        }
      }
    }
  } catch {}
  return ''
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || getEnvVar('SUPABASE_URL')
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

const generateId = () => 'c' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)

export const db = {
  user: {
    async findUnique({ where }: { where: { email?: string; id?: string } }) {
      let query = supabase.from('User').select('*')
      if (where.email) query = query.eq('email', where.email)
      if (where.id) query = query.eq('id', where.id)
      const { data, error } = await query.single()
      if (error || !data) return null
      return data
    },
    async findMany({ orderBy }: { orderBy?: { createdAt?: 'asc' | 'desc' } } = {}) {
      let query = supabase.from('User').select('*')
      if (orderBy?.createdAt) {
        query = query.order('createdAt', { ascending: orderBy.createdAt === 'asc' })
      } else {
        query = query.order('createdAt', { ascending: false })
      }
      const { data, error } = await query
      if (error) return []
      return data || []
    },
    async create({ data }: { data: { email: string; fullName?: string | null; passwordHash?: string | null; role?: string; isAdmin?: boolean; planActive?: boolean; planType?: string; ageConfirmed?: boolean } }) {
      const newUser = {
        id: generateId(),
        email: data.email,
        fullName: data.fullName ?? null,
        passwordHash: data.passwordHash ?? null,
        role: data.role ?? 'USER',
        isAdmin: data.isAdmin ?? false,
        planActive: data.planActive ?? false,
        planType: data.planType ?? 'free',
        ageConfirmed: data.ageConfirmed ?? true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const { data: created, error } = await supabase.from('User').insert(newUser).select().single()
      if (error) throw new Error(error.message)
      return created
    },
    async update({ where, data }: { where: { id?: string; email?: string }; data: any }) {
      const updateData = { ...data, updatedAt: new Date().toISOString() }
      let query = supabase.from('User').update(updateData)
      if (where.id) query = query.eq('id', where.id)
      if (where.email) query = query.eq('email', where.email)
      const { data: updated, error } = await query.select().single()
      if (error) throw new Error(error.message)
      return updated
    },
    async delete({ where }: { where: { id: string } }) {
      const { error } = await supabase.from('User').delete().eq('id', where.id)
      if (error) throw new Error(error.message)
      return { success: true }
    },
    async count() {
      const { count, error } = await supabase.from('User').select('*', { count: 'exact', head: true })
      if (error) return 0
      return count || 0
    },
  },

  siteSettings: {
    async get() {
      const { data, error } = await supabase.from('SiteSettings').select('*').eq('id', 'default').single()
      if (error || !data) {
        return {
          id: 'default',
          stripeSecretKey: '',
          stripePublishableKey: '',
          stripeWebhookSecret: '',
          stripeMode: 'test',
          currency: 'usd',
          lifetimePrice: 99,
          monthlyPrice: 19,
          annualPrice: 149,
          lifetimePriceId: '',
          monthlyPriceId: '',
          annualPriceId: '',
          enableStripeCheckout: true,
          platformName: 'Dominion Writer',
          supportEmail: 'support@veritasdocs.com',
          defaultAiModel: 'gpt-4o',
          fallbackAiApiKey: '',
          maintenanceMode: false,
          announcementBanner: '',
        }
      }
      return data
    },
    async update({ data }: { data: any }) {
      const updatePayload = { ...data, updatedAt: new Date().toISOString() }
      const { data: updated, error } = await supabase
        .from('SiteSettings')
        .upsert({ id: 'default', ...updatePayload })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return updated
    },
  },

  plan: {
    async findMany() {
      const { data, error } = await supabase.from('Plan').select('*').order('price', { ascending: true })
      if (error || !data || data.length === 0) {
        return [
          {
            id: 'plan_lifetime',
            name: 'Lifetime Access',
            slug: 'lifetime',
            price: 99,
            interval: 'one-time',
            stripePriceId: '',
            description: 'One-time payment for unlimited AI writing and publishing forever.',
            features: ['Unlimited AI writing assistance', 'Advanced formatting & export tools', 'Export to EPUB, PDF, and DOCX', 'Priority email support', 'Access to all future features', 'Commercial rights included'],
            isActive: true,
            isPopular: true,
          },
          {
            id: 'plan_monthly',
            name: 'Pro Monthly',
            slug: 'monthly',
            price: 19,
            interval: 'month',
            stripePriceId: '',
            description: 'Full AI writing platform billed month-to-month.',
            features: ['Unlimited AI book drafting', 'Chapter and book management', 'EPUB and PDF exports', 'Custom API key support', 'Standard customer support'],
            isActive: true,
            isPopular: false,
          },
          {
            id: 'plan_annual',
            name: 'Pro Annual',
            slug: 'annual',
            price: 149,
            interval: 'year',
            stripePriceId: '',
            description: 'Save 35% with annual billing. Ideal for prolific authors.',
            features: ['Everything in Pro Monthly', '2 months free', 'Priority AI generation speed', 'Custom font & styling engines', 'VIP publishing assistance'],
            isActive: true,
            isPopular: false,
          },
        ]
      }
      return data
    },
    async update({ where, data }: { where: { id: string }; data: any }) {
      const updateData = { ...data, updatedAt: new Date().toISOString() }
      const { data: updated, error } = await supabase.from('Plan').update(updateData).eq('id', where.id).select().single()
      if (error) throw new Error(error.message)
      return updated
    },
  },

  auditLog: {
    async findMany({ limit = 50 }: { limit?: number } = {}) {
      const { data, error } = await supabase.from('AuditLog').select('*').order('createdAt', { ascending: false }).limit(limit)
      if (error) return []
      return data || []
    },
    async create({ data }: { data: { action: string; performedBy: string; targetId?: string | null; details?: string | null } }) {
      const newLog = {
        id: generateId(),
        action: data.action,
        performedBy: data.performedBy,
        targetId: data.targetId ?? null,
        details: data.details ?? null,
        createdAt: new Date().toISOString(),
      }
      const { data: created, error } = await supabase.from('AuditLog').insert(newLog).select().single()
      if (error) console.error('AuditLog insert error:', error)
      return created
    },
  },

  transaction: {
    async findMany({ limit = 50 }: { limit?: number } = {}) {
      const { data, error } = await supabase.from('Transaction').select('*').order('createdAt', { ascending: false }).limit(limit)
      if (error) return []
      return data || []
    },
    async create({ data }: { data: { userId?: string; userEmail: string; amount: number; currency?: string; planType?: string; stripeSessionId?: string; stripePaymentIntentId?: string } }) {
      const newTx = {
        id: generateId(),
        userId: data.userId ?? null,
        userEmail: data.userEmail,
        amount: data.amount,
        currency: data.currency ?? 'usd',
        status: 'succeeded',
        planType: data.planType ?? 'lifetime',
        stripeSessionId: data.stripeSessionId ?? null,
        stripePaymentIntentId: data.stripePaymentIntentId ?? null,
        createdAt: new Date().toISOString(),
      }
      const { data: created, error } = await supabase.from('Transaction').insert(newTx).select().single()
      if (error) console.error('Transaction insert error:', error)
      return created
    },
  },

  apiKey: {
    async findMany({ where, orderBy }: { where: { userId: string }; orderBy?: { createdAt?: 'asc' | 'desc' } }) {
      let query = supabase.from('ApiKey').select('*').eq('userId', where.userId)
      if (orderBy?.createdAt) {
        query = query.order('createdAt', { ascending: orderBy.createdAt === 'asc' })
      }
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data || []
    },
    async updateMany({ where, data }: { where: { userId: string; isDefault?: boolean }; data: { isDefault: boolean } }) {
      let query = supabase.from('ApiKey').update(data).eq('userId', where.userId)
      if (where.isDefault !== undefined) query = query.eq('isDefault', where.isDefault)
      const { error } = await query
      if (error) throw new Error(error.message)
      return { count: 1 }
    },
    async create({ data }: { data: { userId: string; provider: string; encryptedKey: string; label?: string | null; isDefault?: boolean } }) {
      const newKey = {
        id: generateId(),
        userId: data.userId,
        provider: data.provider,
        encryptedKey: data.encryptedKey,
        label: data.label ?? null,
        isDefault: data.isDefault ?? false,
        createdAt: new Date().toISOString(),
      }
      const { data: created, error } = await supabase.from('ApiKey').insert(newKey).select().single()
      if (error) throw new Error(error.message)
      return created
    },
    async update({ where, data }: { where: { id: string }; data: { isDefault?: boolean } }) {
      const { data: updated, error } = await supabase.from('ApiKey').update(data).eq('id', where.id).select().single()
      if (error) throw new Error(error.message)
      return updated
    },
    async delete({ where }: { where: { id: string } }) {
      const { error } = await supabase.from('ApiKey').delete().eq('id', where.id)
      if (error) throw new Error(error.message)
      return { success: true }
    },
    async count() {
      const { count, error } = await supabase.from('ApiKey').select('*', { count: 'exact', head: true })
      if (error) return 0
      return count || 0
    },
  },

  book: {
    async findMany({ where, orderBy, include }: {
      where?: { userId?: string }
      orderBy?: { updatedAt?: 'asc' | 'desc'; createdAt?: 'asc' | 'desc' }
      include?: { chapters?: { orderBy?: { orderIndex?: 'asc' | 'desc' } } }
    } = {}) {
      let query = supabase.from('Book').select('*')
      if (where?.userId) {
        query = query.eq('userId', where.userId)
      }
      if (orderBy?.updatedAt) {
        query = query.order('updatedAt', { ascending: orderBy.updatedAt === 'asc' })
      } else if (orderBy?.createdAt) {
        query = query.order('createdAt', { ascending: orderBy.createdAt === 'asc' })
      } else {
        query = query.order('updatedAt', { ascending: false })
      }
      const { data: books, error } = await query
      if (error) return []
      if (!books) return []

      if (include?.chapters) {
        for (const book of books) {
          const { data: chapters } = await supabase
            .from('Chapter')
            .select('*')
            .eq('bookId', book.id)
            .order('orderIndex', { ascending: true })
          book.chapters = chapters || []
        }
      }
      return books
    },
    async count({ where }: { where?: { userId?: string } } = {}) {
      let query = supabase.from('Book').select('*', { count: 'exact', head: true })
      if (where?.userId) {
        query = query.eq('userId', where.userId)
      }
      const { count, error } = await query
      if (error) return 0
      return count || 0
    },
    async findUnique({ where, include }: {
      where: { id: string }
      include?: {
        chapters?: { orderBy?: { orderIndex?: 'asc' | 'desc' } }
        frontMatter?: { orderBy?: { orderIndex?: 'asc' | 'desc' } }
        backMatter?: { orderBy?: { orderIndex?: 'asc' | 'desc' } }
        glossaryTerms?: { orderBy?: { orderIndex?: 'asc' | 'desc' } }
        bibliographyEntries?: { orderBy?: { orderIndex?: 'asc' | 'desc' } }
      }
    }) {
      const { data: book, error } = await supabase.from('Book').select('*').eq('id', where.id).single()
      if (error || !book) return null

      if (include?.chapters) {
        const { data: chapters } = await supabase.from('Chapter').select('*').eq('bookId', book.id).order('orderIndex', { ascending: true })
        book.chapters = chapters || []
      }
      if (include?.frontMatter) {
        const { data: frontMatter } = await supabase.from('FrontMatter').select('*').eq('bookId', book.id).order('orderIndex', { ascending: true })
        book.frontMatter = frontMatter || []
      }
      if (include?.backMatter) {
        const { data: backMatter } = await supabase.from('BackMatter').select('*').eq('bookId', book.id).order('orderIndex', { ascending: true })
        book.backMatter = backMatter || []
      }
      if (include?.glossaryTerms) {
        const { data: glossaryTerms } = await supabase.from('GlossaryTerm').select('*').eq('bookId', book.id).order('orderIndex', { ascending: true })
        book.glossaryTerms = glossaryTerms || []
      }
      if (include?.bibliographyEntries) {
        const { data: bibliographyEntries } = await supabase.from('BibliographyEntry').select('*').eq('bookId', book.id).order('orderIndex', { ascending: true })
        book.bibliographyEntries = bibliographyEntries || []
      }

      return book
    },
    async create({ data }: {
      data: {
        userId: string
        title: string
        subtitle?: string | null
        authorName?: string | null
        bookType?: string
        style?: string
        styleOtherText?: string | null
        language?: string
        wordCountTarget?: number | null
        description?: string | null
        bibliographyFormat?: string
      }
    }) {
      const newBook = {
        id: generateId(),
        userId: data.userId,
        title: data.title,
        subtitle: data.subtitle ?? null,
        authorName: data.authorName ?? null,
        bookType: data.bookType ?? 'fiction',
        style: data.style ?? 'professional',
        styleOtherText: data.styleOtherText ?? null,
        language: data.language ?? 'English',
        wordCountTarget: data.wordCountTarget ?? null,
        description: data.description ?? null,
        coverUrl: null,
        status: 'draft',
        bibliographyFormat: data.bibliographyFormat ?? 'none',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAutosavedAt: null,
      }
      const { data: created, error } = await supabase.from('Book').insert(newBook).select().single()
      if (error) throw new Error(error.message)
      return created
    },
    async update({ where, data }: { where: { id: string }; data: any }) {
      const updateData = { ...data }
      if (updateData.updatedAt instanceof Date) updateData.updatedAt = updateData.updatedAt.toISOString()
      if (updateData.lastAutosavedAt instanceof Date) updateData.lastAutosavedAt = updateData.lastAutosavedAt.toISOString()

      const { data: updated, error } = await supabase.from('Book').update(updateData).eq('id', where.id).select().single()
      if (error) throw new Error(error.message)
      return updated
    },
    async delete({ where }: { where: { id: string } }) {
      // Cascade delete chapters, frontMatter, backMatter, glossary, bibliography
      await supabase.from('Chapter').delete().eq('bookId', where.id)
      await supabase.from('FrontMatter').delete().eq('bookId', where.id)
      await supabase.from('BackMatter').delete().eq('bookId', where.id)
      await supabase.from('GlossaryTerm').delete().eq('bookId', where.id)
      await supabase.from('BibliographyEntry').delete().eq('bookId', where.id)
      const { error } = await supabase.from('Book').delete().eq('id', where.id)
      if (error) throw new Error(error.message)
      return { success: true }
    },
  },

  chapter: {
    async findFirst({ where, orderBy }: { where: { bookId: string }; orderBy?: { orderIndex?: 'asc' | 'desc' }; select?: { orderIndex: boolean } }) {
      let query = supabase.from('Chapter').select('*').eq('bookId', where.bookId)
      if (orderBy?.orderIndex) {
        query = query.order('orderIndex', { ascending: orderBy.orderIndex === 'asc' })
      }
      const { data } = await query.limit(1)
      return data && data.length > 0 ? data[0] : null
    },
    async count() {
      const { count, error } = await supabase.from('Chapter').select('*', { count: 'exact', head: true })
      if (error) return 0
      return count || 0
    },
    async create({ data }: { data: { bookId: string; title: string; content?: string; orderIndex: number } }) {
      const newChapter = {
        id: generateId(),
        bookId: data.bookId,
        title: data.title,
        content: data.content ?? '',
        orderIndex: data.orderIndex,
        wordCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const { data: created, error } = await supabase.from('Chapter').insert(newChapter).select().single()
      if (error) throw new Error(error.message)
      return created
    },
    async update({ where, data }: { where: { id: string }; data: any }) {
      const updateData = { ...data }
      if (updateData.updatedAt instanceof Date) updateData.updatedAt = updateData.updatedAt.toISOString()

      const { data: updated, error } = await supabase.from('Chapter').update(updateData).eq('id', where.id).select().single()
      if (error) throw new Error(error.message)
      return updated
    },
    async delete({ where }: { where: { id: string } }) {
      const { error } = await supabase.from('Chapter').delete().eq('id', where.id)
      if (error) throw new Error(error.message)
      return { success: true }
    },
  },

  frontMatter: {
    async findFirst({ where }: { where: { bookId: string; type: string } }) {
      const { data } = await supabase.from('FrontMatter').select('*').eq('bookId', where.bookId).eq('type', where.type).limit(1)
      return data && data.length > 0 ? data[0] : null
    },
    async create({ data }: { data: { bookId: string; type: string; content: string; orderIndex?: number } }) {
      const newItem = {
        id: generateId(),
        bookId: data.bookId,
        type: data.type,
        content: data.content,
        orderIndex: data.orderIndex ?? 0,
      }
      const { data: created, error } = await supabase.from('FrontMatter').insert(newItem).select().single()
      if (error) throw new Error(error.message)
      return created
    },
    async update({ where, data }: { where: { id: string }; data: any }) {
      const { data: updated, error } = await supabase.from('FrontMatter').update(data).eq('id', where.id).select().single()
      if (error) throw new Error(error.message)
      return updated
    },
  },

  backMatter: {
    async findFirst({ where }: { where: { bookId: string; type: string } }) {
      const { data } = await supabase.from('BackMatter').select('*').eq('bookId', where.bookId).eq('type', where.type).limit(1)
      return data && data.length > 0 ? data[0] : null
    },
    async create({ data }: { data: { bookId: string; type: string; content: string; orderIndex?: number } }) {
      const newItem = {
        id: generateId(),
        bookId: data.bookId,
        type: data.type,
        content: data.content,
        orderIndex: data.orderIndex ?? 0,
      }
      const { data: created, error } = await supabase.from('BackMatter').insert(newItem).select().single()
      if (error) throw new Error(error.message)
      return created
    },
    async update({ where, data }: { where: { id: string }; data: any }) {
      const { data: updated, error } = await supabase.from('BackMatter').update(data).eq('id', where.id).select().single()
      if (error) throw new Error(error.message)
      return updated
    },
  },

  glossaryTerm: {
    async findFirst({ where, orderBy }: { where: { bookId: string }; orderBy?: { orderIndex?: 'asc' | 'desc' }; select?: { orderIndex: boolean } }) {
      let query = supabase.from('GlossaryTerm').select('*').eq('bookId', where.bookId)
      if (orderBy?.orderIndex) {
        query = query.order('orderIndex', { ascending: orderBy.orderIndex === 'asc' })
      }
      const { data } = await query.limit(1)
      return data && data.length > 0 ? data[0] : null
    },
    async create({ data }: { data: { bookId: string; term: string; definition: string; orderIndex?: number } }) {
      const newItem = {
        id: generateId(),
        bookId: data.bookId,
        term: data.term,
        definition: data.definition,
        orderIndex: data.orderIndex ?? 0,
      }
      const { data: created, error } = await supabase.from('GlossaryTerm').insert(newItem).select().single()
      if (error) throw new Error(error.message)
      return created
    },
    async delete({ where }: { where: { id: string } }) {
      const { error } = await supabase.from('GlossaryTerm').delete().eq('id', where.id)
      if (error) throw new Error(error.message)
      return { success: true }
    },
  },

  bibliographyEntry: {
    async findFirst({ where, orderBy }: { where: { bookId: string }; orderBy?: { orderIndex?: 'asc' | 'desc' }; select?: { orderIndex: boolean } }) {
      let query = supabase.from('BibliographyEntry').select('*').eq('bookId', where.bookId)
      if (orderBy?.orderIndex) {
        query = query.order('orderIndex', { ascending: orderBy.orderIndex === 'asc' })
      }
      const { data } = await query.limit(1)
      return data && data.length > 0 ? data[0] : null
    },
    async create({ data }: { data: { bookId: string; citationText: string; format: string; orderIndex?: number } }) {
      const newItem = {
        id: generateId(),
        bookId: data.bookId,
        citationText: data.citationText,
        format: data.format,
        orderIndex: data.orderIndex ?? 0,
      }
      const { data: created, error } = await supabase.from('BibliographyEntry').insert(newItem).select().single()
      if (error) throw new Error(error.message)
      return created
    },
    async delete({ where }: { where: { id: string } }) {
      const { error } = await supabase.from('BibliographyEntry').delete().eq('id', where.id)
      if (error) throw new Error(error.message)
      return { success: true }
    },
  },

  exportHistory: {
    async create({ data }: { data: { bookId: string; format: string; createdAt?: Date } }) {
      const newItem = {
        id: generateId(),
        bookId: data.bookId,
        format: data.format,
        createdAt: (data.createdAt || new Date()).toISOString(),
      }
      const { data: created, error } = await supabase.from('ExportHistory').insert(newItem).select().single()
      if (error) throw new Error(error.message)
      return created
    },
    async count() {
      const { count, error } = await supabase.from('ExportHistory').select('*', { count: 'exact', head: true })
      if (error) return 0
      return count || 0
    },
  },
}