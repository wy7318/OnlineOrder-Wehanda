import type { Metadata } from 'next'
import DemoShell from '@/components/demo/DemoShell'

export const metadata: Metadata = {
  title: 'Live Demo — Wehanda Restaurant Platform',
  description:
    'Experience both sides of Wehanda: the customer ordering page and the owner dashboard — all with real interactions and simulated data.',
}

export default function DemoPage() {
  return <DemoShell />
}
