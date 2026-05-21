import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/utils/admin-auth'

export async function GET() {
  const ctx = await requirePlatformAdmin()
  return NextResponse.json({ isAdmin: !!ctx })
}
