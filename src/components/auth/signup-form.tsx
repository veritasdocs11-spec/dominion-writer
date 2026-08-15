'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useAppStore } from '@/store/app-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ArrowLeft, Mail, Lock, UserPlus, User } from 'lucide-react'
import { toast } from 'sonner'

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    ageConfirmed: z.literal(true, {
      message: 'You must confirm you are 18+ and agree to the terms',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const setView = useAppStore((s) => s.setView)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      ageConfirmed: undefined as unknown as true,
    },
  })

  const ageConfirmed = watch('ageConfirmed')

  const onSubmit = async (values: SignupValues) => {
    setIsLoading(true)
    setServerError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          email: values.email,
          password: values.password,
          fullName: values.fullName,
          ageConfirmed: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setServerError(data.error || 'Sign up failed. Please try again.')
        return
      }

      // Auto sign in after successful signup
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (result?.ok) {
        toast.success('Account created successfully!')
        setView('dashboard')
        window.location.reload()
      } else {
        toast.success('Account created! Please sign in.')
        setView('login')
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 sm:p-8">
        {/* Back link */}
        <button
          type="button"
          onClick={() => setView('landing')}
          className="mb-6 flex items-center gap-2 text-sm text-dw-text-muted hover:text-dw-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-dw-accent-purple/10">
            <UserPlus className="h-6 w-6 text-dw-accent-purple" />
          </div>
          <h1 className="text-2xl font-bold text-dw-text sm:text-3xl">
            Create Your <span className="gradient-text">Account</span>
          </h1>
          <p className="mt-2 text-sm text-dw-text-muted">
            Start writing your book in minutes
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {serverError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="signup-name" className="text-dw-text">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dw-text-muted" />
              <Input
                id="signup-name"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
                className="pl-10 border-dw-border bg-dw-navy-light text-dw-text placeholder:text-dw-text-muted/60 focus-visible:ring-dw-accent-blue"
                {...register('fullName')}
              />
            </div>
            {errors.fullName && (
              <p className="text-sm text-red-400">{errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-dw-text">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dw-text-muted" />
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="pl-10 border-dw-border bg-dw-navy-light text-dw-text placeholder:text-dw-text-muted/60 focus-visible:ring-dw-accent-blue"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-dw-text">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dw-text-muted" />
              <Input
                id="signup-password"
                type="password"
                placeholder="Min 8 characters"
                autoComplete="new-password"
                className="pl-10 border-dw-border bg-dw-navy-light text-dw-text placeholder:text-dw-text-muted/60 focus-visible:ring-dw-accent-blue"
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="signup-confirm" className="text-dw-text">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dw-text-muted" />
              <Input
                id="signup-confirm"
                type="password"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="pl-10 border-dw-border bg-dw-navy-light text-dw-text placeholder:text-dw-text-muted/60 focus-visible:ring-dw-accent-blue"
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Age confirmation checkbox */}
          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="age-confirmed"
                checked={!!ageConfirmed}
                onCheckedChange={(checked) => {
                  setValue('ageConfirmed', checked === true ? true : (undefined as unknown as true), {
                    shouldValidate: true,
                  })
                }}
                className="mt-0.5 border-dw-border data-[state=checked]:bg-dw-accent-blue data-[state=checked]:border-dw-accent-blue"
              />
              <Label
                htmlFor="age-confirmed"
                className="text-sm font-normal leading-snug text-dw-text-muted cursor-pointer select-none block"
              >
                I confirm I am 18+ and agree to the{' '}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault()
                    setView('terms')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setView('terms')
                  }}
                  className="inline font-medium text-dw-accent-blue hover:underline"
                >
                  User Agreement
                </span>{' '}
                and{' '}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault()
                    setView('privacy')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setView('privacy')
                  }}
                  className="inline font-medium text-dw-accent-blue hover:underline"
                >
                  Privacy Policy
                </span>
              </Label>
            </div>
            {errors.ageConfirmed && (
              <p className="text-sm text-red-400">{errors.ageConfirmed.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading || !ageConfirmed}
            className="gradient-btn w-full py-5 text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-dw-text-muted">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => setView('login')}
            className="font-medium text-dw-accent-blue hover:text-dw-accent-blue/80 transition-colors"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  )
}