import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import Header from '@/components/dashboard/Header'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import { ExternalLink, Store } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: restaurants } = await admin
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <Header title="Platform Admin" subtitle="All registered restaurants" userEmail={user.email} />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(!restaurants || restaurants.length === 0) ? (
            <div className="py-16 text-center text-gray-400">
              <Store size={32} className="mx-auto mb-3 opacity-30" />
              <p>No restaurants registered yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Restaurant', 'Slug', 'Email', 'Status', 'Ordering', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {restaurants.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-400">{r.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.slug}</td>
                    <td className="px-4 py-3 text-gray-600">{r.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.is_active ? 'success' : 'danger'}>
                        {r.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={r.online_ordering_enabled ? 'info' : 'default'}>
                        {r.online_ordering_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/restaurant/${r.slug}`} target="_blank"
                        className="text-orange-500 hover:text-orange-600 flex items-center gap-1 text-xs">
                        <ExternalLink size={12} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
