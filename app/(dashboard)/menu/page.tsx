import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/dashboard/Header'
import { Grid3X3, UtensilsCrossed, SlidersHorizontal, ArrowRight } from 'lucide-react'

export default async function MenuOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_user_id', user.id)
    .single()

  const [categories, items, optionGroups] = await Promise.all([
    restaurant ? supabase.from('categories').select('id').eq('restaurant_id', restaurant.id) : { data: [] },
    restaurant ? supabase.from('menu_items').select('id').eq('restaurant_id', restaurant.id) : { data: [] },
    restaurant ? supabase.from('option_groups').select('id').eq('restaurant_id', restaurant.id) : { data: [] },
  ])

  const sections = [
    { href: '/menu/categories', label: 'Categories', icon: Grid3X3, count: categories.data?.length ?? 0, desc: 'Organize your menu into categories and subcategories.' },
    { href: '/menu/items', label: 'Menu Items', icon: UtensilsCrossed, count: items.data?.length ?? 0, desc: 'Create and manage all your menu items, prices, and images.' },
    { href: '/menu/options', label: 'Options & Groups', icon: SlidersHorizontal, count: optionGroups.data?.length ?? 0, desc: 'Set up modifier groups like "Protein Choice" or "Spice Level".' },
  ]

  return (
    <>
      <Header title="Menu Management" subtitle="Manage your restaurant's menu" />
      {!restaurant && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 mb-6 text-sm">
          You need to <Link href="/setup" className="underline font-medium">set up your restaurant</Link> before managing the menu.
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-6">
        {sections.map(s => (
          <Link key={s.href} href={s.href}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-orange-200 hover:shadow-md transition group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-orange-50 group-hover:bg-orange-100 rounded-xl flex items-center justify-center transition">
                <s.icon size={22} className="text-orange-500" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{s.count}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{s.label}</h3>
            <p className="text-sm text-gray-500 mb-4">{s.desc}</p>
            <div className="flex items-center gap-1 text-sm text-orange-500 font-medium group-hover:gap-2 transition-all">
              Manage <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
