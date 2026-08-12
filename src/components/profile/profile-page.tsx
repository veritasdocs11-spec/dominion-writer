'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/store/app-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Loader2,
  Key,
  ShieldCheck,
  User,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'

/* ── Provider config ── */
const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', color: '#10A37F' },
  { value: 'anthropic', label: 'Anthropic Claude', color: '#D4A574' },
  { value: 'google', label: 'Google Gemini', color: '#4285F4' },
  { value: 'xai', label: 'xAI (Grok)', color: '#FFFFFF' },
  { value: 'mistral', label: 'Mistral', color: '#F97316' },
  { value: 'deepseek', label: 'DeepSeek', color: '#4F8EF7' },
  { value: 'cohere', label: 'Cohere', color: '#397CBB' },
] as const

interface ApiKey {
  id: string
  provider: string
  label: string | null
  isDefault: boolean
  maskedKey: string
  createdAt: string
}

const MAX_KEYS = 3

export function ProfilePage() {
  const { data: session } = useSession()
  const setView = useAppStore((s) => s.setView)

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null)

  // Add key form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addProvider, setAddProvider] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [addApiKey, setAddApiKey] = useState('')
  const [addIsDefault, setAddIsDefault] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [adding, setAdding] = useState(false)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Password change state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const userId = (session?.user as any)?.id

  const fetchKeys = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/keys?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setKeys(data)
      }
    } catch {
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  /* ── Set default ── */
  const handleSetDefault = async (key: ApiKey) => {
    if (!userId) return
    setSettingDefault(key.id)
    try {
      const res = await fetch('/api/keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: key.id, isDefault: true, userId }),
      })
      if (res.ok) {
        toast.success(`${getProviderLabel(key.provider)} set as default`)
        fetchKeys()
      } else {
        toast.error('Failed to set default key')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSettingDefault(null)
    }
  }

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try {
      const res = await fetch(`/api/keys?id=${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('API key deleted')
        setKeys((prev) => prev.filter((k) => k.id !== deleteTarget.id))
      } else {
        toast.error('Failed to delete key')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setDeleting(null)
      setDeleteTarget(null)
    }
  }

  /* ── Add key ── */
  const handleAddKey = async () => {
    if (!userId || !addProvider || !addApiKey.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          provider: addProvider,
          apiKey: addApiKey.trim(),
          label: addLabel.trim() || null,
          isDefault: addIsDefault,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('API key added successfully')
        setKeys((prev) => [data, ...prev])
        // Reset form
        setAddProvider('')
        setAddLabel('')
        setAddApiKey('')
        setAddIsDefault(false)
        setShowKeyInput(false)
        setShowAddForm(false)
      } else {
        toast.error(data.error || 'Failed to add key')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setAdding(false)
    }
  }

  /* ── Change Password ── */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          userId,
          oldPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Password changed successfully')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Failed to change password')
      }
    } catch {
      toast.error('An error occurred while changing password')
    } finally {
      setChangingPassword(false)
    }
  }

  /* ── Helpers ── */
  const getProviderLabel = (provider: string) =>
    PROVIDERS.find((p) => p.value === provider)?.label ?? provider
  const getProviderColor = (provider: string) =>
    PROVIDERS.find((p) => p.value === provider)?.color ?? '#94A3B8'

  const canAddMore = keys.length < MAX_KEYS

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 animate-fade-in">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setView('dashboard')}
        className="mb-8 flex items-center gap-2 text-sm text-dw-text-muted hover:text-dw-text transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Title */}
      <h1 className="text-3xl font-bold sm:text-4xl mb-8">
        <span className="gradient-text">Profile &amp; API Keys</span>
      </h1>

      {/* ── User Info Card ── */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-dw-text mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-dw-accent-blue" />
          Account Information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg bg-dw-navy-light/50 p-3">
            <User className="h-5 w-5 text-dw-text-muted shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-dw-text-muted">Full Name</p>
              <p className="text-sm font-medium text-dw-text truncate">
                {session?.user?.name || 'Not set'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-dw-navy-light/50 p-3">
            <Mail className="h-5 w-5 text-dw-text-muted shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-dw-text-muted">Email</p>
              <p className="text-sm font-medium text-dw-text truncate">
                {session?.user?.email || 'Not available'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password Card ── */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-dw-text mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-dw-accent-purple" />
          Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="old-password">Current Password</Label>
            <Input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="bg-dw-navy-light border-dw-border"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-dw-navy-light border-dw-border"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-dw-navy-light border-dw-border"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={changingPassword} className="gradient-btn text-white w-full mt-2">
            {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update Password
          </Button>
        </form>
      </div>

      {/* ── API Keys Section ── */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-dw-text flex items-center gap-2">
            <Key className="h-5 w-5 text-dw-accent-purple" />
            API Keys
            <Badge variant="secondary" className="ml-1 bg-dw-border text-dw-text-muted text-xs">
              {keys.length}/{MAX_KEYS}
            </Badge>
          </h2>
          {canAddMore && (
            <Button
              variant="outline"
              size="sm"
              className="border-dw-border text-dw-text hover:bg-dw-card-hover hover:text-white w-fit"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add API Key
            </Button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-dw-text-muted" />
          </div>
        )}

        {/* Empty state */}
        {!loading && keys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dw-accent-blue/10">
              <Key className="h-7 w-7 text-dw-accent-blue" />
            </div>
            <h3 className="text-base font-medium text-dw-text">No API keys yet</h3>
            <p className="mt-1 max-w-xs text-sm text-dw-text-muted">
              Add your first AI provider API key to start using the editor.
            </p>
          </div>
        )}

        {/* Keys list */}
        {!loading && keys.length > 0 && (
          <div className="space-y-3">
            {keys.map((key) => {
              const providerColor = getProviderColor(key.provider)
              return (
                <div
                  key={key.id}
                  className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-lg border border-dw-border bg-dw-navy-light/50 p-4 transition-colors hover:bg-dw-card-hover"
                >
                  {/* Provider dot + info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: providerColor }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-dw-text">
                          {getProviderLabel(key.provider)}
                        </span>
                        {key.label && (
                          <span className="text-xs text-dw-text-muted">
                            &middot; {key.label}
                          </span>
                        )}
                        {key.isDefault && (
                          <Badge className="bg-dw-accent-blue/15 text-dw-accent-blue border-dw-accent-blue/30 text-[10px] px-1.5 py-0">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-dw-text-muted tracking-wider">
                        {key.maskedKey}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!key.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-dw-text-muted hover:text-dw-accent-blue hover:bg-dw-accent-blue/10"
                        disabled={settingDefault === key.id}
                        onClick={() => handleSetDefault(key)}
                      >
                        {settingDefault === key.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Star className="mr-1 h-3 w-3" />
                        )}
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      disabled={deleting === key.id}
                      onClick={() => setDeleteTarget(key)}
                    >
                      {deleting === key.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1 h-3 w-3" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Max keys message */}
        {!loading && !canAddMore && (
          <p className="mt-4 text-center text-xs text-dw-text-muted">
            You&apos;ve reached the maximum of {MAX_KEYS} API keys. Delete one to add a new one.
          </p>
        )}

        {/* ── Add Key Form ── */}
        {showAddForm && canAddMore && (
          <div className="mt-6 rounded-lg border border-dw-accent-blue/20 bg-dw-navy-light/30 p-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-dw-text">Add New API Key</h3>

            {/* Provider select */}
            <div className="space-y-2">
              <Label className="text-sm text-dw-text-muted">
                Provider <span className="text-red-400">*</span>
              </Label>
              <Select value={addProvider} onValueChange={setAddProvider}>
                <SelectTrigger className="border-dw-border bg-dw-navy-light text-dw-text">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent className="border-dw-border bg-dw-card text-dw-text">
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="key-label" className="text-sm text-dw-text-muted">
                Label{' '}
                <span className="text-dw-text-muted/60">(optional friendly name)</span>
              </Label>
              <Input
                id="key-label"
                placeholder="e.g. My GPT-4 Key"
                className="border-dw-border bg-dw-navy-light text-dw-text placeholder:text-dw-text-muted/50 focus-visible:ring-dw-accent-blue"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="key-value" className="text-sm text-dw-text-muted">
                API Key <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="key-value"
                  type={showKeyInput ? 'text' : 'password'}
                  placeholder="sk-..."
                  className="border-dw-border bg-dw-navy-light text-dw-text placeholder:text-dw-text-muted/50 pr-10 focus-visible:ring-dw-accent-blue font-mono text-sm"
                  value={addApiKey}
                  onChange={(e) => setAddApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dw-text-muted hover:text-dw-text transition-colors"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  tabIndex={-1}
                >
                  {showKeyInput ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Default checkbox */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="key-default"
                checked={addIsDefault}
                onCheckedChange={(checked) => setAddIsDefault(checked === true)}
                className="border-dw-border data-[state=checked]:bg-dw-accent-blue data-[state=checked]:border-dw-accent-blue"
              />
              <Label
                htmlFor="key-default"
                className="text-sm text-dw-text-muted cursor-pointer select-none"
              >
                Set as default API key
              </Label>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleAddKey}
                disabled={adding || !addProvider || !addApiKey.trim()}
                className="gradient-btn px-5 text-sm font-medium text-white disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {adding ? 'Adding...' : 'Add Key'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-dw-text-muted hover:text-dw-text"
                onClick={() => {
                  setShowAddForm(false)
                  setAddProvider('')
                  setAddLabel('')
                  setAddApiKey('')
                  setAddIsDefault(false)
                  setShowKeyInput(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-dw-border bg-dw-card text-dw-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription className="text-dw-text-muted">
              Are you sure you want to delete the{' '}
              <span className="font-medium text-dw-text">
                {deleteTarget ? getProviderLabel(deleteTarget.provider) : ''}
              </span>{' '}
              API key{deleteTarget?.label ? ` (${deleteTarget.label})` : ''}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-dw-border text-dw-text-muted hover:bg-dw-card-hover hover:text-dw-text">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}