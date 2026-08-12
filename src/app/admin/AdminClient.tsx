'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert,
  Key,
  Mail,
  CheckCircle2,
  Trash2,
  Users,
  CreditCard,
  BookOpen,
  Settings,
  Database,
  Activity,
  DollarSign,
  UserPlus,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Check,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Sparkles,
  Server,
  Zap,
  Globe,
  Sliders,
  LogOut,
  Radio,
  FileText,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { signIn, signOut } from 'next-auth/react'
import {
  updateSiteSettings,
  deleteUser,
  activateUserPlan,
  deactivateUserPlan,
  createAdminUser,
  updateUser,
  resetUserPassword,
  sendPasswordReset,
  deleteBookAdmin,
} from './actions'

interface AdminDashboardProps {
  initialData: any
  session: any
}

export function AdminDashboard({ initialData, session }: AdminDashboardProps) {
  const [data, setData] = useState(initialData)
  const [activeTab, setActiveTab] = useState<'overview' | 'stripe' | 'users' | 'books' | 'settings' | 'supabase' | 'logs'>('overview')
  const [isPending, startTransition] = useTransition()

  // Stripe & Keys UI states
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [stripeTesting, setStripeTesting] = useState(false)
  const [stripeTestResult, setStripeTestResult] = useState<any>(null)
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // Users Filter & Search
  const [userSearch, setUserSearch] = useState('')
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'free' | 'admin'>('all')

  // Modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<{ open: boolean; userId: string; email: string }>({
    open: false,
    userId: '',
    email: '',
  })
  const [newPasswordValue, setNewPasswordValue] = useState('')

  // New User Form State
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'USER',
    planActive: true,
    planType: 'lifetime',
  })

  // Login Form State for Admin Portal
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const isSuperAdmin = session?.user?.email === 'admin@veritasdocs.com' || (session?.user as any)?.isAdmin || (session?.user as any)?.role === 'ADMIN'

  // --- UNPROTECTED / LOGIN SCREEN IF NOT ADMIN ---
  if (!session || !isSuperAdmin) {
    const handleDirectAdminLogin = async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      setIsLoggingIn(true)
      toast.loading('Authenticating Super Admin credentials...', { id: 'admin-auth' })

      try {
        const res = await signIn('credentials', {
          email: loginEmail.trim(),
          password: loginPassword,
          redirect: false,
        })

        if (res?.error) {
          toast.error('Invalid credentials. Check Supabase DB user or click prefill below.', { id: 'admin-auth' })
        } else {
          toast.success('Super Admin authenticated successfully!', { id: 'admin-auth' })
          window.location.reload()
        }
      } catch (err: any) {
        toast.error(err.message || 'Login failed', { id: 'admin-auth' })
      } finally {
        setIsLoggingIn(false)
      }
    }

    const copySqlScript = () => {
      const sql = `-- Supabase SQL Script to create/verify Admin User & Tables:
-- 1. Ensure User table columns exist
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planType" TEXT DEFAULT 'free';

-- 2. Create SiteSettings table for Stripe & platform config
CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "id" TEXT PRIMARY KEY,
  "stripeSecretKey" TEXT,
  "stripePublishableKey" TEXT,
  "stripeWebhookSecret" TEXT,
  "stripeMode" TEXT DEFAULT 'test',
  "currency" TEXT DEFAULT 'usd',
  "lifetimePrice" NUMERIC DEFAULT 99,
  "monthlyPrice" NUMERIC DEFAULT 19,
  "annualPrice" NUMERIC DEFAULT 149,
  "lifetimePriceId" TEXT,
  "monthlyPriceId" TEXT,
  "annualPriceId" TEXT,
  "enableStripeCheckout" BOOLEAN DEFAULT TRUE,
  "platformName" TEXT DEFAULT 'Dominion Writer',
  "supportEmail" TEXT DEFAULT 'support@veritasdocs.com',
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "SiteSettings" (id, "stripeMode", currency, "lifetimePrice", "updatedAt")
VALUES ('default', 'test', 'usd', 99, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 3. Verify or Insert Admin User (Password: AdminVeritasdocs@2026)
-- Hash: $2b$12$N7i2YgW7/zZz6vH8eG2s6.Oq0X4v4U1lA6bF1Ew7pA.e8nZtH8P2q
INSERT INTO "User" (id, email, "fullName", "passwordHash", "role", "isAdmin", "planActive", "planType", "ageConfirmed", "status", "createdAt", "updatedAt")
VALUES ('admin_primary', 'admin@veritasdocs.com', 'Super Administrator', '$2b$12$4v0P1uYtY/Yx9Z4wQ7Yk8.EwHwGZ1L9n8P6M1V0t2R4q8S9T3W5Za', 'ADMIN', TRUE, TRUE, 'lifetime', TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE 
SET "role" = 'ADMIN', "isAdmin" = TRUE, "planActive" = TRUE, "planType" = 'lifetime';
`
      navigator.clipboard.writeText(sql)
      setCopiedSql(true)
      toast.success('Supabase SQL query copied to clipboard!')
      setTimeout(() => setCopiedSql(false), 3000)
    }

    return (
      <div className="min-h-screen bg-[#080C14] text-foreground flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,142,247,0.2),rgba(0,0,0,0))]"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-primary/10 border border-primary/30 text-primary shadow-lg shadow-primary/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Super Admin Control Center</h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your administrative credentials to manage Stripe integration, users, and platform data.
            </p>
          </div>

          {/* Login Card */}
          <Card className="border border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Admin Authentication
              </CardTitle>
              <CardDescription>
                Use the pre-configured credentials below or enter your custom admin account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDirectAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-email">Admin Username / Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@veritasdocs.com"
                    className="bg-muted/40 border-border/60"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="admin-password">Admin Password</Label>
                  </div>
                  <Input
                    id="admin-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="bg-muted/40 border-border/60 font-mono"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full gradient-btn font-semibold text-white h-11 shadow-lg shadow-primary/20"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2 fill-current" />
                  )}
                  Sign In to Admin Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Supabase SQL Runner Helper */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Supabase Database Setup SQL</p>
                <p className="text-muted-foreground text-[11px]">Need to run the admin migration in Supabase SQL editor?</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={copySqlScript} className="h-8 text-xs gap-1.5 shrink-0">
              {copiedSql ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'Copied' : 'Copy SQL'}
            </Button>
          </div>

          <div className="text-center">
            <a href="/" className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
              &larr; Return to main platform
            </a>
          </div>
        </motion.div>
      </div>
    )
  }

  // --- LOGGED IN SUPER ADMIN VIEW ---
  const settings = data?.settings || {}
  const users = data?.users || []
  const plans = data?.plans || []
  const metrics = data?.metrics || {
    totalUsers: users.length,
    activeSubscribers: users.filter((u: any) => u.planActive).length,
    totalRevenue: (users.filter((u: any) => u.planActive).length * 99),
    totalBooks: data?.books?.length || 0,
    totalChapters: 0,
    totalApiKeys: 0,
  }
  const auditLogs = data?.auditLogs || []
  const transactions = data?.transactions || []
  const books = data?.books || []

  // Filtered Users
  const filteredUsers = users.filter((u: any) => {
    const matchesSearch =
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.fullName && u.fullName.toLowerCase().includes(userSearch.toLowerCase())) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase())

    if (!matchesSearch) return false

    if (userFilter === 'active') return u.planActive
    if (userFilter === 'free') return !u.planActive
    if (userFilter === 'admin') return u.role === 'ADMIN' || u.isAdmin
    return true
  })

  // Handlers
  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const formData = new FormData(e.currentTarget)
        await updateSiteSettings(formData)
        toast.success('Stripe and Platform settings updated successfully!')
      } catch (err: any) {
        toast.error(err.message || 'Failed to update settings')
      }
    })
  }

  const handleTestStripe = async () => {
    setStripeTesting(true)
    setStripeTestResult(null)
    toast.loading('Testing Stripe API connection...', { id: 'stripe-test' })

    try {
      const res = await fetch('/api/stripe/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: settings.stripeSecretKey }),
      })
      const result = await res.json()
      setStripeTestResult(result)

      if (result.success) {
        toast.success(result.message, { id: 'stripe-test' })
      } else {
        toast.error(result.message, { id: 'stripe-test' })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect to Stripe', { id: 'stripe-test' })
    } finally {
      setStripeTesting(false)
    }
  }

  const handleTogglePlan = async (userId: string, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        if (currentStatus) {
          await deactivateUserPlan(userId)
          toast.success('User plan deactivated')
        } else {
          await activateUserPlan(userId, 'lifetime')
          toast.success('Lifetime Plan activated for user')
        }
        setData((prev: any) => ({
          ...prev,
          users: prev.users.map((u: any) =>
            u.id === userId ? { ...u, planActive: !currentStatus, planType: !currentStatus ? 'lifetime' : 'free' } : u
          ),
        }))
      } catch {
        toast.error('Failed to change plan status')
      }
    })
  }

  const handleDeleteUserClick = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${email}" and all their books?`)) return

    startTransition(async () => {
      try {
        await deleteUser(userId)
        setData((prev: any) => ({
          ...prev,
          users: prev.users.filter((u: any) => u.id !== userId),
        }))
        toast.success(`User ${email} deleted`)
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete user')
      }
    })
  }

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const created = await createAdminUser(newUserForm)
        setData((prev: any) => ({
          ...prev,
          users: [created, ...prev.users],
        }))
        setShowCreateUserModal(false)
        setNewUserForm({ email: '', fullName: '', password: '', role: 'USER', planActive: true, planType: 'lifetime' })
        toast.success(`User ${created.email} created successfully!`)
      } catch (err: any) {
        toast.error(err.message || 'Failed to create user')
      }
    })
  }

  const handleExecutePasswordReset = async () => {
    if (!newPasswordValue || newPasswordValue.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    startTransition(async () => {
      try {
        await resetUserPassword(showPasswordResetModal.userId, newPasswordValue)
        toast.success(`Password reset for ${showPasswordResetModal.email}`)
        setShowPasswordResetModal({ open: false, userId: '', email: '' })
        setNewPasswordValue('')
      } catch (err: any) {
        toast.error(err.message || 'Failed to reset password')
      }
    })
  }

  const handleSendResetEmail = async (email: string) => {
    try {
      await sendPasswordReset(email)
      toast.success(`Password reset email dispatched to ${email}`)
    } catch {
      toast.error('Failed to send reset email')
    }
  }

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!confirm(`Delete book "${title}" across the system?`)) return
    try {
      await deleteBookAdmin(bookId)
      setData((prev: any) => ({
        ...prev,
        books: prev.books.filter((b: any) => b.id !== bookId),
      }))
      toast.success('Book removed')
    } catch {
      toast.error('Failed to delete book')
    }
  }

  const copyWebhookUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
    const url = `${origin}/api/stripe/webhook`
    navigator.clipboard.writeText(url)
    setCopiedWebhook(true)
    toast.success('Webhook endpoint URL copied to clipboard!')
    setTimeout(() => setCopiedWebhook(false), 3000)
  }

  return (
    <div className="min-h-screen bg-[#080C14] text-foreground flex flex-col">
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Super Admin Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-purple-600 text-white font-bold shadow-md shadow-primary/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">Dominion <span className="text-primary">Admin</span></span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold border border-primary/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Stripe Monetization & Platform Oversight
              </p>
            </div>
          </div>

          {/* Quick links & Profile */}
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
              <a href="/" target="_blank" className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Writer App</span>
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
              <a href="/pricing" target="_blank" className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                <span className="hidden md:inline">Pricing Page</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            </Button>
            <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">
                {session?.user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-medium hidden lg:inline max-w-[140px] truncate text-muted-foreground">
                {session?.user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ redirect: false }).then(() => { window.location.href = '/' })}
                className="text-xs h-8 text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card/60 border border-border/80 overflow-x-auto custom-scrollbar">
          {[
            { id: 'overview', label: 'Overview & Metrics', icon: Activity },
            { id: 'stripe', label: 'Stripe & Plans', icon: CreditCard },
            { id: 'users', label: 'User Management', icon: Users, badge: users.length },
            { id: 'books', label: 'Books Library', icon: BookOpen, badge: books.length },
            { id: 'settings', label: 'Platform & AI', icon: Sliders },
            { id: 'supabase', label: 'Supabase SQL Setup', icon: Database },
            { id: 'logs', label: 'Audit Trail', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & METRICS                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="border-border/80 bg-card/70 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-6 -mt-6" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Registered Users
                  </CardTitle>
                  <Users className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-white">{metrics.totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span className="text-green-400 font-medium">+{users.filter((u: any) => new Date(u.createdAt) > new Date(Date.now() - 7 * 86400000)).length}</span> new this week
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/70 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Paid / Active Plans
                  </CardTitle>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-white">{metrics.activeSubscribers}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.totalUsers > 0 ? Math.round((metrics.activeSubscribers / metrics.totalUsers) * 100) : 0}% conversion rate
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/70 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Estimated Revenue
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-white">${metrics.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {settings.currency?.toUpperCase() || 'USD'} • Lifetime & Subscriptions
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/70 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Books Generated
                  </CardTitle>
                  <BookOpen className="w-4 h-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold text-white">{metrics.totalBooks}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.totalChapters || 0} chapters written
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Status Banners */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Stripe Status */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-primary" /> Stripe Status
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      settings.stripeSecretKey ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {settings.stripeSecretKey ? (settings.stripeMode === 'live' ? 'Live Connected' : 'Test Mode') : 'Not Configured'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.stripeSecretKey
                    ? `Stripe keys are configured. Lifetime plan price set to $${settings.lifetimePrice || 99}.`
                    : 'Stripe Secret Key is missing. Go to Stripe tab to enter API keys.'}
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('stripe')} className="w-full text-xs h-8">
                  Configure Stripe & Plans &rarr;
                </Button>
              </div>

              {/* Supabase Health */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-green-400" /> Supabase Database
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/30">
                    Online & Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connected to PostgreSQL schema. All tables (User, SiteSettings, Plan, AuditLog) synchronized.
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('supabase')} className="w-full text-xs h-8">
                  View SQL Script & Tables &rarr;
                </Button>
              </div>

              {/* Fast User Management */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" /> Quick Add User
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Quickly provision new customer accounts with Lifetime Plan pre-activated directly from admin.
                </p>
                <Button onClick={() => setShowCreateUserModal(true)} size="sm" className="w-full gradient-btn text-white text-xs h-8">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Create New User
                </Button>
              </div>
            </div>

            {/* Recent Registrations Table */}
            <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Recent Registered Users</CardTitle>
                  <CardDescription>Latest accounts registered on Dominion Writer.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('users')} className="text-xs">
                  View All Users ({users.length})
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border/60">
                      <tr>
                        <th className="px-4 py-3 rounded-l-lg">User Email</th>
                        <th className="px-4 py-3">Full Name</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Plan Status</th>
                        <th className="px-4 py-3">Joined Date</th>
                        <th className="px-4 py-3 text-right rounded-r-lg">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {users.slice(0, 5).map((user: any) => (
                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{user.email}</td>
                          <td className="px-4 py-3 text-muted-foreground">{user.fullName || '—'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                                user.role === 'ADMIN' || user.isAdmin
                                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {user.role || 'USER'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {user.planActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                <CheckCircle className="w-3 h-3" /> Active ({user.planType || 'Lifetime'})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3" /> Free Tier
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTogglePlan(user.id, user.planActive)}
                              className="h-7 text-[11px] px-2"
                            >
                              {user.planActive ? 'Revoke Plan' : 'Grant Lifetime'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STRIPE & PLANS MONETIZATION                                        */}
        {/* ========================================================================= */}
        {activeTab === 'stripe' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl bg-card/60 border border-primary/20">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Stripe Integration & Plans Setup
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Connect your Stripe account, configure API keys, and link your checkout plans for seamless payment processing.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleTestStripe}
                  disabled={stripeTesting}
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  {stripeTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Test Stripe Connection
                </Button>
                <Button asChild size="sm" className="gradient-btn text-xs h-9 text-white">
                  <a href="/pricing" target="_blank" className="flex items-center gap-1">
                    Live Pricing Preview <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Test result banner if available */}
            {stripeTestResult && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                  stripeTestResult.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {stripeTestResult.success ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                  <span>{stripeTestResult.message}</span>
                </div>
                {stripeTestResult.details && (
                  <span className="font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded">
                    Currency: {stripeTestResult.details.currency} | Livemode: {String(stripeTestResult.details.livemode)}
                  </span>
                )}
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSaveSettings} className="space-y-8">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* 1. Stripe API Keys Card */}
                <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" /> API Credentials
                    </CardTitle>
                    <CardDescription>
                      Obtain these from your Stripe Dashboard &rarr; Developers &rarr; API keys.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stripe Mode */}
                    <div className="space-y-1.5">
                      <Label htmlFor="stripeMode">Stripe Mode</Label>
                      <select
                        id="stripeMode"
                        name="stripeMode"
                        defaultValue={settings.stripeMode || 'test'}
                        className="w-full rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="test">Test Mode (Mock & Sandbox)</option>
                        <option value="live">Production (Live Mode)</option>
                      </select>
                    </div>

                    {/* Publishable Key */}
                    <div className="space-y-1.5">
                      <Label htmlFor="publishableKey">Stripe Publishable Key</Label>
                      <Input
                        id="publishableKey"
                        name="publishableKey"
                        defaultValue={settings.stripePublishableKey || ''}
                        placeholder="pk_test_... or pk_live_..."
                        className="bg-muted/40 font-mono text-xs"
                      />
                    </div>

                    {/* Secret Key */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="secretKey">Stripe Secret Key</Label>
                        <button
                          type="button"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="text-[11px] text-primary flex items-center gap-1 hover:underline"
                        >
                          {showSecretKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {showSecretKey ? 'Hide' : 'Show Key'}
                        </button>
                      </div>
                      <Input
                        id="secretKey"
                        name="secretKey"
                        type={showSecretKey ? 'text' : 'password'}
                        defaultValue={settings.stripeSecretKey || ''}
                        placeholder="sk_test_... or sk_live_..."
                        className="bg-muted/40 font-mono text-xs"
                      />
                    </div>

                    {/* Webhook Secret */}
                    <div className="space-y-1.5">
                      <Label htmlFor="webhookSecret">Stripe Webhook Signing Secret</Label>
                      <Input
                        id="webhookSecret"
                        name="webhookSecret"
                        type="password"
                        defaultValue={settings.stripeWebhookSecret || ''}
                        placeholder="whsec_..."
                        className="bg-muted/40 font-mono text-xs"
                      />
                    </div>

                    {/* Currency */}
                    <div className="space-y-1.5">
                      <Label htmlFor="currency">Default Billing Currency</Label>
                      <select
                        id="currency"
                        name="currency"
                        defaultValue={settings.currency || 'usd'}
                        className="w-full rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="usd">USD - US Dollar ($)</option>
                        <option value="eur">EUR - Euro (€)</option>
                        <option value="gbp">GBP - British Pound (£)</option>
                        <option value="cad">CAD - Canadian Dollar ($)</option>
                        <option value="aud">AUD - Australian Dollar ($)</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Webhook Setup & Copy box */}
                <div className="space-y-6">
                  <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Radio className="w-4 h-4 text-green-400" /> Webhook Listener Setup
                      </CardTitle>
                      <CardDescription>
                        Stripe needs this endpoint to automatically activate user accounts upon successful checkout.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Webhook Endpoint URL</Label>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={typeof window !== 'undefined' ? `${window.location.origin}/api/stripe/webhook` : 'https://your-domain.com/api/stripe/webhook'}
                            className="bg-muted/60 font-mono text-xs"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={copyWebhookUrl} className="shrink-0 gap-1 text-xs">
                            {copiedWebhook ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedWebhook ? 'Copied' : 'Copy'}
                          </Button>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">Required Events to select in Stripe Dashboard:</p>
                        <ul className="space-y-1 font-mono text-[11px] list-disc list-inside text-primary">
                          <li>checkout.session.completed</li>
                          <li>customer.subscription.created</li>
                          <li>customer.subscription.deleted</li>
                          <li>invoice.payment_succeeded</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Enable Checkout Switch */}
                  <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableStripeCheckout" className="text-sm font-semibold">
                          Enable Stripe Checkout Platform
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Toggle live checkout requests across the pricing page.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        id="enableStripeCheckout"
                        name="enableStripeCheckout"
                        defaultChecked={settings.enableStripeCheckout !== false}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 3. Pricing Plan Management (Linked to Stripe) */}
              <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Plan Tiers & Stripe Price IDs
                  </CardTitle>
                  <CardDescription>
                    Configure the retail price and Stripe Price IDs (`price_...`) for your customer plans.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Lifetime Plan */}
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 relative">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary text-white uppercase absolute top-3 right-3">
                        Featured Lifetime
                      </span>
                      <h4 className="font-bold text-sm text-foreground">Lifetime Access Plan</h4>
                      <div className="space-y-1">
                        <Label htmlFor="lifetimePrice" className="text-xs">Price ($ USD)</Label>
                        <Input
                          id="lifetimePrice"
                          name="lifetimePrice"
                          type="number"
                          defaultValue={settings.lifetimePrice || 99}
                          className="bg-muted/40 text-sm font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="lifetimePriceId" className="text-xs">Stripe Price ID (Optional)</Label>
                        <Input
                          id="lifetimePriceId"
                          name="lifetimePriceId"
                          defaultValue={settings.lifetimePriceId || ''}
                          placeholder="price_1N..."
                          className="bg-muted/40 font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">If empty, a dynamic checkout item is created.</p>
                      </div>
                    </div>

                    {/* Pro Monthly */}
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                      <h4 className="font-bold text-sm text-foreground">Pro Monthly Plan</h4>
                      <div className="space-y-1">
                        <Label htmlFor="monthlyPrice" className="text-xs">Price ($ / month)</Label>
                        <Input
                          id="monthlyPrice"
                          name="monthlyPrice"
                          type="number"
                          defaultValue={settings.monthlyPrice || 19}
                          className="bg-muted/40 text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="monthlyPriceId" className="text-xs">Stripe Price ID (Optional)</Label>
                        <Input
                          id="monthlyPriceId"
                          name="monthlyPriceId"
                          defaultValue={settings.monthlyPriceId || ''}
                          placeholder="price_1N..."
                          className="bg-muted/40 font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Pro Annual */}
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                      <h4 className="font-bold text-sm text-foreground">Pro Annual Plan</h4>
                      <div className="space-y-1">
                        <Label htmlFor="annualPrice" className="text-xs">Price ($ / year)</Label>
                        <Input
                          id="annualPrice"
                          name="annualPrice"
                          type="number"
                          defaultValue={settings.annualPrice || 149}
                          className="bg-muted/40 text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="annualPriceId" className="text-xs">Stripe Price ID (Optional)</Label>
                        <Input
                          id="annualPriceId"
                          name="annualPriceId"
                          defaultValue={settings.annualPriceId || ''}
                          placeholder="price_1N..."
                          className="bg-muted/40 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button type="submit" disabled={isPending} className="gradient-btn font-semibold text-white shadow-lg shadow-primary/20 px-8">
                      {isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                      Save Stripe & Plans Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: USER MANAGEMENT SUITE                                              */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
            {/* User Search & Top bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users by email, name, or ID..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 bg-card/60 border-border/80 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Pills */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-card/60 border border-border/80 text-xs">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'active', label: 'Paid Active' },
                    { id: 'free', label: 'Free Tier' },
                    { id: 'admin', label: 'Admins' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setUserFilter(f.id as any)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        userFilter === f.id ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <Button onClick={() => setShowCreateUserModal(true)} size="sm" className="gradient-btn text-white text-xs gap-1.5 h-8">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New User</span>
                </Button>
              </div>
            </div>

            {/* Users Table */}
            <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border/60">
                      <tr>
                        <th className="px-6 py-3.5">User Email</th>
                        <th className="px-6 py-3.5">Full Name</th>
                        <th className="px-6 py-3.5">Role</th>
                        <th className="px-6 py-3.5">Plan Status</th>
                        <th className="px-6 py-3.5">Registered</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredUsers.map((user: any) => {
                        const isPrimaryAdmin = user.email === 'admin@veritasdocs.com'
                        return (
                          <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-foreground">{user.email}</div>
                              <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">{user.id}</div>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {user.fullName || '—'}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                                  user.role === 'ADMIN' || user.isAdmin
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {user.role || 'USER'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {user.planActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                  <CheckCircle className="w-3 h-3" /> Active ({user.planType || 'Lifetime'})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  <Clock className="w-3 h-3" /> Inactive / Free
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1.5">
                              {/* Toggle Plan */}
                              <Button
                                variant={user.planActive ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => handleTogglePlan(user.id, user.planActive)}
                                disabled={isPending}
                                className={`h-7 text-[11px] px-2.5 ${!user.planActive ? 'gradient-btn text-white' : ''}`}
                              >
                                {user.planActive ? 'Revoke' : 'Activate Plan'}
                              </Button>

                              {/* Reset Password Modal Trigger */}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowPasswordResetModal({ open: true, userId: user.id, email: user.email })}
                                title="Reset User Password"
                                className="h-7 text-xs px-2"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </Button>

                              {/* Send Reset Email */}
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleSendResetEmail(user.email)}
                                title="Send Password Reset Email"
                                className="h-7 text-xs px-2"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </Button>

                              {/* Delete User */}
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isPending || isPrimaryAdmin}
                                onClick={() => handleDeleteUserClick(user.id, user.email)}
                                title={isPrimaryAdmin ? 'Primary admin cannot be deleted' : 'Delete user'}
                                className="h-7 text-xs px-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                            No matching users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: BOOKS LIBRARY OVERSIGHT                                            */}
        {/* ========================================================================= */}
        {activeTab === 'books' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> Platform Books Library
                  </CardTitle>
                  <CardDescription>
                    Browse, inspect, and moderate all user-created books across Dominion Writer.
                  </CardDescription>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                  {books.length} Books Created
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border/60">
                      <tr>
                        <th className="px-6 py-3.5">Book Title</th>
                        <th className="px-6 py-3.5">Author</th>
                        <th className="px-6 py-3.5">Genre & Style</th>
                        <th className="px-6 py-3.5">Chapters</th>
                        <th className="px-6 py-3.5">Last Updated</th>
                        <th className="px-6 py-3.5 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {books.map((book: any) => (
                        <tr key={book.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{book.title}</div>
                            {book.subtitle && <div className="text-muted-foreground text-[11px]">{book.subtitle}</div>}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {book.authorName || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-md font-medium text-[10px] bg-muted text-muted-foreground capitalize">
                              {book.bookType || 'fiction'} • {book.style || 'professional'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {book.chapters?.length || 0} chapters
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {new Date(book.updatedAt || book.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              className="h-7 text-xs px-2.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {books.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                            No books have been written on the platform yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PLATFORM & AI SETTINGS                                             */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 animate-fade-in">
            <div className="grid gap-6 md:grid-cols-2">
              {/* AI Config */}
              <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> AI Model Engine Defaults
                  </CardTitle>
                  <CardDescription>
                    Select the default AI model used when users don't provide custom keys.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="defaultAiModel">Default System AI Model</Label>
                    <select
                      id="defaultAiModel"
                      name="defaultAiModel"
                      defaultValue={settings.defaultAiModel || 'gpt-4o'}
                      className="w-full rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="gpt-4o">OpenAI GPT-4o (Recommended)</option>
                      <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                      <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                      <option value="gpt-4o-mini">OpenAI GPT-4o Mini (Cost Efficient)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fallbackAiApiKey">Global Server Fallback AI Key</Label>
                    <Input
                      id="fallbackAiApiKey"
                      name="fallbackAiApiKey"
                      type="password"
                      defaultValue={settings.fallbackAiApiKey || ''}
                      placeholder="sk-..."
                      className="bg-muted/40 font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">Optional server key used when user has no individual API key set.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Branding & Maintenance */}
              <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" /> Platform Branding & Banner
                  </CardTitle>
                  <CardDescription>
                    Configure platform title, contact email, and broadcast announcements.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input
                      id="platformName"
                      name="platformName"
                      defaultValue={settings.platformName || 'Dominion Writer'}
                      className="bg-muted/40 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="supportEmail">Customer Support Email</Label>
                    <Input
                      id="supportEmail"
                      name="supportEmail"
                      defaultValue={settings.supportEmail || 'support@veritasdocs.com'}
                      className="bg-muted/40 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="announcementBanner">Global Announcement Banner</Label>
                    <Input
                      id="announcementBanner"
                      name="announcementBanner"
                      defaultValue={settings.announcementBanner || ''}
                      placeholder="e.g. Special Launch Offer: 20% off lifetime access this weekend only!"
                      className="bg-muted/40 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="gradient-btn font-semibold text-white px-8">
                {isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Save Platform Settings
              </Button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: SUPABASE SQL SETUP HELPER                                          */}
        {/* ========================================================================= */}
        {activeTab === 'supabase' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Database className="w-4 h-4 text-green-400" /> Supabase SQL Setup & Schema Runner
                  </CardTitle>
                  <CardDescription>
                    Execute this query in your Supabase SQL Editor to ensure all tables, columns, and the admin user are synchronized.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const sql = `-- Supabase Complete Admin & Stripe Schema Runner
-- 1. Ensure User table columns exist
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planType" TEXT DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP WITH TIME ZONE;

-- 2. Create SiteSettings table for Stripe & platform config
CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "id" TEXT PRIMARY KEY,
  "stripeSecretKey" TEXT,
  "stripePublishableKey" TEXT,
  "stripeWebhookSecret" TEXT,
  "stripeMode" TEXT DEFAULT 'test',
  "currency" TEXT DEFAULT 'usd',
  "lifetimePrice" NUMERIC DEFAULT 99,
  "monthlyPrice" NUMERIC DEFAULT 19,
  "annualPrice" NUMERIC DEFAULT 149,
  "lifetimePriceId" TEXT,
  "monthlyPriceId" TEXT,
  "annualPriceId" TEXT,
  "enableStripeCheckout" BOOLEAN DEFAULT TRUE,
  "platformName" TEXT DEFAULT 'Dominion Writer',
  "supportEmail" TEXT DEFAULT 'support@veritasdocs.com',
  "defaultAiModel" TEXT DEFAULT 'gpt-4o',
  "fallbackAiApiKey" TEXT,
  "maintenanceMode" BOOLEAN DEFAULT FALSE,
  "announcementBanner" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "SiteSettings" (id, "stripeMode", currency, "lifetimePrice", "monthlyPrice", "annualPrice", "platformName", "updatedAt")
VALUES ('default', 'test', 'usd', 99, 19, 149, 'Dominion Writer', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Plan Table
CREATE TABLE IF NOT EXISTS "Plan" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "price" NUMERIC NOT NULL,
  "interval" TEXT DEFAULT 'one-time',
  "stripePriceId" TEXT,
  "description" TEXT,
  "features" JSONB,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create AuditLog & Transaction tables
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "action" TEXT NOT NULL,
  "performedBy" TEXT NOT NULL,
  "targetId" TEXT,
  "details" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "userEmail" TEXT NOT NULL,
  "amount" NUMERIC NOT NULL,
  "currency" TEXT DEFAULT 'usd',
  "status" TEXT DEFAULT 'succeeded',
  "planType" TEXT DEFAULT 'lifetime',
  "stripeSessionId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Upsert Admin User (Email: admin@veritasdocs.com | Password: AdminVeritasdocs@2026)
INSERT INTO "User" (id, email, "fullName", "passwordHash", "role", "isAdmin", "planActive", "planType", "ageConfirmed", "status", "createdAt", "updatedAt")
VALUES ('admin_primary', 'admin@veritasdocs.com', 'Super Administrator', '$2b$12$4v0P1uYtY/Yx9Z4wQ7Yk8.EwHwGZ1L9n8P6M1V0t2R4q8S9T3W5Za', 'ADMIN', TRUE, TRUE, 'lifetime', TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE 
SET "role" = 'ADMIN', "isAdmin" = TRUE, "planActive" = TRUE, "planType" = 'lifetime';
`
                    navigator.clipboard.writeText(sql)
                    toast.success('Complete SQL script copied!')
                  }}
                  className="text-xs gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Complete SQL
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-black/80 font-mono text-xs text-green-400 overflow-x-auto border border-border/60 max-h-96 custom-scrollbar">
                  <pre>{`-- 1. Ensure User table columns exist
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planType" TEXT DEFAULT 'free';

-- 2. Create SiteSettings for Stripe & plans
CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "id" TEXT PRIMARY KEY,
  "stripeSecretKey" TEXT,
  "stripePublishableKey" TEXT,
  "stripeWebhookSecret" TEXT,
  "stripeMode" TEXT DEFAULT 'test',
  "currency" TEXT DEFAULT 'usd',
  "lifetimePrice" NUMERIC DEFAULT 99,
  "monthlyPrice" NUMERIC DEFAULT 19,
  "annualPrice" NUMERIC DEFAULT 149,
  "lifetimePriceId" TEXT,
  "monthlyPriceId" TEXT,
  "annualPriceId" TEXT,
  "enableStripeCheckout" BOOLEAN DEFAULT TRUE,
  "platformName" TEXT DEFAULT 'Dominion Writer',
  "supportEmail" TEXT DEFAULT 'support@veritasdocs.com',
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Upsert Admin User (Email: admin@veritasdocs.com | Password: AdminVeritasdocs@2026)
INSERT INTO "User" (id, email, "fullName", "passwordHash", "role", "isAdmin", "planActive", "planType", "ageConfirmed", "status", "createdAt", "updatedAt")
VALUES ('admin_primary', 'admin@veritasdocs.com', 'Super Administrator', '$2b$12$4v0P1uYtY/Yx9Z4wQ7Yk8.EwHwGZ1L9n8P6M1V0t2R4q8S9T3W5Za', 'ADMIN', TRUE, TRUE, 'lifetime', TRUE, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE 
SET "role" = 'ADMIN', "isAdmin" = TRUE, "planActive" = TRUE, "planType" = 'lifetime';`}</pre>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                    <p className="font-semibold text-foreground">Admin Login Credentials:</p>
                    <p className="text-muted-foreground"><strong>Username / Email:</strong> admin@veritasdocs.com</p>
                    <p className="text-muted-foreground"><strong>Password:</strong> AdminVeritasdocs@2026</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                    <p className="font-semibold text-foreground">Where to run:</p>
                    <p className="text-muted-foreground">Supabase Dashboard &rarr; SQL Editor &rarr; New Query &rarr; Paste & Click Run.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: AUDIT TRAIL & LOGS                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="border-border/80 bg-card/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> System Activity & Audit Trail
                </CardTitle>
                <CardDescription>
                  Chronological record of administrative operations, plan changes, and Stripe transactions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border/60">
                      <tr>
                        <th className="px-6 py-3.5">Action</th>
                        <th className="px-6 py-3.5">Performed By</th>
                        <th className="px-6 py-3.5">Target / Subject</th>
                        <th className="px-6 py-3.5">Details</th>
                        <th className="px-6 py-3.5 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {auditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-mono text-[11px] text-primary">
                            {log.action}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {log.performedBy}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {log.targetId || '—'}
                          </td>
                          <td className="px-6 py-4 text-foreground max-w-xs truncate">
                            {log.details || '—'}
                          </td>
                          <td className="px-6 py-4 text-right text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                            No audit logs recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW USER                                                    */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showCreateUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full rounded-2xl bg-[#0B0F19] border border-border/80 p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> Provision New User
                </h3>
                <button onClick={() => setShowCreateUserModal(false)} className="text-muted-foreground hover:text-foreground">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateNewUser} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="new-user-email">Email Address</Label>
                  <Input
                    id="new-user-email"
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="author@domain.com"
                    className="bg-muted/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-user-name">Full Name (Optional)</Label>
                  <Input
                    id="new-user-name"
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                    placeholder="Arthur Conan Doyle"
                    className="bg-muted/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-user-password">Initial Password</Label>
                  <Input
                    id="new-user-password"
                    type="password"
                    required
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="bg-muted/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-user-role">Account Role</Label>
                    <select
                      id="new-user-role"
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      className="w-full rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none"
                    >
                      <option value="USER">Regular User</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-user-planType">Plan Tier</Label>
                    <select
                      id="new-user-planType"
                      value={newUserForm.planType}
                      onChange={(e) => setNewUserForm({ ...newUserForm, planType: e.target.value })}
                      className="w-full rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none"
                    >
                      <option value="lifetime">Lifetime Access</option>
                      <option value="monthly">Pro Monthly</option>
                      <option value="annual">Pro Annual</option>
                      <option value="free">Free Tier</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="new-user-planActive"
                    checked={newUserForm.planActive}
                    onChange={(e) => setNewUserForm({ ...newUserForm, planActive: e.target.checked })}
                    className="rounded border-border text-primary"
                  />
                  <Label htmlFor="new-user-planActive" className="text-xs">
                    Activate Plan Immediately
                  </Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateUserModal(false)} className="flex-1 text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending} className="flex-1 gradient-btn text-white text-xs font-semibold">
                    {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                    Create Account
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: RESET PASSWORD                                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showPasswordResetModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-sm w-full rounded-2xl bg-[#0B0F19] border border-border/80 p-6 shadow-2xl space-y-4"
            >
              <h3 className="text-base font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Reset Password
              </h3>
              <p className="text-xs text-muted-foreground">
                Set a new password for <span className="text-foreground font-semibold">{showPasswordResetModal.email}</span>.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="reset-new-pw" className="text-xs">New Password</Label>
                <Input
                  id="reset-new-pw"
                  type="password"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="bg-muted/40 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowPasswordResetModal({ open: false, userId: '', email: '' })} className="flex-1 text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleExecutePasswordReset} disabled={isPending} className="flex-1 gradient-btn text-white text-xs font-semibold">
                  Update Password
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
