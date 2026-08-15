'use client'

import { useAppStore } from '@/store/app-store'
import { useSession } from 'next-auth/react'
import {
  Key, Layers, Infinity, FileDown, BookOpen, PenTool,
  ArrowRight, UserPlus, LogIn, Sparkles, Star, Zap, Shield, Globe, Check,
} from 'lucide-react'

const features = [
  {
    icon: Key,
    title: 'BYO API Key',
    description: 'Bring your own AI provider API key. No credit limits, no hidden fees — you pay your AI provider directly for what you use.',
    gradient: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/15 border-blue-500/25',
  },
  {
    icon: Layers,
    title: 'Multi-Provider AI',
    description: 'Connect OpenAI, Anthropic, Google, DeepSeek and more simultaneously. Combine the strengths of different models.',
    gradient: 'from-purple-500/20 to-purple-600/10',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/15 border-purple-500/25',
  },
  {
    icon: Infinity,
    title: 'Lifetime Membership',
    description: 'Pay once, write forever. No subscriptions, no recurring charges. Your writing platform grows with you.',
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 border-emerald-500/25',
  },
  {
    icon: FileDown,
    title: 'Export to DOCX, PDF & EPUB',
    description: 'When your manuscript is ready, export it in professional formats ready for editors, publishers, or self-publishing.',
    gradient: 'from-amber-500/20 to-amber-600/10',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15 border-amber-500/25',
  },
  {
    icon: BookOpen,
    title: 'Book-Style Editor',
    description: 'A distraction-free, book-focused writing environment designed for long-form projects — not blog posts.',
    gradient: 'from-cyan-500/20 to-cyan-600/10',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/15 border-cyan-500/25',
  },
  {
    icon: PenTool,
    title: 'No Word Count Limits',
    description: 'Write as much as you need. No artificial caps on words, chapters, or projects. Your story sets the length.',
    gradient: 'from-rose-500/20 to-rose-600/10',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/15 border-rose-500/25',
  },
]

const steps = [
  {
    number: '01',
    title: 'Sign Up',
    description: 'Create your account in seconds. Choose the lifetime plan and get immediate access to the full platform.',
    icon: UserPlus,
  },
  {
    number: '02',
    title: 'Connect Your AI Key',
    description: 'Add your preferred AI provider API key. Use one provider or up to three working together in harmony.',
    icon: Key,
  },
  {
    number: '03',
    title: 'Start Writing',
    description: 'Open the book-style editor and bring your ideas to life. Write chapters, generate content, and export when ready.',
    icon: Sparkles,
  },
]

const stats = [
  { value: '∞', label: 'Word Limit', sublabel: 'Write without restrictions' },
  { value: '7+', label: 'AI Providers', sublabel: 'OpenAI, Gemini & more' },
  { value: '3', label: 'Export Formats', sublabel: 'DOCX, PDF & EPUB' },
  { value: '1×', label: 'Lifetime Price', sublabel: 'No recurring fees ever' },
]

