'use client'

import { useAppStore } from '@/store/app-store'
import { useSession } from 'next-auth/react'
import { BookOpen, Mail, ArrowUpRight } from 'lucide-react'

export function Footer() {
  const setView = useAppStore((s) => s.setView)
  const { data: session } = useSession()

  return (
    <footer className="w-full mt-auto" style={{ background: '#050810', borderTop: '1px solid rgba(26,37,64,0.6)' }}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.2), rgba(155,114,248,0.2))', border: '1px solid rgba(79,142,247,0.3)' }}>
                <BookOpen className="w-4 h-4" style={{ color: '#4F8EF7' }} />
              </div>
              <span className="text-base font-bold" style={{ fontFamily: "'Outfit', sans-serif", color: '#EEF2FF' }}>
                Dominion <span className="gradient-text-static">Writer</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#6677AA' }}>
              Write Without Limits. Create Without Compromise. An AI-powered book writing platform that puts authors in full control of their creativity.
            </p>
            <a
              href="mailto:admin@dominionwriter.com"
              className="inline-flex items-center gap-2 text-sm transition-colors"
              style={{ color: '#4F8EF7' }}
            >
              <Mail className="w-4 h-4" />
              admin@dominionwriter.com
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8899BB' }}>
              Platform
            </h4>
            <nav className="flex flex-col gap-2.5">
              {[
                { label: 'About', view: 'about' },
                { label: 'Dashboard', view: session ? 'dashboard' : 'login' },
                { label: 'Profile', view: session ? 'profile' : 'login' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => setView(item.view as any)}
                  className="text-left text-sm transition-all duration-200 group flex items-center gap-1.5"
                  style={{ color: '#6677AA' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EEF2FF' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6677AA' }}
                >
                  <span className="w-1 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: '#4F8EF7' }} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8899BB' }}>
              Legal
            </h4>
            <nav className="flex flex-col gap-2.5">
              {[
                { label: 'Privacy Policy', view: 'privacy' },
                { label: 'Terms of Service', view: 'terms' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => setView(item.view as any)}
                  className="text-left text-sm transition-all duration-200 group flex items-center gap-1.5"
                  style={{ color: '#6677AA' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EEF2FF' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6677AA' }}
                >
                  <span className="w-1 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: '#4F8EF7' }} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(26,37,64,0.6)' }}>
          <p className="text-xs" style={{ color: '#3A4A6A' }}>
            © {new Date().getFullYear()} Dominion Writer. Owned by Mr. Nghia Nguyen. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
            <span className="text-xs" style={{ color: '#3A4A6A' }}>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}