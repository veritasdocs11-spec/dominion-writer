'use client'

import { useAppStore } from '@/store/app-store'
import { termsContent } from '@/lib/legal-content'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

type TermsSection = {
  number: string
  title: string
  text: string
}

// Helper functions removed

export function TermsPage() {
  const setView = useAppStore((s) => s.setView)

  return (
    <div className="animate-fade-in px-4 py-8 sm:px-6 md:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-8 text-dw-text-muted hover:text-dw-text hover:bg-dw-card"
          onClick={() => setView('landing')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        {/* Header */}
        <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl mb-4">
          <span className="gradient-text">{termsContent.title}</span>
        </h1>
        <div className="mb-10 flex flex-col gap-1 text-sm text-dw-text-muted sm:flex-row sm:gap-4">
          <span>Effective: {termsContent.effectiveDate}</span>
          <span className="hidden sm:inline" aria-hidden="true">&middot;</span>
          <span>Owner: {termsContent.owner}</span>
          <span className="hidden sm:inline" aria-hidden="true">&middot;</span>
          <span>Contact: {termsContent.contact}</span>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-10">
          {termsContent.sections.map((section) => (
            <section key={section.number} className="animate-slide-in" style={{ animationDelay: `${Number(section.number) * 30}ms`, animationFillMode: 'both' }}>
              <h2 className="text-xl font-semibold text-dw-text sm:text-2xl mb-4">
                <span className="text-dw-accent-blue mr-2">{section.number}.</span>
                {section.title}
              </h2>
              <p className="whitespace-pre-line text-dw-text-muted leading-relaxed text-[0.95rem]">
                {section.text}
              </p>
            </section>
          ))}
        </div>

        {/* Bottom back link */}
        <div className="mt-16 mb-8">
          <Button
            variant="ghost"
            className="text-dw-text-muted hover:text-dw-text hover:bg-dw-card"
            onClick={() => setView('landing')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}