export function LandingPage() {
  const setView = useAppStore((s) => s.setView)
  const { data: session } = useSession()

  return (
    <div className="flex flex-col overflow-hidden">

      {/* ───── Hero ───── */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-24 pb-32 md:pt-36 md:pb-44 text-center hero-mesh">

        {/* Layered background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(79,142,247,0.12) 0%, rgba(155,114,248,0.06) 50%, transparent 80%)' }}
          />
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px]"
            style={{ background: 'rgba(34,211,238,0.05)' }}
          />
          {/* Decorative orbs */}
          <div className="absolute top-16 right-16 w-4 h-4 rounded-full bg-blue-400/40 animate-pulse" />
          <div className="absolute bottom-24 left-24 w-3 h-3 rounded-full bg-purple-400/40 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-32 left-1/3 w-2 h-2 rounded-full bg-cyan-400/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-36 right-1/3 w-2 h-2 rounded-full bg-blue-300/40 animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Badge */}
        <div className="relative z-10 inline-flex items-center gap-2 mb-8 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium"
            style={{ background: 'rgba(79,142,247,0.1)', borderColor: 'rgba(79,142,247,0.25)', color: '#4F8EF7' }}>
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Book Writing Platform
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="relative z-10 max-w-5xl text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl animate-fade-in"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <span style={{ color: '#EEF2FF' }}>Your only </span>
          <span className="gradient-text">limitation</span>
          <br />
          <span style={{ color: '#EEF2FF' }}>is your </span>
          <span className="gradient-text">imagination</span>
        </h1>

        {/* Subheading */}
        <p className="relative z-10 mt-8 max-w-2xl text-lg leading-relaxed sm:text-xl md:text-2xl animate-fade-in"
          style={{ color: '#8899BB', animationDelay: '0.2s', animationFillMode: 'both' }}>
          Write without limits. Create without compromise. The AI writing platform that puts <strong style={{ color: '#EEF2FF', fontWeight: 600 }}>authors in control</strong>.
        </p>

        {/* CTAs */}
        <div className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          {session ? (
            <button
              onClick={() => setView('dashboard')}
              className="gradient-btn inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white rounded-xl"
            >
              <BookOpen className="w-5 h-5" />
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <div className="flex flex-col items-start">
                <button
                  onClick={() => setView('signup')}
                  className="gradient-btn inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white rounded-xl"
                >
                  <UserPlus className="w-5 h-5" />
                  Bring Your Own API Key & Try Free
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-[11px] mt-2 ml-1 text-dw-text-muted/80">
                  *Free plan limited to 1 book. Upgrade for unlimited built-in AI.
                </span>
              </div>
              <button
                onClick={() => setView('login')}
                className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl transition-all duration-300"
                style={{ background: 'rgba(26,37,64,0.5)', border: '1px solid rgba(79,142,247,0.2)', color: '#EEF2FF' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(79,142,247,0.1)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,142,247,0.4)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(26,37,64,0.5)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,142,247,0.2)'
                }}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            </>
          )}
        </div>

        {/* Social proof line */}
        <div className="relative z-10 mt-8 flex items-center gap-3 animate-fade-in"
          style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          <div className="flex -space-x-2">
            {['#4F8EF7','#9B72F8','#22D3EE','#4F8EF7'].map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{ background: c + '20', borderColor: c, color: c }}>
                {['A','B','C','D'][i]}
              </div>
            ))}
          </div>
          <span className="text-sm" style={{ color: '#8899BB' }}>
            Trusted by <strong style={{ color: '#EEF2FF' }}>authors worldwide</strong> — Owned by Mr. Nghia Nguyen
          </span>
        </div>

        {/* Stats row */}
        <div className="relative z-10 mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl animate-fade-in"
          style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <p className="text-3xl font-extrabold gradient-text-static">{stat.value}</p>
              <p className="text-sm font-semibold mt-1" style={{ color: '#EEF2FF' }}>{stat.label}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6677AA' }}>{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Features Grid ───── */}
      <section className="px-4 pb-28 md:pb-36">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ background: 'rgba(155,114,248,0.1)', borderColor: 'rgba(155,114,248,0.25)', color: '#9B72F8' }}>
              <Zap className="w-3 h-3" /> Features
            </div>
            <h2 className="text-3xl font-extrabold sm:text-5xl" style={{ color: '#EEF2FF' }}>
              Everything You Need to{' '}
              <span className="gradient-text">Write Your Book</span>
            </h2>
            <p className="mt-5 max-w-2xl mx-auto text-lg" style={{ color: '#8899BB' }}>
              A platform designed for authors who refuse to be limited by credit systems, subscriptions, or restrictive software.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="feature-card p-6 animate-slide-in"
                style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }}
              >
                <div className={`feature-icon-wrap mb-5 ${feature.iconBg} border`}>
                  <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold mb-2.5" style={{ color: '#EEF2FF' }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8899BB' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section className="px-4 pb-28 md:pb-36">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ background: 'rgba(34,211,238,0.08)', borderColor: 'rgba(34,211,238,0.2)', color: '#22D3EE' }}>
              <Globe className="w-3 h-3" /> How It Works
            </div>
            <h2 className="text-3xl font-extrabold sm:text-5xl" style={{ color: '#EEF2FF' }}>
              Up and Running in{' '}
              <span className="gradient-text">Minutes</span>
            </h2>
            <p className="mt-5 text-lg" style={{ color: '#8899BB' }}>
              Three simple steps to start writing your book.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 relative">
            {/* Connector */}
            <div className="absolute top-12 left-1/3 right-1/3 h-px hidden md:block"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(79,142,247,0.4), rgba(155,114,248,0.4), transparent)' }} />

            {steps.map((step, idx) => (
              <div
                key={step.number}
                className="step-card p-7 text-center animate-fade-in"
                style={{ animationDelay: `${idx * 120}ms`, animationFillMode: 'both' }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 mx-auto"
                  style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.2)' }}>
                  <span className="text-2xl font-extrabold gradient-text-static">{step.number}</span>
                </div>
                <step.icon className="w-5 h-5 mx-auto mb-3" style={{ color: '#4F8EF7' }} />
                <h3 className="text-lg font-bold mb-3" style={{ color: '#EEF2FF' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8899BB' }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Pricing CTA ───── */}
      <section className="px-4 pb-32 md:pb-40">
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-3xl p-px"
            style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.5), rgba(155,114,248,0.5), rgba(34,211,238,0.3))' }}>
            <div className="rounded-[calc(1.5rem-1px)] p-10 md:p-14 text-center"
              style={{ background: 'linear-gradient(145deg, rgba(15,24,37,0.98), rgba(8,12,20,0.98))' }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-widest mb-6"
                style={{ background: 'rgba(79,142,247,0.1)', borderColor: 'rgba(79,142,247,0.25)', color: '#4F8EF7' }}>
                <Star className="w-3 h-3 fill-current" /> Lifetime Access
              </div>
              <h2 className="text-4xl font-extrabold sm:text-5xl mb-4" style={{ color: '#EEF2FF' }}>
                Write Forever,<br />Pay <span className="gradient-text">Once</span>
              </h2>
              <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: '#8899BB' }}>
                No subscriptions. No credit systems. No hidden fees. Get lifetime access and full control over your AI writing tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                {['All AI providers supported', 'Unlimited books & chapters', 'DOCX, PDF & EPUB export'].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm" style={{ color: '#8899BB' }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(79,142,247,0.2)', border: '1px solid rgba(79,142,247,0.4)' }}>
                      <Check className="w-2.5 h-2.5 text-blue-400" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <a
                href="/pricing"
                className="gradient-btn inline-flex items-center gap-2 mt-10 px-10 py-4 text-lg font-semibold text-white rounded-xl"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}