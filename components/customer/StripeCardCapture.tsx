'use client'

import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { useEffect } from 'react'

export type ConfirmPaymentFn = (clientSecret: string) => Promise<{ error?: string; paymentIntentId?: string }>

interface Props {
  onReady: (fn: ConfirmPaymentFn) => void
  onError?: (msg: string) => void
}

export default function StripeCardCapture({ onReady, onError }: Props) {
  const stripe = useStripe()
  const elements = useElements()

  useEffect(() => {
    if (!stripe || !elements) return

    onReady(async (clientSecret: string) => {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) return { error: 'Card element not found' }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      })

      if (error) {
        onError?.(error.message ?? 'Payment failed')
        return { error: error.message }
      }
      return { paymentIntentId: paymentIntent?.id }
    })
  }, [stripe, elements]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="border-2 border-gray-200 rounded-xl px-4 py-3.5 focus-within:border-brand-400 transition bg-white">
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '14px',
              color: '#111827',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              '::placeholder': { color: '#9ca3af' },
            },
            invalid: { color: '#ef4444' },
          },
        }}
      />
    </div>
  )
}
