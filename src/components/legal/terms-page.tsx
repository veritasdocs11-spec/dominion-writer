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

/**
 * Sections that should render their comma-separated items as bullet lists.
 */
const BULLET_SECTIONS = new Set(['4', '5', '6', '7', '9', '10', '15'])

function renderBulletedText(text: string) {
  // Sections like "4" start with an intro then "No refunds..." items
  // Sections like "7" have "This includes, but is not limited to:" then items
  // Sections like "9" have "You may not:" then items

  // Pattern 1: "You may not:" or "Users are solely responsible for:" followed by items
  const mayNotMatch = text.match(/^(.*(?:may not|responsible for|includes, but is not limited to|shall not be liable for|accounts that|liable for unauthorized access resulting from|to the maximum extent|to defend, indemnify)[^:]*:)\s*([\s\S]*)$/i)

  // Pattern 2: "By completing your purchase, you expressly acknowledge and agree that:" then items ending with a period sentence
  const acknowledgeMatch = text.match(/^(.*acknowledge and agree that:)\s*([\s\S]*)$/i)

  let intro = ''
  let body = ''

  if (mayNotMatch) {
    intro = mayNotMatch[1]
    body = mayNotMatch[2]
  } else if (acknowledgeMatch) {
    intro = acknowledgeMatch[1]
    body = acknowledgeMatch[2]
  }

  if (!intro) {
    // Fallback: try to split on a colon that precedes capitalized list items
    const colonSplit = text.match(/^([\s\S]*?:)\s*([\s\S]+)$/)
    if (colonSplit) {
      const possibleBullets = colonSplit[2]
        .split(/,\s*(?=[A-Z])/)
        .map((b) => b.replace(/\.$/, '').trim())
        .filter(Boolean)
      if (possibleBullets.length >= 3) {
        return (
          <div>
            <p className="text-dw-text-muted leading-relaxed text-[0.95rem]">{colonSplit[1]}</p>
            <ul className="mt-2 ml-5 list-disc space-y-1 text-dw-text-muted text-[0.95rem]">
              {possibleBullets.map((b, i) => (
                <li key={i} className="leading-relaxed">{b}</li>
              ))}
            </ul>
          </div>
        )
      }
    }
    return (
      <p className="whitespace-pre-line text-dw-text-muted leading-relaxed text-[0.95rem]">
        {text}
      </p>
    )
  }

  // Split body into bullets — items are comma-separated and start with capital letters
  // Also handle trailing sentence (e.g., "Dominion Writer does not sell...")
  const sentences = body.match(/^[^.!?]+[.!?](?:\s|$)/g)
  const trailingSentence = body.replace(/^[^.!?]+[.!?](?:\s|$)/, '').trim()

  let bullets: string[] = []

  if (sentences && sentences.length >= 3) {
    bullets = sentences.map((s) => s.trim().replace(/\.$/, ''))
  } else {
    bullets = body
      .split(/,\s*(?=[A-Z])/)
      .map((b) => b.replace(/\.$/, '').trim())
      .filter(Boolean)
  }

  return (
    <div>
      <p className="text-dw-text-muted leading-relaxed text-[0.95rem]">{intro}</p>
      <ul className="mt-2 ml-5 list-disc space-y-1 text-dw-text-muted text-[0.95rem]">
        {bullets.map((b, i) => (
          <li key={i} className="leading-relaxed">{b}</li>
        ))}
      </ul>
      {trailingSentence && (
        <p className="mt-3 text-dw-text-muted leading-relaxed text-[0.95rem]">
          {trailingSentence}
        </p>
      )}
    </div>
  )
}

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
          {termsContent.sections.map((section) => {
            const isBullet = BULLET_SECTIONS.has(section.number)

            return (
              <section key={section.number} className="animate-slide-in" style={{ animationDelay: `${Number(section.number) * 30}ms`, animationFillMode: 'both' }}>
                <h2 className="text-xl font-semibold text-dw-text sm:text-2xl mb-4">
                  <span className="text-dw-accent-blue mr-2">{section.number}.</span>
                  {section.title}
                </h2>

                {isBullet ? (
                  renderBulletedText(section.text)
                ) : (
                  <p className="whitespace-pre-line text-dw-text-muted leading-relaxed text-[0.95rem]">
                    {section.text}
                  </p>
                )}
              </section>
            )
          })}
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