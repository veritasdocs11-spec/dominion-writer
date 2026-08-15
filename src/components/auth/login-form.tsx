'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useAppStore } from '@/store/app-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, Mail, Lock, LogIn, BookOpen, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const setView = useAppStore((s) => s.setView)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true)
    setServerError('')
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      })
      if (result?.ok) {
        toast.success('Welcome back!')
        setView('dashboard')
        window.location.reload()
      } else {
        const msg = result?.error === 'CredentialsSignin'
          ? 'Invalid email or password'
          : result?.error || 'Sign in failed'
        setServerError(msg)
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[88vh] items-center justify-center px-4 py-12 animate-fade-in hero-mesh">
      {/* Decorative bg orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(79,142,247,0.08) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Back link */}
        <button
          type="button"
          onClick={() => setView('landing')}
          className="mb-6 flex items-center gap-2 text-sm font-medium transition-all duration-200"
          style={{ color: '#8899BB' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EEF2FF' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8899BB' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        {/* Card */}
        <div className="auth-card p-8">
          {/* Logo & header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl relative"
              style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.2), rgba(155,114,248,0.15))', border: '1px solid rgba(79,142,247,0.25)' }}>
              <LogIn className="h-6 w-6" style={{ color: '#4F8EF7' }} />
            </div>
            <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "'Outfit', sans-serif", color: '#EEF2FF' }}>
              Welcome <span className="gradient-text">Back</span>
            </h1>
            <p className="mt-2 text-sm" style={{ color: '#8899BB' }}>
              Sign in to continue your writing journey
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
              style={{ background: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.25)', color: '#F87171' }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#F87171' }} />
              {serverError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium" style={{ color: '#EEF2FF' }}>
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#6677AA' }} />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="premium-input pl-10 h-11 rounded-xl"
                  style={{ background: 'rgba(26,37,64,0.5)', border: '1px solid rgba(26,37,64,0.9)', color: '#EEF2FF' }}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: '#F87171' }}>
                  <span className="w-1 h-1 rounded-full bg-red-400" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-sm font-medium" style={{ color: '#EEF2FF' }}>
                  Password
                </Label>
                <a
                  href="mailto:support@veritasdocs.com?subject=Password%20Reset%20Request"
                  className="text-xs transition-colors"
                  style={{ color: '#4F8EF7' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#7EB3FA' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4F8EF7' }}
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#6677AA' }} />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="premium-input pl-10 h-11 rounded-xl"
                  style={{ background: 'rgba(26,37,64,0.5)', border: '1px solid rgba(26,37,64,0.9)', color: '#EEF2FF' }}
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: '#F87171' }}>
                  <span className="w-1 h-1 rounded-full bg-red-400" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="gradient-btn w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(26,37,64,0.8)' }} />
            <span className="text-xs" style={{ color: '#3A4A6A' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(26,37,64,0.8)' }} />
          </div>

          {/* Sign Up link */}
          <p className="text-center text-sm" style={{ color: '#8899BB' }}>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setView('signup')}
              className="font-semibold transition-colors"
              style={{ color: '#4F8EF7' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#7EB3FA' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4F8EF7' }}
            >
              Create Account
            </button>
          </p>
        </div>

        {/* Bottom badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs" style={{ color: '#3A4A6A' }}>
          <Sparkles className="w-3 h-3" />
          Powered by Dominion Writer AI Platform
        </div>
      </div>
    </div>
  )
}
