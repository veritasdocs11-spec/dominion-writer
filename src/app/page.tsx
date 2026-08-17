'use client'

import { useEffect, useCallback, useSyncExternalStore } from 'react'
import { useSession, signOut, SessionProvider } from 'next-auth/react'
import { useAppStore, type AppView } from '@/store/app-store'
import { LandingPage } from '@/components/landing/landing-page'
import { AboutPage } from '@/components/legal/about-page'
import { PrivacyPage } from '@/components/legal/privacy-page'
import { TermsPage } from '@/components/legal/terms-page'
import { LoginForm } from '@/components/auth/login-form'
import { SignupForm } from '@/components/auth/signup-form'
import { ProfilePage } from '@/components/profile/profile-page'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { BookWizard } from '@/components/wizard/book-wizard'
import { BookEditor } from '@/components/editor/book-editor'
import { Footer } from '@/components/landing/footer'
import { BookOpen, Sparkles, LayoutDashboard, User, LogOut, LogIn } from 'lucide-react'

function AppContent() {
  const { data: session, status } = useSession()
  const { currentView, setView, setUser, logout, selectedBookId } = useAppStore()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUser({
        id: (session.user as any).id || session.user.email || '',
        email: session.user.email || '',
        fullName: session.user.name || null,
      })
    }
  }, [status, session, setUser])

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setView(e.state.view)
      } else {
        const params = new URLSearchParams(window.location.search)
        const viewParam = params.get('view') as AppView | null
        if (viewParam) setView(viewParam)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setView])

  const handleLogout = useCallback(async () => {
    logout()
    await signOut({ redirect: false })
    window.location.href = '/'
  }, [logout])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080C14' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full animate-pulse"
              style={{ background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-8 h-8" style={{ color: '#4F8EF7' }} />
            </div>
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: '#4F8EF7', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const showFooter = ['landing', 'about', 'privacy', 'terms', 'login', 'signup'].includes(currentView)
  const showHeader = !['editor'].includes(currentView)

  const userInitials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session?.user?.email?.[0]?.toUpperCase() || '?'

  const renderView = () => {
    switch (currentView) {
      case 'landing': return <LandingPage />
      case 'about': return <AboutPage />
      case 'privacy': return <PrivacyPage />
      case 'terms': return <TermsPage />
      case 'login': return <LoginForm />
      case 'signup': return <SignupForm />
      case 'dashboard': return <DashboardPage />
      case 'profile': return <ProfilePage />
      case 'wizard': return <BookWizard />
      case 'editor': return selectedBookId ? <BookEditor bookId={selectedBookId} /> : <DashboardPage />
      default: return <LandingPage />
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080C14' }}>
      {showHeader && (
        <header className="sticky top-0 z-50 site-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Logo */}
            <button
              onClick={() => setView(session ? 'dashboard' : 'landing')}
              className="flex items-center gap-2.5 group shrink-0"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, rgba(79,142,247,0.2), rgba(155,114,248,0.2))',
                  border: '1px solid rgba(79,142,247,0.3)',
                }}
              >
                <BookOpen className="w-4 h-4" style={{ color: '#4F8EF7' }} />
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif", color: '#EEF2FF' }}>
                Dominion <span className="gradient-text-static">Writer</span>
              </span>
            </button>

            {/* Center nav */}
            <nav
              className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(26,37,64,0.4)', border: '1px solid rgba(26,37,64,0.8)' }}
            >
              <button onClick={() => setView('about')} className="nav-pill">About</button>
              <button onClick={() => setView('privacy')} className="nav-pill">Privacy</button>
              <button onClick={() => setView('terms')} className="nav-pill">Terms</button>
            </nav>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              {session ? (
                <>
                  <button
                    onClick={() => setView('dashboard')}
                    className="hidden sm:flex items-center gap-1.5 nav-pill"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => setView('profile')}
                    className="hidden sm:flex items-center gap-1.5 nav-pill"
                  >
                    <User className="w-3.5 h-3.5" />
                    Profile
                  </button>
                  <div
                    className="w-8 h-8 rounded-full items-center justify-center text-xs font-bold shrink-0 hidden md:flex"
                    style={{ background: 'linear-gradient(135deg, #4F8EF7, #9B72F8)', color: '#fff' }}
                  >
                    {userInitials}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200"
                    style={{
                      background: 'rgba(248,113,113,0.1)',
                      border: '1px solid rgba(248,113,113,0.2)',
                      color: '#F87171',
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setView('login')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                    style={{ color: '#8899BB' }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </button>
                  <button
                    onClick={() => setView('signup')}
                    className="gradient-btn flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile nav */}
          <div
            className="md:hidden flex items-center gap-1 px-4 pb-2.5 overflow-x-auto custom-scrollbar"
            style={{ borderTop: '1px solid rgba(26,37,64,0.5)' }}
          >
            {['about', 'privacy', 'terms'].map(v => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                className="px-3 py-1 text-xs rounded-full whitespace-nowrap capitalize font-medium"
                style={{ color: '#8899BB', background: 'rgba(26,37,64,0.4)' }}
              >
                {v}
              </button>
            ))}
            {session && (
              <>
                <button
                  onClick={() => setView('dashboard')}
                  className="px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium"
                  style={{ color: '#8899BB', background: 'rgba(26,37,64,0.4)' }}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setView('profile')}
                  className="px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium"
                  style={{ color: '#8899BB', background: 'rgba(26,37,64,0.4)' }}
                >
                  Profile
                </button>
              </>
            )}
          </div>
        </header>
      )}

      <main className="flex-1">
        <div className="animate-fade-in" key={currentView}>
          {renderView()}
        </div>
      </main>

      {showFooter && <Footer />}
    </div>
  )
}

export default function HomePage() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  )
}