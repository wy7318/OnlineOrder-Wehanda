'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      toast(error.message, 'error')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-500 text-sm mb-6">We sent a password reset link to <strong>{email}</strong></p>
        <Link href="/login" className="text-orange-500 hover:text-orange-600 font-medium text-sm">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
        <p className="text-gray-500 mt-1 text-sm">Enter your email and we'll send a reset link</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          required
          placeholder="you@restaurant.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
          Send Reset Link
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        <Link href="/login" className="text-orange-500 hover:text-orange-600 font-medium">
          Back to sign in
        </Link>
      </p>
    </>
  )
}
