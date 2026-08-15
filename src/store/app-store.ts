import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppView =
  | 'landing'
  | 'about'
  | 'privacy'
  | 'terms'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'profile'
  | 'wizard'
  | 'editor'

interface AppState {
  currentView: AppView
  selectedBookId: string | null
  user: {
    id: string
    email: string
    fullName: string | null
  } | null
  setView: (view: AppView) => void
  setSelectedBookId: (id: string | null) => void
  setUser: (user: AppState['user']) => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: 'landing',
      selectedBookId: null,
      user: null,
      setView: (view) => {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.set('view', view)
          window.history.pushState({ view }, '', url.toString())
        }
        set({ currentView: view })
      },
      setSelectedBookId: (id) => set({ selectedBookId: id }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, currentView: 'landing' }),
    }),
    {
      name: 'dominion-writer-storage',
    }
  )
)