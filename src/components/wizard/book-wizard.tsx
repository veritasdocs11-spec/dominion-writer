'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

const STYLES = ['Professional', 'Entertaining', 'Novel', 'Crime', 'Mystery', "Children's", 'Other']
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian', 'Dutch', 'Polish', 'Turkish', 'Vietnamese']

export function BookWizard() {
  const { data: session } = useSession()
  const { setView } = useAppStore()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const [form, setForm] = useState({
    authorName: '',
    bookType: 'fiction',
    style: 'Professional',
    styleOtherText: '',
    wordCountUnlimited: true,
    wordCountTarget: null as number | null,
    title: '',
    subtitle: '',
    language: 'English',
    description: '',
    bibliographyFormat: 'none',
  })

  const [suggestedTitles, setSuggestedTitles] = useState<{ title: string; subtitle: string }[]>([])

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

  const canProceed = () => {
    switch (step) {
      case 1: return form.authorName.trim().length > 0
      case 2: return form.style === 'Other' ? form.styleOtherText.trim().length > 0 : true
      case 3: return form.wordCountUnlimited ? true : (form.wordCountTarget !== null && form.wordCountTarget > 0)
      case 4: return form.title.trim().length > 0
      case 5: return form.language.trim().length > 0
      case 6: return true
      default: return true
    }
  }

  const suggestTitles = async () => {
    setAiLoading(true)
    try {
      const userId = (session?.user as any)?.id || session?.user?.email
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          prompt: `Suggest 5 creative book titles and subtitles for a ${form.style} ${form.bookType} book${form.authorName ? ` by ${form.authorName}` : ''}. Return ONLY a JSON array of objects with "title" and "subtitle" keys. No other text.`,
          task: 'suggest',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      try {
        const parsed = JSON.parse(data.content.replace(/```json\n?|```/g, '').trim())
        setSuggestedTitles(Array.isArray(parsed) ? parsed : [])
      } catch {
        setSuggestedTitles([])
        toast.error('Could not parse AI suggestions')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to get suggestions. Make sure you have an API key configured.')
    } finally {
      setAiLoading(false)
    }
  }

  const generateDescription = async () => {
    setAiLoading(true)
    try {
      const userId = (session?.user as any)?.id || session?.user?.email
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          prompt: `Write a compelling book description (2-3 paragraphs) for a ${form.style} ${form.bookType} book titled "${form.title}"${form.subtitle ? ` with subtitle "${form.subtitle}"` : ''}${form.authorName ? ` by ${form.authorName}` : ''}. The book is in ${form.language}. Write the description in ${form.language}. Do NOT use markdown formatting (no asterisks, no hash symbols). Output plain text only.`,
          task: 'draft',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      update('description', data.content)
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate description')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const userId = (session?.user as any)?.id || session?.user?.email
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: form.title,
          subtitle: form.subtitle || null,
          authorName: form.authorName,
          bookType: form.bookType,
          style: form.style === 'Other' ? 'other' : form.style.toLowerCase(),
          styleOtherText: form.style === 'Other' ? form.styleOtherText : null,
          language: form.language,
          wordCountTarget: form.wordCountUnlimited ? null : form.wordCountTarget,
          description: form.description || null,
          bibliographyFormat: form.bibliographyFormat,
        }),
      })
      if (res.ok) {
        toast.success('Book created successfully!')
        setView('dashboard')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create book')
      }
    } catch {
      toast.error('Failed to create book')
    } finally {
      setSubmitting(false)
    }
  }

  const steps = [
    { num: 1, label: 'Author & Type' },
    { num: 2, label: 'Style' },
    { num: 3, label: 'Word Count' },
    { num: 4, label: 'Title' },
    { num: 5, label: 'Language' },
    { num: 6, label: 'Description' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => step === 1 ? setView('dashboard') : setStep(s => s - 1)} className="text-[#94A3B8] hover:text-[#E2E8F0]">
          <ArrowLeft className="w-4 h-4 mr-2" /> {step === 1 ? 'Dashboard' : 'Back'}
        </Button>
        <span className="text-sm text-[#94A3B8]">Step {step} of 6</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center mb-10 gap-1">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
              step >= s.num ? 'gradient-btn text-white' : 'bg-[#1E293B] text-[#94A3B8]'
            }`}>
              {step > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 sm:w-12 h-0.5 mx-1 ${step > s.num ? 'bg-[#3B82F6]' : 'bg-[#1E293B]'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="glass-card p-6 sm:p-8">
        {/* Step 1: Author & Type */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold gradient-text mb-1">Author & Book Type</h2>
              <p className="text-[#94A3B8] text-sm">Tell us about the author and type of book.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorName" className="text-[#E2E8F0]">Author Name</Label>
              <Input id="authorName" value={form.authorName} onChange={e => update('authorName', e.target.value)} placeholder="Enter author name" className="bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569]" />
            </div>
            <div className="space-y-3">
              <Label className="text-[#E2E8F0]">Book Type</Label>
              <RadioGroup value={form.bookType} onValueChange={v => update('bookType', v)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fiction" id="fiction" />
                  <Label htmlFor="fiction" className="text-[#E2E8F0] cursor-pointer">Fiction</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non_fiction" id="nonfiction" />
                  <Label htmlFor="nonfiction" className="text-[#E2E8F0] cursor-pointer">Non-Fiction</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 2: Style */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold gradient-text mb-1">Writing Style</h2>
              <p className="text-[#94A3B8] text-sm">Choose the style that best fits your book.</p>
            </div>
            <RadioGroup value={form.style} onValueChange={v => update('style', v)} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STYLES.map(s => (
                <Label key={s} htmlFor={`style-${s}`} className={`flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                  form.style === s ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]' : 'border-[#1E293B] bg-[#0B0F19] text-[#94A3B8] hover:border-[#334155]'
                }`}>
                  <RadioGroupItem value={s} id={`style-${s}`} className="sr-only" />
                  <span className="text-sm font-medium">{s}</span>
                </Label>
              ))}
            </RadioGroup>
            {form.style === 'Other' && (
              <div className="space-y-2">
                <Label className="text-[#E2E8F0]">Describe your style</Label>
                <Input value={form.styleOtherText} onChange={e => update('styleOtherText', e.target.value)} placeholder="e.g., Literary Fiction, Satire..." className="bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569]" />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Word Count */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold gradient-text mb-1">Word Count Target</h2>
              <p className="text-[#94A3B8] text-sm">Set a target or write without limits.</p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border border-[#1E293B] bg-[#0B0F19]">
              <div>
                <p className="text-[#E2E8F0] font-medium">Unlimited</p>
                <p className="text-xs text-[#94A3B8]">No word count restrictions</p>
              </div>
              <Switch checked={form.wordCountUnlimited} onCheckedChange={v => update('wordCountUnlimited', v)} />
            </div>
            {!form.wordCountUnlimited && (
              <div className="space-y-2">
                <Label className="text-[#E2E8F0]">Target Word Count</Label>
                <Input type="number" value={form.wordCountTarget || ''} onChange={e => update('wordCountTarget', parseInt(e.target.value) || null)} placeholder="e.g., 80000" className="bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569]" />
                {form.wordCountTarget && (
                  <p className="text-xs text-[#94A3B8]">~{Math.round((form.wordCountTarget / 250))} pages (estimated at 250 words/page)</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Title */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold gradient-text mb-1">Title & Subtitle</h2>
              <p className="text-[#94A3B8] text-sm">Give your book a name, or let AI suggest one.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[#E2E8F0]">Title</Label>
              <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Enter your book title" className="bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#E2E8F0]">Subtitle <span className="text-[#94A3B8]">(optional)</span></Label>
              <Input value={form.subtitle} onChange={e => update('subtitle', e.target.value)} placeholder="Enter subtitle" className="bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569]" />
            </div>
            <Button variant="outline" onClick={suggestTitles} disabled={aiLoading} className="border-[#3B82F6]/50 text-[#3B82F6] hover:bg-[#3B82F6]/10">
              {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Suggest with AI
            </Button>
            {suggestedTitles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-[#94A3B8]">Click a suggestion to use it:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {suggestedTitles.map((s, i) => (
                    <button key={i} onClick={() => { update('title', s.title); update('subtitle', s.subtitle || ''); }} className="w-full text-left p-3 rounded-lg border border-[#1E293B] bg-[#0B0F19] hover:border-[#3B82F6]/50 transition-all">
                      <p className="text-[#E2E8F0] font-medium">{s.title}</p>
                      {s.subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{s.subtitle}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Language */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold gradient-text mb-1">Language</h2>
              <p className="text-[#94A3B8] text-sm">What language will your book be written in?</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[#E2E8F0]">Book Language</Label>
              <Input value={form.language} onChange={e => update('language', e.target.value)} placeholder="Type or select a language" className="bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569]" />
            </div>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <Badge key={lang} variant={form.language === lang ? 'default' : 'outline'} className={`cursor-pointer transition-all ${form.language === lang ? 'gradient-btn text-white border-0' : 'border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'}`} onClick={() => update('language', lang)}>
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Description */}
        {step === 6 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold gradient-text mb-1">Book Description</h2>
              <p className="text-[#94A3B8] text-sm">Describe your book or let AI generate one.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[#E2E8F0]">Description</Label>
              <Textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Write a description of your book..." rows={8} className="bg-[#1E293B] border-[#1E293B] text-[#E2E8F0] placeholder:text-[#475569] resize-y" />
            </div>
            <Button variant="outline" onClick={generateDescription} disabled={aiLoading} className="border-[#3B82F6]/50 text-[#3B82F6] hover:bg-[#3B82F6]/10">
              {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate with AI
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#1E293B]">
          <Button variant="ghost" onClick={() => step === 1 ? setView('dashboard') : setStep(s => s - 1)} className="text-[#94A3B8] hover:text-[#E2E8F0]" disabled={submitting}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          {step < 6 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed() || submitting} className="gradient-btn text-white">
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || aiLoading} className="gradient-btn text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Book
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
